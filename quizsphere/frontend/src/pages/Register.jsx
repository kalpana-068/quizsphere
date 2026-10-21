import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'student' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(f);
      nav('/', { replace: true });
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl text-brand-700">Create account</h1>
          <p className="text-sm text-slate-500">Choose Teacher to create quizzes, Student to attempt them.</p>
        </div>
        <div><label className="label">Full name</label><input className="input" required value={f.name} onChange={set('name')} /></div>
        <div><label className="label">Email</label><input className="input" type="email" required value={f.email} onChange={set('email')} /></div>
        <div><label className="label">Password (min 6 characters)</label><input className="input" type="password" minLength={6} required value={f.password} onChange={set('password')} /></div>
        <div>
          <label className="label">I am a</label>
          <select className="input" value={f.role} onChange={set('role')}>
            <option value="student">Student</option>
            <option value="teacher">Teacher / Admin</option>
          </select>
        </div>
        <button className="btn w-full" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
        <p className="text-sm text-center text-slate-500">Already registered? <Link className="text-brand-700 font-bold" to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
