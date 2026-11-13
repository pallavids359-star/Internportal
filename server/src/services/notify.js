const { Notification, User } = require('../models');
const { emitToUser } = require('./socket');

// notify([userIds], {icon,title,body,link})
async function notify(userIds, data) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  const docs = await Notification.insertMany(ids.map((user) => ({ user, ...data })));
  docs.forEach((n) => emitToUser(n.user, 'notification', n));
  return docs;
}
async function adminIds() { return (await User.find({ role: { $in: ['admin', 'superadmin'] }, active: true }).select('_id')).map((u) => u._id); }
async function teamIds(teamId) {
  const q = { active: true };
  if (teamId) q.team = teamId;
  return (await User.find(q).select('_id')).map((u) => u._id);
}
module.exports = { notify, adminIds, teamIds };
