import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api } from '../api';
import { useApi, Stat, Avatar, StatusPill, PrioPill, DueText, Loading, Empty, Bar, fmtDate, fmtTime } from '../components/ui';

// Loads data but never blocks the page if that part is unavailable
function useSoft(path) {
  const [data, setData] = useState(null);
  useEffect(() => { api(path).then(setData).catch(() => setData([])); }, [path]);
  return data;
}
const todayStr = () => new Date().toLocaleDateString('en-CA');

export function MeetList({ list }) {
  if (!list.length) return <Empty>No upcoming meetings</Empty>;
  return <div className="list">{list.map((m) => { const d = new Date(m.start); return (
    <div className="li" key={m._id}><div className="date-chip"><b>{d.getDate()}</b><span>{d.toLocaleDateString('en', { month: 'short' })}</span></div>
      <div className="grow"><div className="t">{m.title}</div><div className="s">{fmtTime(m.start)} - {m.duration} min - {m.team ? m.team.name : 'Everyone'}</div></div>
      {m.link ? <a className="btn sm" href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Join</a> : <span className="tag">Link pending</span>}</div>); })}</div>;
}
export function TaskList({ list }) {
  if (!list.length) return <Empty>No open tasks</Empty>;
  return <div className="list">{list.map((t) => (
    <div className="li" key={t._id}><div className="grow"><div className="t">{t.title}</div><div className="s">{t.project && t.project.name} - <DueText due={t.due} done={t.status === 'approved'} /></div></div><PrioPill p={t.priority} /> <StatusPill s={t.status} /></div>))}</div>;
}

export default function Dashboard() {
  const { user, isIntern, isAdmin } = useApp();
  const nav = useNavigate();
  const [tasks] = useApi('/tasks');
  const [projects] = useApi('/projects');
  const [meetings] = useApi('/meetings');
  const [report] = useApi('/reports');
  const myLogs = useSoft(isIntern ? '/worklogs?mine=1' : '/worklogs?date=' + todayStr());
  const missing = useSoft(isIntern ? '/announcements' : '/worklogs/missing');
  if (!tasks || !projects || !meetings || !report || !myLogs || !missing) return <Loading />;
  const upcoming = meetings.filter((m) => new Date(m.start) > new Date(Date.now() - 3600e3)).slice(0, 4);
  const done = tasks.filter((t) => t.status === 'approved').length;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  if (isIntern) {
    const me = report.rows[0];
    const open = tasks.filter((t) => t.status !== 'approved');
    const wroteToday = myLogs.some((l) => l.date === todayStr());
    const weekAgo = new Date(Date.now() - 6 * 864e5).toLocaleDateString('en-CA');
    const weekHours = myLogs.filter((l) => l.date >= weekAgo).reduce((s, l) => s + (l.hours || 0), 0);
    return (<>
      <div className="banner"><div style={{ flex: 1 }}><h2>Hello, {user.name.split(' ')[0]}</h2>
        <p>You have {open.length} open tasks and {upcoming.length} upcoming meetings. {wroteToday ? 'Today\'s work update is done.' : 'You haven\'t written today\'s work update yet.'}</p></div>
        <button className="btn" onClick={() => nav('/worklog')}>{wroteToday ? 'View my updates' : 'Write today\'s update'}</button>
      </div>
      <div className="grid g4">
        <Stat k="Open tasks" v={open.length} d={`across ${projects.length} project(s)`} icon={'\u{1F4CB}'} bg="var(--brand-soft)" />
        <Stat k="Completed" v={done} d="approved" icon={'\u2705'} bg="var(--green-soft)" />
        <Stat k="Hours this week" v={weekHours} d="from work updates" icon={'\u{1F552}'} bg="var(--blue-soft)" />
        <Stat k="Score" v={me ? me.score : 0} d={`rating ${user.rating || '-'} / 5`} icon={'\u2B50'} bg="var(--amber-soft)" />
      </div>
      <div className="grid g21">
        <div className="card"><h3>My open tasks<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/tasks')}>Open board</button></h3><TaskList list={open} /></div>
        <div className="card"><h3>Upcoming meetings</h3><MeetList list={upcoming} /></div>
      </div>
      {user.feedback && <div className="card"><h3>Feedback from your leader</h3><p>{user.feedback}</p></div>}
    </>);
  }

  const people = report.rows.length;
  const pending = tasks.filter((t) => t.status === 'submitted');
  return (<>
    <div className="banner"><div style={{ flex: 1 }}>
      <h2>{isAdmin ? 'Programme overview' : `${user.team ? user.team.name : ''} - ${user.team ? user.team.focus || '' : ''}`}</h2>
      <p>{people} {isAdmin ? 'interns' : 'team members'} - {projects.length} project(s) - {pending.length} submission(s) waiting</p></div>
      <button className="btn" onClick={() => nav(isAdmin ? '/chat' : '/tasks', { state: { ch: 'announcements' } })}>{isAdmin ? 'Post announcement' : '+ Assign task'}</button></div>
    <div className="grid g4">
      <Stat k={isAdmin ? 'Interns' : 'Team members'} v={people} d="active" icon={'\u{1F393}'} bg="var(--brand-soft)" />
      <Stat k="Updates today" v={`${myLogs.length}/${myLogs.length + missing.length}`} d={`${missing.length} not written yet`} icon={'\u{1F4DD}'} bg="var(--green-soft)" />
      <Stat k="Task completion" v={completion + '%'} d={`${tasks.length} tasks`} icon={'\u2705'} bg="var(--blue-soft)" />
      <Stat k="Awaiting review" v={pending.length} d="submissions" icon={'\u{1F4E5}'} bg="var(--amber-soft)" />
    </div>
    <div className="grid g21">
      <div className="card"><h3>Project progress<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/projects')}>All projects</button></h3>
        {projects.length ? <div className="list">{projects.map((p) => (
          <div className="li" key={p._id}><div className="grow"><div className="t">{p.name}</div><div className="s">{p.team && p.team.name} - due {fmtDate(p.due)}</div><div style={{ marginTop: 8 }}><Bar pct={p.progress} /></div></div>
            <div style={{ width: 90, textAlign: 'right' }}><b>{p.progress}%</b><br /><span className={'pill ' + (p.status === 'At risk' ? 'p-red' : 'p-green')}>{p.status}</span></div></div>))}</div> : <Empty>No projects yet</Empty>}</div>
      <div className="card"><h3>Upcoming meetings<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/meetings')}>+ Schedule</button></h3><MeetList list={upcoming} /></div>
    </div>
    <div className="grid g2">
      <div className="card"><h3>Submissions to review<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/tasks')}>Review</button></h3>
        {pending.length ? <div className="list">{pending.map((t) => <div className="li" key={t._id}><Avatar sm name={t.assignee && t.assignee.name} /><div className="grow"><div className="t">{t.title}</div><div className="s">{t.assignee && t.assignee.name}{t.submission && t.submission.file ? ' - ' + t.submission.file.name : ''}</div></div><StatusPill s="submitted" /></div>)}</div> : <Empty>All caught up</Empty>}</div>
      <div className="card"><h3>No work update yet today<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/worklog')}>Work updates</button></h3>
        {missing.length ? <div className="list">{missing.slice(0, 6).map((p) => <div className="li" key={p._id}><Avatar sm name={p.name} /><div className="grow"><div className="t">{p.name}</div><div className="s">{p.team ? p.team.name : ''}</div></div><span className="pill p-amber">Not written</span></div>)}</div> : <Empty>Everyone has written today's update</Empty>}</div>
    </div>
  </>);
}