const PERMS = [
  ['View interns', 'All', 'Own team', 'Self'], ['Add / remove interns, reset passwords', '✅', '—', '—'],
  ['Create teams & choose leaders', '✅', '—', '—'], ['Create projects', '✅', '—', '—'],
  ['Update project progress', '✅', '✅ own team', '—'], ['Assign tasks', '✅', '✅ own team', '—'],
  ['Approve / reject submissions', '✅', '✅ own team', '—'], ['Submit work', '—', '✅', '✅'],
  ['Mark attendance for others', '✅', '✅ own team', '—'], ['Check in / out', '—', '✅', '✅'],
  ['Schedule meetings', 'Everyone or any team', 'Own team', '—'], ['Post announcements', '✅', '—', '—'],
  ['Chat', 'All channels', 'General + own team + DMs', 'General + own team + DMs'],
  ['Upload documents', 'Any category', 'Learning / Project', 'Learning / Project'],
  ['Reports', 'Everyone + CSV', 'Own team + CSV', 'Own performance'], ['Rate interns & give feedback', '✅', '✅ own team', '—'],
];
export default function Roles() {
  return (
    <>
      <div className="card" style={{ overflowX: 'auto' }}>
        <h3>Permission matrix</h3>
        <table><thead><tr><th>Permission</th><th>Admin</th><th>Team Leader</th><th>Intern</th></tr></thead>
          <tbody>{PERMS.map((p) => <tr key={p[0]}><td><b>{p[0]}</b></td>{p.slice(1).map((x, i) => <td key={i}>{x}</td>)}</tr>)}</tbody></table>
      </div>
      <div className="demo-note">These rules are enforced by the server, not just hidden in the UI. A Super Admin can also create other admins (Interns page → Add → role).</div>
    </>
  );
}
