import { download } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Avatar, Bar } from '../components/ui';
import { TaskList } from './Dashboard';

export default function Reports() {
  const { user, isIntern, toast } = useApp();
  const [rep] = useApi('/reports');
  const [tasks] = useApi(isIntern ? '/tasks' : null);
  if (!rep || (isIntern && !tasks)) return <Loading />;

  if (isIntern) {
    const me = rep.rows[0];
    const rating = Math.round(((user.rating || 0) / 5) * 100);
    return (<>
      <div className="grid g3">
        <div className="card" style={{ textAlign: 'center' }}><h3 style={{ justifyContent: 'center' }}>Overall score</h3>
          <div className="ring" style={{ background: `conic-gradient(var(--green) ${me.score * 3.6}deg,#eef0f6 0)` }}><div>{me.score}</div></div>
          <div className="small muted" style={{ marginTop: 8 }}>60% approved tasks + 40% leader rating</div></div>
        <div className="card"><h3>Breakdown</h3>{[['Task delivery', me.delivery], ['Leader rating', rating]].map(([a, b]) =>
          <div key={a} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }} className="small"><span>{a}</span><b>{b}%</b></div><div style={{ marginTop: 5 }}><Bar pct={b} /></div></div>)}</div>
        <div className="card"><h3>Leader's feedback</h3><p>{user.feedback || 'No feedback yet.'}</p></div>
      </div>
      <div className="card"><h3>My tasks</h3><TaskList list={tasks} /></div>
    </>);
  }

  return (<>
    <div className="toolbar"><span className="muted small">Score = 60% approved tasks + 40% leader rating</span><div className="spacer" />
      <button className="btn ghost" onClick={() => download('/reports/export.csv', 'internhub-report.csv').catch((e) => toast(e.message))}>Download CSV (Excel)</button></div>
    <div className="grid g2">
      <div className="card"><h3>Task completion by team</h3><div className="vbar">{rep.byTeam.map((t) => <div className="c" key={t.team._id}><b>{t.delivery}%</b><i style={{ height: Math.max(t.delivery, 3) + '%' }} /><span>{t.team.name.replace('Team ', '')}</span></div>)}</div></div>
      <div className="card"><h3>Average score by team</h3><div className="vbar">{rep.byTeam.map((t) => <div className="c" key={t.team._id}><b>{t.avgScore}</b><i style={{ height: Math.max(t.avgScore, 3) + '%', background: 'linear-gradient(180deg,#38bdf8,var(--blue))' }} /><span>{t.team.name.replace('Team ', '')}</span></div>)}</div></div>
    </div>
    <div className="card" style={{ padding: '6px 8px', overflowX: 'auto' }}><h3 style={{ padding: '10px 10px 0' }}>Performance leaderboard</h3>
      <table><thead><tr><th>#</th><th>Intern</th><th>Team</th><th>Delivery</th><th>Rating</th><th>Score</th></tr></thead>
        <tbody>{rep.rows.map((r, k) => <tr key={r.user._id}><td><b>{k + 1}</b></td><td><div className="who"><Avatar sm name={r.user.name} /><div className="n">{r.user.name}</div></div></td><td>{r.user.team?.name || '-'}</td>
          <td>{r.done}/{r.tasks} ({r.delivery}%)</td><td>{'\u2B50'} {r.user.rating || '-'}</td>
          <td><span className={'pill ' + (r.score >= 75 ? 'p-green' : r.score >= 60 ? 'p-amber' : 'p-red')}>{r.score}</span></td></tr>)}</tbody></table></div>
  </>);
}