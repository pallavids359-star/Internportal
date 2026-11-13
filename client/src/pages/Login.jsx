import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <div className="logo" style={{ color: 'var(--ink)', padding: 0 }}><div className="logo-mark">🎓</div>InternHub</div>
        <div><h1>Welcome back</h1><p className="muted">Log in with the email your programme admin registered.</p></div>
        <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label className="f">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="small muted">Forgot your password? Ask your programme admin to reset it.</p>
      </form>
    </div>
  );
}
