import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  if (!user || pathname.startsWith('/attempt')) return null; // hidden during an exam

  const links = user.role === 'teacher'
    ? [['/teacher', 'Dashboard'], ['/teacher/questions', 'Question bank'], ['/teacher/quizzes/new', 'Create quiz']]
    : [['/student', 'Dashboard']];

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 min-h-14 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-brand-700">QuizSphere</Link>
          <nav className="flex gap-4 text-sm">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'font-bold text-brand-700' : 'text-slate-600 hover:text-slate-900')}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{user.name} <span className="tag">{user.role}</span></span>
          <button className="btn-light" onClick={() => { logout(); nav('/login'); }}>Log out</button>
        </div>
      </div>
    </header>
  );
}
