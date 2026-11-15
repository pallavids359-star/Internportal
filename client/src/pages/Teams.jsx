import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { ProfileModal } from '../components/ProfileForm';
import { useApi, Avatar, Loading, Modal } from '../components/ui';

export default function Teams() {
  const { isAdmin, isLeader, user, toast } = useApp();
  const [teams, reloadTeams] = useApi('/teams');
  const [users, reloadUsers] = useApi('/users');
  const [modal, setModal] = useState(null);
  if (!teams || !users) return <Loading />;
  const reload = () => { reloadTeams(); reloadUsers(); };
  const run = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(e.message); } };
  const members = (t) => users.filter((u) => u.team?._id === t._id && ['intern', 'leader'].includes(u.role));
  const unassigned = users.filter((u) => !u.team && ['intern', 'leader'].includes(u.role));

  const create = async (fd) => { await api('/teams', { method: 'POST', body: Object.fromEntries(fd) }); setModal(null); reload(); toast('Team created'); };
  const rate = async (fd) => { await api('/users/' + modal.user._id, { method: 'PATCH', body: { rating: +fd.get('rating'), feedback: fd.get('feedback') } }); setModal(null); reload(); toast('Feedback saved'); };

  return (<>
    {isAdmin && <div className="toolbar"><span className="muted">Move people between teams with the dropdown. The leader can assign tasks and review work for their team.</span><div className="spacer" /><button className="btn" onClick={() => setModal({ kind: 'team' })}>+ New team</button></div>}
    <div className={'grid' + (teams.length > 1 ? ' g2' : '')}>
      {teams.map((t) => (
        <div className="card team-card" key={t._id}>
          <h3><span style={{ width: 12, height: 12, borderRadius: 4, background: t.color }} />{t.name}<span className="pill p-grey">{t.focus}</span><span className="spacer" /><span className="small muted">{members(t).length} members</span></h3>
          <div className="small muted">Leader: <b style={{ color: 'var(--ink)' }}>{t.leader?.name || 'not set'}</b></div>
          <div className="list" style={{ marginTop: 10 }}>
            {members(t).map((u) => (
              <div className="li" key={u._id}><Avatar sm name={u.name} photo={u.profile && u.profile.photo} />
                <div className="grow"><div className="t">{u.name} {t.leader?._id === u._id && <span className="pill p-brand">Leader</span>}</div><div className="s">{u.college || u.email} - {'\u2B50'} {u.rating || '-'}</div></div>
                {isAdmin && <>
                  <select className="search" style={{ minWidth: 'auto', padding: '5px 8px', fontSize: 12 }} value={t._id} onChange={(e) => run(() => api('/users/' + u._id, { method: 'PATCH', body: { team: e.target.value } }), 'Moved')}>
                    {teams.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}</select>
                  {t.leader?._id !== u._id && <button className="btn ghost sm" onClick={() => run(() => api('/teams/' + t._id, { method: 'PATCH', body: { leader: u._id } }), `${u.name} is now leader`)}>Make leader</button>}
                </>}
                {(isAdmin || isLeader) && <button className="btn ghost sm" onClick={() => setModal({ kind: 'profile', id: u._id })}>Profile</button>}
                {(isAdmin || (isLeader && u._id !== user._id)) && <button className="btn ghost sm" onClick={() => setModal({ kind: 'rate', user: u })}>Rate</button>}
              </div>))}
            {!members(t).length && <div className="empty small">No members yet</div>}
          </div>
        </div>))}
    </div>
    {isAdmin && unassigned.length > 0 && (
      <div className="card"><h3>Not in a team</h3><div className="list">{unassigned.map((u) => (
        <div className="li" key={u._id}><Avatar sm name={u.name} photo={u.profile && u.profile.photo} /><div className="grow"><div className="t">{u.name}</div><div className="s">{u.email}</div></div>
          <select className="search" style={{ minWidth: 'auto', padding: '5px 8px', fontSize: 12 }} defaultValue="" onChange={(e) => run(() => api('/users/' + u._id, { method: 'PATCH', body: { team: e.target.value } }), 'Added to team')}>
            <option value="" disabled>Add to team...</option>{teams.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}</select></div>))}</div></div>)}
    {modal?.kind === 'profile' && <ProfileModal userId={modal.id} onClose={() => setModal(null)} />}
    {modal?.kind === 'team' && <Modal title="New team" okLabel="Create" onClose={() => setModal(null)} onSubmit={create}>
      <label className="f">Team name<input name="name" required placeholder="Team Epsilon" /></label>
      <div className="row2"><label className="f">Focus area<input name="focus" placeholder="Cloud & DevOps" /></label><label className="f">Colour<input name="color" type="color" defaultValue="#7c3aed" /></label></div></Modal>}
    {modal?.kind === 'rate' && <Modal title={'Rate ' + modal.user.name} okLabel="Save" onClose={() => setModal(null)} onSubmit={rate}>
      <label className="f">Rating (0-5)<input name="rating" type="number" min="0" max="5" step="0.1" defaultValue={modal.user.rating || 4} required /></label>
      <label className="f">Feedback (the intern sees this)<textarea name="feedback" rows="4" defaultValue={modal.user.feedback} /></label></Modal>}
  </>);
}