const router = require('express').Router();
const { User, Task, Attendance, Team } = require('../models');
const { teamScope } = require('../middleware/auth');
const { workingDaysSoFar } = require('../services/time');

// Score = 30% attendance + 40% task delivery + 30% leader rating
async function buildRows(user) {
  const q = { active: true, role: { $in: ['intern', 'leader'] } };
  if (user.role === 'intern') q._id = user._id;
  else if (teamScope(user)) q.team = user.team;
  const people = await User.find(q).populate('team', 'name color').sort('name');
  const ids = people.map((p) => p._id);
  const [tasks, att] = await Promise.all([
    Task.find({ assignee: { $in: ids } }).select('assignee status').lean(),
    Attendance.find({ user: { $in: ids }, status: { $in: ['present', 'late'] } }).select('user').lean(),
  ]);
  const days = workingDaysSoFar();
  return people.map((p) => {
    const t = tasks.filter((x) => String(x.assignee) === String(p._id));
    const done = t.filter((x) => x.status === 'approved').length;
    const attended = att.filter((x) => String(x.user) === String(p._id)).length;
    const attendance = Math.min(100, Math.round((attended / days) * 100));
    const delivery = t.length ? Math.round((done / t.length) * 100) : 0;
    const ratingPct = Math.round((p.rating / 5) * 100);
    return {
      user: { _id: p._id, name: p.name, email: p.email, team: p.team, role: p.role, rating: p.rating, feedback: p.feedback },
      attendance, attended, workingDays: days, tasks: t.length, done, delivery,
      score: Math.round(attendance * 0.3 + delivery * 0.4 + ratingPct * 0.3),
    };
  }).sort((a, b) => b.score - a.score);
}

router.get('/', async (req, res) => {
  const rows = await buildRows(req.user);
  const scope = teamScope(req.user);
  const teams = req.user.role === 'intern' ? [] : await Team.find(scope ? { _id: scope } : {}).sort('name');
  const byTeam = teams.map((t) => {
    const r = rows.filter((x) => String(x.user.team?._id) === String(t._id));
    const avg = (k) => (r.length ? Math.round(r.reduce((s, x) => s + x[k], 0) / r.length) : 0);
    const tasks = r.reduce((s, x) => s + x.tasks, 0), done = r.reduce((s, x) => s + x.done, 0);
    return { team: t, members: r.length, attendance: avg('attendance'), delivery: tasks ? Math.round((done / tasks) * 100) : 0 };
  });
  res.json({ rows, byTeam });
});

router.get('/export.csv', async (req, res) => {
  const rows = await buildRows(req.user);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [['Name', 'Email', 'Team', 'Attendance %', 'Days attended', 'Tasks', 'Approved', 'Delivery %', 'Rating', 'Score']]
    .concat(rows.map((r) => [r.user.name, r.user.email, r.user.team?.name, r.attendance, r.attended, r.tasks, r.done, r.delivery, r.user.rating, r.score]))
    .map((r) => r.map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="internhub-report.csv"');
  res.send(csv);
});

module.exports = router;
