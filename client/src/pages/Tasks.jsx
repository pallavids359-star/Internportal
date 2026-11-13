import { useState } from 'react';
import { api, download } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Modal, Avatar, PrioPill, STATUS, DueText } from '../components/ui';

const COLS = ['todo', 'inprogress', 'submitted', 'rejected', 'approved'];

export default function Tasks() {
  const { isIntern, user, toast } = useApp();
  const [tasks, reload] = useApi('/tasks');
  const [projects] = useApi('/projects');
  const [users] = useApi(isIntern ? null : '/users');
  const [modal, setModal] = useState(null);
  const [who, setWho] = useState('');
  if (!tasks || !projects || (!isIntern && !users)) return <Loading />;

  const set = async (t, body, msg) => { try { await api('/tasks/' + t._id, { method: 'PATCH', body }); reload(); toast(msg); } catch (e) { toast(e.message); } };
  const create = async (fd) => { await api('/tasks', { method: 'POST', body: Object.fromEntries(fd) }); setModal(null); reload(); toast('Task assigned'); };
  const submit = async (fd) => {
    let file = null;
    const f = fd.get('file');
    if (f && f.size) {
      const up = new FormData(); up.append('file', f); up.append('category', 'Submission');
      file = (await api('/documents', { method: 'POST', form: up }))._id;
    }
    await api('/tasks/' + modal.task._id, { method: 'PATCH', body: { status: 'submitted', note: fd.get('note'), file } });
    setModal(null); reload(); toast('Submitted for review');
  };
  const review = async (fd) => { await api('/tasks/' + modal.task._id, { method: 'PATCH', body: { status: modal.kind, feedback: fd.get('feedback') } }); setModal(null); reload(); toast(modal.kind === 'approved' ? 'Approved ✓' : 'Sent back'); };
  const shown = tasks.filter((t) => !who || t.assignee?._id === who);

  return (<>
    <div className="toolbar"><span className="muted">{isIntern ? 'Start a task, then submit your work for review.' : 'Assign work, then approve or send back submissions.'}</span><div className="spacer" />
      {!isIntern && <><select className="search" style={{ minWidth: 160 }} value={who} onChange={(e) => setWho(e.target.value)}><option value="">Everyone</option>{users.filter((u) => ['intern', 'leader'].includes(u.role)).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select>
        <button className="btn" onClick={() => setModal({ kind: 'new' })} disabled={!projects.length}>+ Assign task</button></>}</div>
    <div className="kanban">{COLS.map((c) => { const l = shown.filter((t) => t.status === c); return (
      <div className="col" key={c}><h4>{STATUS[c][0]}<span>{l.length}</span></h4>
        {l.map((t) => { const mine = t.assignee?._id === user._id; return (
          <div className="tcard" key={t._id}>
            <div className="t">{t.title}</div>
            <div className="meta"><PrioPill p={t.priority} /><DueText due={t.due} done={c === 'approved'} /></div>
            {!isIntern && <div className="meta" style={{ marginTop: 8 }}><Avatar sm name={t.assignee?.name} /><span>{t.assignee?.name}</span></div>}
            <div className="small muted" style={{ marginTop: 6 }}>{t.project?.name}</div>
            {t.description && <div className="small" style={{ marginTop: 6 }}>{t.description}</div>}
            {t.submission?.note && c !== 'todo' && <div className="small" style={{ marginTop: 6 }}>📝 {t.submission.note}</div>}
            {t.submission?.file && <button className="small" style={{ marginTop: 6, color: 'var(--brand)' }} onClick={() => download(`/documents/${t.submission.file._id}/download`, t.submission.file.name).catch((e) => toast(e.message))}>📎 {t.submission.file.name}</button>}
            {t.feedback && <div className="small" style={{ marginTop: 6, color: c === 'rejected' ? 'var(--red)' : 'var(--green)' }}>💬 {t.feedback}</div>}
            <div className="acts">
              {mine && c === 'todo' && <button className="btn sm" onClick={() => set(t, { status: 'inprogress' }, 'Started')}>Start</button>}
              {mine && (c === 'inprogress' || c === 'rejected') && <button className="btn sm" onClick={() => setModal({ kind: 'submit', task: t })}>Submit work</button>}
              {!isIntern && !mine && c === 'submitted' && <><button className="btn green sm" onClick={() => setModal({ kind: 'approved', task: t })}>Approve</button><button className="btn ghost sm" onClick={() => setModal({ kind: 'rejected', task: t })}>Reject</button></>}
              {!isIntern && c !== 'approved' && <button className="btn ghost sm" onClick={async () => { await api('/tasks/' + t._id, { method: 'DELETE' }); reload(); }}>Delete</button>}
            </div>
          </div>); })}
        {!l.length && <div className="empty small">Nothing here</div>}
      </div>); })}</div>

    {modal?.kind === 'new' && <NewTask projects={projects} users={users} onClose={() => setModal(null)} onSubmit={create} />}
    {modal?.kind === 'submit' && <Modal title={'Submit: ' + modal.task.title} okLabel="Submit for review" onClose={() => setModal(null)} onSubmit={submit}>
      <label className="f">Attach file (optional)<input name="file" type="file" /></label>
      <label className="f">Note to reviewer<textarea name="note" rows="3" placeholder="What did you do? Link to your repo?" /></label></Modal>}
    {(modal?.kind === 'approved' || modal?.kind === 'rejected') && <Modal title={(modal.kind === 'approved' ? 'Approve: ' : 'Send back: ') + modal.task.title} okLabel={modal.kind === 'approved' ? 'Approve' : 'Send feedback'} onClose={() => setModal(null)} onSubmit={review}>
      <label className="f">{modal.kind === 'approved' ? 'Comment (optional)' : 'What needs to change?'}<textarea name="feedback" rows="3" required={modal.kind === 'rejected'} /></label></Modal>}
  </>);
}

function NewTask({ projects, users, onClose, onSubmit }) {
  const [project, setProject] = useState(projects[0]?._id);
  const team = projects.find((p) => p._id === project)?.team?._id;
  const people = users.filter((u) => u.team?._id === team && ['intern', 'leader'].includes(u.role));
  return <Modal title="Assign task" okLabel="Assign" onClose={onClose} onSubmit={onSubmit}>
    <label className="f">Task title<input name="title" required /></label>
    <label className="f">Details<textarea name="description" rows="2" /></label>
    <div className="row2"><label className="f">Project<select name="project" value={project} onChange={(e) => setProject(e.target.value)}>{projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label>
      <label className="f">Assign to<select name="assignee" required>{people.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></label></div>
    <div className="row2"><label className="f">Due date<input name="due" type="date" /></label>
      <label className="f">Priority<select name="priority" defaultValue="Medium"><option>High</option><option>Medium</option><option>Low</option></select></label></div>
  </Modal>;
}
