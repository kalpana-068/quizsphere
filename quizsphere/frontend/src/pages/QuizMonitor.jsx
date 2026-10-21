import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import api, { errMsg } from '../api';

const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

export default function QuizMonitor() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [an, setAn] = useState(null);
  const [live, setLive] = useState([]);

  const load = () => {
    api.get(`/quizzes/${id}/manage`).then((r) => setQuiz(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get(`/quizzes/${id}/analytics`).then((r) => setAn(r.data)).catch(() => {});
    api.get(`/quizzes/${id}/live`).then((r) => setLive(r.data)).catch(() => {});
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);

  const act = async (fn, msg) => { try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); } };
  const extend = () => {
    const m = Number(prompt('Extend time by how many minutes?', '5'));
    if (m > 0) act(() => api.put(`/quizzes/${id}/extend`, { minutes: m }), `Added ${m} minutes for everyone`);
  };

  if (!quiz) return <p className="p-10 text-center text-slate-500">Loading...</p>;
  const pie = an ? [{ name: 'Passed', value: an.stats.passed }, { name: 'Failed', value: an.stats.failed }] : [];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Link to="/teacher" className="text-sm text-brand-700 font-bold">Back to dashboard</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{quiz.title}</h1>
          <p className="text-sm text-slate-500">{quiz.subject}, {quiz.duration} min, access code <b>{quiz.accessCode}</b>. {quiz.isPublished ? 'Published' : 'Not published yet'}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quiz.isPaused
            ? <button className="btn" onClick={() => act(() => api.put(`/quizzes/${id}/resume`), 'Exam resumed')}>Resume exam</button>
            : <button className="btn-light" onClick={() => act(() => api.put(`/quizzes/${id}/pause`), 'Exam frozen for all students')}>Freeze exam</button>}
          <button className="btn-light" onClick={extend}>Extend time</button>
        </div>
      </div>
      {quiz.isPaused && <div className="rounded-md bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 text-sm">The exam is frozen. Student timers are stopped and the paused time will be given back when you resume.</div>}

      <section className="card">
        <h2 className="text-lg mb-3">Live sessions ({live.length})</h2>
        {live.length === 0 ? <p className="text-sm text-slate-500">No student is attempting this quiz right now.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Student</th><th>Answered</th><th>Time left</th><th>Tab switches</th></tr></thead>
            <tbody>{live.map((s) => (
              <tr key={s._id} className="border-t">
                <td className="py-2">{s.student?.name}</td><td>{s.answered} / {s.total}</td><td>{mmss(s.remainingMs)}</td>
                <td className={s.tabSwitches ? 'text-red-700 font-bold' : ''}>{s.tabSwitches}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>

      {an && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[['Submitted', an.stats.count], ['Average', `${an.stats.average} / ${an.quiz.totalMarks}`], ['Highest', an.stats.highest], ['Lowest', an.stats.lowest], ['Pass rate', an.stats.count ? `${Math.round((an.stats.passed / an.stats.count) * 100)}%` : '0%']].map(([k, v]) => (
              <div key={k} className="card"><p className="text-xs text-slate-500">{k}</p><p className="text-xl font-bold">{v}</p></div>
            ))}
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-lg mb-2">Score distribution</h2>
              <div className="h-64"><ResponsiveContainer>
                <BarChart data={an.distribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Students" fill="#0f7a71" /></BarChart>
              </ResponsiveContainer></div>
            </div>
            <div className="card">
              <h2 className="text-lg mb-2">Pass / fail</h2>
              <div className="h-64"><ResponsiveContainer>
                <PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={90} label>{pie.map((p, i) => <Cell key={i} fill={i === 0 ? '#0f7a71' : '#c2410c'} />)}</Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer></div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg mb-3">Results</h2>
            {an.results.length === 0 ? <p className="text-sm text-slate-500">No submissions yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500"><th className="py-2">Student</th><th>Email</th><th>Score</th><th>Result</th><th>Tab switches</th><th>Submitted</th></tr></thead>
                <tbody>{an.results.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="py-2">{r.student?.name}</td><td>{r.student?.email}</td><td>{r.score} / {r.total}</td>
                    <td className={r.passed ? 'text-brand-700 font-bold' : 'text-red-700 font-bold'}>{r.passed ? 'Pass' : 'Fail'}</td>
                    <td className={r.tabSwitches ? 'text-red-700 font-bold' : ''}>{r.tabSwitches}</td><td>{new Date(r.submittedAt).toLocaleString()}</td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
