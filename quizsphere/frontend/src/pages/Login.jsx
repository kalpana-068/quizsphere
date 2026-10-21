import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(f.email, f.password);
      nav(loc.state?.from || '/', { replace: true });
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl text-brand-700">QuizSphere</h1>
          <p className="text-sm text-slate-500">Log in to take or manage quizzes.</p>
        </div>
        <div><label className="label">Email</label><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label">Password</label><input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <button className="btn w-full" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
        <p className="text-sm text-center text-slate-500">New here? <Link className="text-brand-700 font-bold" to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
