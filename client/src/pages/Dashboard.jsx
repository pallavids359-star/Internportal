import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api } from '../api';
import { useApi, Stat, Avatar, StatusPill, PrioPill, AttPill, DueText, Loading, Empty, Bar, fmtDate, fmtTime } from '../components/ui';

export function MeetList({ list }) {
  if (!list.length) return <Empty>No upcoming meetings</Empty>;
  return <div className="list">{list.map((m) => { const d = new Date(m.start); return (
    <div className="li" key={m._id}><div className="date-chip"><b>{d.getDate()}</b><span>{d.toLocaleDateString('en', { month: 'short' })}</span></div>
      <div className="grow"><div className="t">{m.title}</div><div className="s">{fmtTime(m.start)} · {m.duration} min · {m.team ? m.team.name : 'Everyone'}</div></div>
      {m.link ? <a className="btn sm" href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Join</a> : <span className="tag">Link pending</span>}</div>); })}</div>;
}
export function TaskList({ list }) {
  if (!list.length) return <Empty>No open tasks 🎉</Empty>;
  return <div className="list">{list.map((t) => (
    <div className="li" key={t._id}><div className="grow"><div className="t">{t.title}</div><div className="s">{t.project?.name} · <DueText due={t.due} done={t.status === 'approved'} /></div></div><PrioPill p={t.priority} /> <StatusPill s={t.status} /></div>))}</div>;
}

export default function Dashboard() {
  const { user, isIntern, isAdmin, toast } = useApp();
  const nav = useNavigate();
  const [tasks] = useApi('/tasks');
  const [projects] = useApi('/projects');
  const [meetings] = useApi('/meetings');
  const [att, reloadAtt] = useApi('/attendance/today');
  const [report] = useApi('/reports');
  if (!tasks || !projects || !meetings || !att || !report) return <Loading />;
  const upcoming = meetings.filter((m) => new Date(m.start) > new Date(Date.now() - 3600e3)).slice(0, 4);
  const done = tasks.filter((t) => t.status === 'approved').length;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  if (isIntern) {
    const me = report.rows[0];
    const rec = att.rows[0]?.record;
    const open = tasks.filter((t) => t.status !== 'approved');
    const act = async (p) => { try { await api('/attendance/' + p, { method: 'POST' }); reloadAtt(); toast(p === 'check-in' ? 'Checked in ✓' : 'Checked out ✓'); } catch (e) { toast(e.message); } };
    return (<>
      <div className="banner"><div style={{ flex: 1 }}><h2>Hello, {user.name.split(' ')[0]} 👋</h2>
        <p>You have {open.length} open tasks and {upcoming.length} upcoming meetings. {rec?.checkIn ? `Checked in at ${fmtTime(rec.checkIn)}.` : 'You haven’t checked in today.'}</p></div>
        {!rec?.checkIn ? <button className="btn" onClick={() => act('check-in')}>Check in now</button> : !rec.checkOut ? <button className="btn" onClick={() => act('check-out')}>Check out</button> : <span className="pill p-green" style={{ background: '#fff' }}>Day complete</span>}
      </div>
      <div className="grid g4">
        <Stat k="Open tasks" v={open.length} d={`across ${projects.length} project(s)`} icon="📋" bg="var(--brand-soft)" />
        <Stat k="Completed" v={done} d="approved" icon="✅" bg="var(--green-soft)" />
        <Stat k="Attendance" v={(me?.attendance ?? 0) + '%'} d={`${me?.attended ?? 0} of ${me?.workingDays ?? 0} days`} icon="🕘" bg="var(--blue-soft)" />
        <Stat k="Score" v={me?.score ?? 0} d={`rating ${user.rating || '—'} / 5`} icon="⭐" bg="var(--amber-soft)" />
      </div>
      <div className="grid g21">
        <div className="card"><h3>My open tasks<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/tasks')}>Open board</button></h3><TaskList list={open} /></div>
        <div className="card"><h3>Upcoming meetings</h3><MeetList list={upcoming} /></div>
      </div>
      {user.feedback && <div className="card"><h3>Feedback from your leader</h3><p>{user.feedback}</p></div>}
    </>);
  }

  const rows = att.rows;
  const present = rows.filter((r) => r.record?.checkIn).length;
  const pending = tasks.filter((t) => t.status === 'submitted');
  return (<>
    <div className="banner"><div style={{ flex: 1 }}>
      <h2>{isAdmin ? 'Programme overview' : `${user.team?.name} · ${user.team?.focus || ''}`}</h2>
      <p>{rows.length} {isAdmin ? 'interns' : 'team members'} · {projects.length} project(s) · {pending.length} submission(s) waiting</p></div>
      <button className="btn" onClick={() => nav(isAdmin ? '/chat' : '/tasks', { state: { ch: 'announcements' } })}>{isAdmin ? '📣 Post announcement' : '+ Assign task'}</button></div>
    <div className="grid g4">
      <Stat k={isAdmin ? 'Interns' : 'Team members'} v={rows.length} d="active" icon="🎓" bg="var(--brand-soft)" />
      <Stat k="Checked in today" v={`${present}/${rows.length}`} d={`${rows.filter((r) => r.record?.status === 'late').length} late`} icon="🕘" bg="var(--green-soft)" />
      <Stat k="Task completion" v={completion + '%'} d={`${tasks.length} tasks`} icon="✅" bg="var(--blue-soft)" />
      <Stat k="Awaiting review" v={pending.length} d="submissions" icon="📥" bg="var(--amber-soft)" />
    </div>
    <div className="grid g21">
      <div className="card"><h3>Project progress<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/projects')}>All projects</button></h3>
        {projects.length ? <div className="list">{projects.map((p) => (
          <div className="li" key={p._id}><div className="grow"><div className="t">{p.name}</div><div className="s">{p.team?.name} · due {fmtDate(p.due)}</div><div style={{ marginTop: 8 }}><Bar pct={p.progress} /></div></div>
            <div style={{ width: 90, textAlign: 'right' }}><b>{p.progress}%</b><br /><span className={'pill ' + (p.status === 'At risk' ? 'p-red' : 'p-green')}>{p.status}</span></div></div>))}</div> : <Empty>No projects yet</Empty>}</div>
      <div className="card"><h3>Upcoming meetings<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/meetings')}>+ Schedule</button></h3><MeetList list={upcoming} /></div>
    </div>
    <div className="grid g2">
      <div className="card"><h3>Submissions to review<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/tasks')}>Review</button></h3>
        {pending.length ? <div className="list">{pending.map((t) => <div className="li" key={t._id}><Avatar sm name={t.assignee?.name} /><div className="grow"><div className="t">{t.title}</div><div className="s">{t.assignee?.name}{t.submission?.file ? ' · 📎 ' + t.submission.file.name : ''}</div></div><StatusPill s="submitted" /></div>)}</div> : <Empty>All caught up 🎉</Empty>}</div>
      <div className="card"><h3>Not checked in yet<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/attendance')}>View all</button></h3>
        {rows.filter((r) => !r.record?.checkIn).length ? <div className="list">{rows.filter((r) => !r.record?.checkIn).slice(0, 6).map((r) => <div className="li" key={r.user._id}><Avatar sm name={r.user.name} /><div className="grow"><div className="t">{r.user.name}</div><div className="s">{r.user.team?.name}</div></div><AttPill s={r.record?.status} /></div>)}</div> : <Empty>Everyone is in ✓</Empty>}</div>
    </div>
  </>);
}
