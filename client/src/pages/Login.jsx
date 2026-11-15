import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="lg-wrap">
      <section className="lg-brand">
        <div className="lg-glow" />
        <img src="/logo-full.jpg" alt="Manchester Technologies" className="lg-logo" />
        <div className="lg-tag">Intern Portal</div>
        <ul className="lg-points">
          <li>Tasks, projects and reviews in one place</li>
          <li>Daily work updates, meetings and team chat</li>
          <li>Track your progress and performance</li>
        </ul>
      </section>
      <section className="lg-form-side">
        <form className="lg-form" onSubmit={submit}>
          <div>
            <div className="lg-kicker">Manchester Technologies</div>
            <h1>Welcome back</h1>
            <p className="muted">Log in with the email your programme admin registered.</p>
          </div>
          <label className="f">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </label>
          <label className="f">
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>Password<a href="/forgot-password" className="lg-link">Forgot password?</a></span>
            <span className="lg-pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
              <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          {err && <div className="err">{err}</div>}
          <button className="lg-btn" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
          <p className="small muted" style={{ textAlign: 'center' }}>Trouble logging in? Contact your programme admin.</p>
        </form>
      </section>
    </div>
  );
}