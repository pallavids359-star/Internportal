import { useState } from 'react';
import { useApp } from '../context';
import { api } from '../api';

export default function Profile() {
  const { user, refreshMe, toast } = useApp();
  const [form, setForm] = useState({ name: user.name, college: user.college || '', phone: user.phone || '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [err, setErr] = useState('');
  const save = async (e) => { e.preventDefault(); await api('/users/' + user._id, { method: 'PATCH', body: form }); await refreshMe(); toast('Profile saved'); };
  const change = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); await refreshMe(); toast('Password changed'); } catch (x) { setErr(x.message); }
  };
  return (
    <div className="grid g2">
      <form className="card" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3>My details</h3>
        <label className="f">Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="f">Email<input value={user.email} disabled /></label>
        <label className="f">College<input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></label>
        <label className="f">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <div><button className="btn">Save</button></div>
      </form>
      <form className="card" onSubmit={change} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3>Change password</h3>
        {user.mustChangePassword && <div className="demo-note">You’re on a temporary password. Please set your own.</div>}
        <label className="f">Current password<input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
        <label className="f">New password (min 8 characters)<input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} /></label>
        {err && <div className="err">{err}</div>}
        <div><button className="btn">Change password</button></div>
      </form>
    </div>
  );
}
