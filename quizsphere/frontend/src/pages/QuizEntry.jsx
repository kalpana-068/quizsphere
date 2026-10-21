import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';

// This page is also what a shared quiz link (/quiz/:id) opens
export default function QuizEntry() {
  const { id } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/quizzes/' + id).then((r) => setQ(r.data)).catch((e) => { toast.error(errMsg(e)); nav('/'); });
  }, [id]);

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/quizzes/${id}/start`, { accessCode: code });
      nav(r.data.submitted ? `/result/${r.data.attemptId}` : `/attempt/${r.data._id}`);
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  if (!q) return <p className="p-10 text-center text-slate-500">Loading...</p>;
  const state = q.attempt?.status;

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <Link to="/student" className="text-sm text-brand-700 font-bold">Back to dashboard</Link>
      <form onSubmit={start} className="card mt-3 space-y-4">
        <div>
          <h1 className="text-2xl">{q.title}</h1>
          <p className="text-sm text-slate-500">{q.subject}, {q.questionCount} questions, {q.totalMarks} marks, {q.duration} minutes</p>
        </div>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          <li>The timer starts when you enter and the exam submits itself when time ends.</li>
          <li>Leaving this tab or window is recorded and shown to your teacher.</li>
          <li>If your internet drops, your answers stay saved on this device and sync when it returns.</li>
          <li>You can attempt this quiz only once.</li>
        </ul>
        {state === 'submitted' ? (
          <Link className="btn w-full" to={`/result/${q.attempt._id}`}>View your result</Link>
        ) : (
          <>
            {!state && (
              <div><label className="label">Access code</label>
                <input className="input uppercase tracking-widest" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ask your teacher" /></div>
            )}
            <button className="btn w-full" disabled={busy}>{state ? 'Resume exam' : busy ? 'Starting...' : 'Start exam'}</button>
          </>
        )}
      </form>
    </main>
  );
}
