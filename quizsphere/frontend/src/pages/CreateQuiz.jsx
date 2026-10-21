import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';

const gen = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function CreateQuiz() {
  const nav = useNavigate();
  const [qs, setQs] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [f, setF] = useState({ title: '', subject: '', duration: 30, passingMarks: '', accessCode: gen(), shuffle: true });
  const [flt, setFlt] = useState({ subject: '', difficulty: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/questions').then((r) => setQs(r.data)).catch((e) => toast.error(errMsg(e))); }, []);

  const shown = qs.filter((q) =>
    (!flt.subject || q.subject.toLowerCase().includes(flt.subject.toLowerCase())) && (!flt.difficulty || q.difficulty === flt.difficulty));
  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectShown = () => setSel((p) => { const n = new Set(p); shown.forEach((q) => n.add(q._id)); return n; });
  const total = qs.filter((q) => sel.has(q._id)).reduce((s, q) => s + q.marks, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!sel.size) return toast.error('Select at least one question');
    setBusy(true);
    try {
      await api.post('/quizzes', { ...f, questions: [...sel] });
      toast.success('Quiz created. Publish it from the dashboard.');
      nav('/teacher');
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl mb-5">Create quiz</h1>
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-5">
        <div className="card space-y-4 h-fit">
          <div><label className="label">Title</label><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className="label">Subject</label><input className="input" required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Duration (minutes)</label><input className="input" type="number" min="1" required value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></div>
            <div><label className="label">Passing marks</label><input className="input" type="number" min="0" placeholder="40% default" value={f.passingMarks} onChange={(e) => setF({ ...f, passingMarks: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Access code (students need this to enter)</label>
            <div className="flex gap-2">
              <input className="input uppercase" required value={f.accessCode} onChange={(e) => setF({ ...f, accessCode: e.target.value })} />
              <button type="button" className="btn-light" onClick={() => setF({ ...f, accessCode: gen() })}>New</button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.shuffle} onChange={(e) => setF({ ...f, shuffle: e.target.checked })} /> Shuffle questions and options for each student</label>
          <p className="text-sm text-slate-600">{sel.size} questions selected, {total} marks in total.</p>
          <button className="btn w-full" disabled={busy}>{busy ? 'Creating...' : 'Create quiz'}</button>
        </div>

        <div className="card lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg">Pick questions</h2>
            <div className="flex gap-2">
              <input className="input" placeholder="Filter by subject" value={flt.subject} onChange={(e) => setFlt({ ...flt, subject: e.target.value })} />
              <select className="input" value={flt.difficulty} onChange={(e) => setFlt({ ...flt, difficulty: e.target.value })}><option value="">Any</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
              <button type="button" className="btn-light whitespace-nowrap" onClick={selectShown}>Select shown</button>
            </div>
          </div>
          {qs.length === 0 ? (
            <p className="text-sm text-slate-600">Your question bank is empty. <Link className="text-brand-700 font-bold" to="/teacher/questions">Add questions</Link> first.</p>
          ) : (
            <div className="divide-y max-h-[32rem] overflow-y-auto">
              {shown.map((q) => (
                <label key={q._id} className="flex gap-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={sel.has(q._id)} onChange={() => toggle(q._id)} />
                  <span><span className="font-bold">{q.text}</span><br /><span className="text-xs text-slate-500">{q.subject}, {q.unit}, {q.difficulty}, {q.type}, {q.marks} mark(s)</span></span>
                </label>
              ))}
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
