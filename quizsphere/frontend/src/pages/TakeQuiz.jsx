import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';

export default function TakeQuiz() {
  const { id } = useParams();
  const nav = useNavigate();
  const cacheKey = 'qs_attempt_' + id;       // offline cache of answers
  const pendingKey = cacheKey + '_pending';  // set when submit failed because of no internet

  const [att, setAtt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [tabs, setTabs] = useState(0);
  const [warn, setWarn] = useState(false);
  const submitting = useRef(false);
  const lastHit = useRef(0);
  const live = useRef({});
  live.current = { answers, flags, tabs, att };

  /* ---- load attempt, merge with offline cache ---- */
  useEffect(() => {
    api.get('/attempts/' + id).then((r) => {
      const a = r.data;
      if (a.status === 'submitted') { nav('/result/' + id, { replace: true }); return; }
      let cache = {};
      try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch { /* ignore */ }
      const sa = Object.fromEntries(a.answers.filter((x) => x.answer).map((x) => [x.question, x.answer]));
      const sf = Object.fromEntries(a.answers.filter((x) => x.flagged).map((x) => [x.question, true]));
      setAnswers({ ...sa, ...(cache.answers || {}) });
      setFlags({ ...sf, ...(cache.flags || {}) });
      setTabs(Math.max(a.tabSwitches, cache.tabs || 0));
      setRemaining(a.remainingMs);
      setPaused(a.isPaused);
      setAtt(a);
    }).catch((e) => { toast.error(errMsg(e)); nav('/student'); });
  }, [id]);

  /* ---- keep a local copy of everything (offline auto-recovery) ---- */
  useEffect(() => {
    if (att) localStorage.setItem(cacheKey, JSON.stringify({ answers, flags, tabs }));
  }, [answers, flags, tabs, att]);

  const payload = () => {
    const { answers: a, flags: f, att: at } = live.current;
    return at.items.map((i) => ({ question: i._id, answer: a[i._id] || '', flagged: !!f[i._id] }));
  };

  /* ---- submit ---- */
  const submit = async () => {
    if (submitting.current || !live.current.att) return;
    submitting.current = true;
    try {
      await api.post(`/attempts/${id}/submit`, { answers: payload(), tabSwitches: live.current.tabs });
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(pendingKey);
      nav('/result/' + id, { replace: true });
    } catch (e) {
      submitting.current = false;
      if (!e.response) {
        localStorage.setItem(pendingKey, '1');
        setOnline(false);
        toast.error('No internet. Your answers are saved on this device and will be submitted automatically when you are back online.', { duration: 8000 });
      } else toast.error(errMsg(e));
    }
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  /* ---- sync with server (auto-save + timer/freeze status) ---- */
  const sync = useCallback(async () => {
    if (!live.current.att || submitting.current) return;
    if (localStorage.getItem(pendingKey)) { submitRef.current(); return; }
    try {
      const r = await api.post(`/attempts/${id}/sync`, { answers: payload() });
      setOnline(true);
      setRemaining(r.data.remainingMs);
      setPaused(r.data.isPaused);
      if (r.data.status === 'submitted') nav('/result/' + id, { replace: true });
    } catch (e) { if (!e.response) setOnline(false); }
  }, [id]);

  useEffect(() => {
    if (!att) return;
    const t = setInterval(sync, 8000);
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [att, sync]);

  /* ---- countdown (stops while the teacher freezes the exam) ---- */
  useEffect(() => {
    if (!att || paused) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, [att, paused]);
  useEffect(() => { if (att && !paused && remaining === 0) submitRef.current(); }, [remaining, att, paused]);

  /* ---- tab-switch logger ---- */
  useEffect(() => {
    if (!att) return;
    const hit = () => {
      if (Date.now() - lastHit.current < 1500) return; // blur + visibilitychange fire together
      lastHit.current = Date.now();
      setTabs((t) => t + 1);
      setWarn(true);
      api.post(`/attempts/${id}/tab-switch`).catch(() => {});
    };
    const vis = () => { if (document.hidden) hit(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('blur', hit);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('blur', hit); };
  }, [att, id]);

  /* ---- warn before closing the tab ---- */
  useEffect(() => {
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  if (!att) return <p className="p-10 text-center text-slate-500">Loading exam...</p>;

  const items = att.items;
  const q = items[idx];
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor(remaining / 1000) % 60).padStart(2, '0');
  const answered = items.filter((i) => answers[i._id]).length;
  const setAns = (v) => setAnswers((p) => ({ ...p, [q._id]: v }));
  const paletteColor = (i) => (flags[i._id] ? 'bg-amber-400 text-slate-900' : answers[i._id] ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700');

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg">{att.quiz.title}</h1>
            <p className="text-xs text-slate-500">{answered} of {items.length} answered</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className={online ? 'tag bg-brand-100 text-brand-700' : 'tag bg-red-100 text-red-700'}>{online ? 'Online, saved' : 'Offline, saved on device'}</span>
            <span className={tabs ? 'text-red-700 font-bold' : 'text-slate-500'}>Tab switches: {tabs}</span>
            <span className={`text-2xl font-bold tabular-nums ${remaining < 60000 ? 'text-red-700' : ''}`}>{mm}:{ss}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_18rem] gap-5">
        <section className="card space-y-5">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Question {idx + 1} of {items.length}</span><span>{q.marks} mark(s)</span>
          </div>
          <p className="text-lg font-bold">{q.text}</p>

          {q.type === 'fillblank' ? (
            <input className="input" placeholder="Type your answer" value={answers[q._id] || ''} onChange={(e) => setAns(e.target.value)} autoComplete="off" />
          ) : (
            <div className="space-y-2">
              {q.options.map((o) => (
                <label key={o} className={`flex items-center gap-3 border rounded-md px-4 py-3 cursor-pointer ${answers[q._id] === o ? 'border-brand-600 bg-brand-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                  <input type="radio" name={q._id} checked={answers[q._id] === o} onChange={() => setAns(o)} />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <button className="btn-light" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</button>
              <button className="btn-light" disabled={idx === items.length - 1} onClick={() => setIdx(idx + 1)}>Next</button>
              {answers[q._id] && <button className="btn-light" onClick={() => setAns('')}>Clear answer</button>}
            </div>
            <button className="btn-light" onClick={() => setFlags((p) => ({ ...p, [q._id]: !p[q._id] }))}>{flags[q._id] ? 'Remove flag' : 'Flag for review'}</button>
          </div>
        </section>

        <aside className="card h-fit space-y-4">
          <h2 className="text-base">Question palette</h2>
          <div className="grid grid-cols-5 gap-2">
            {items.map((i, n) => (
              <button key={i._id} onClick={() => setIdx(n)} className={`h-10 rounded-md text-sm font-bold ${paletteColor(i)} ${n === idx ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}>{n + 1}</button>
            ))}
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-brand-600" /> Attempted</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-slate-200" /> Not attempted</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Flagged for review</li>
          </ul>
          <button className="btn w-full" onClick={() => { if (confirm(`You answered ${answered} of ${items.length} questions. Submit now?`)) submit(); }}>Submit exam</button>
        </aside>
      </main>

      {paused && (
        <div className="fixed inset-0 z-30 bg-slate-900/80 grid place-items-center px-4">
          <div className="card max-w-sm text-center space-y-2">
            <h2 className="text-xl">Exam paused</h2>
            <p className="text-slate-600 text-sm">Your teacher has paused the exam. Your timer is stopped and your answers are safe. This screen closes when the exam resumes.</p>
          </div>
        </div>
      )}

      {warn && !paused && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 grid place-items-center px-4">
          <div className="card max-w-sm text-center space-y-3">
            <h2 className="text-xl text-red-700">You left the exam tab</h2>
            <p className="text-slate-600 text-sm">This has been logged and your teacher can see it. Total tab switches: <b>{tabs}</b>. Please stay on this page until you submit.</p>
            <button className="btn w-full" onClick={() => setWarn(false)}>Back to exam</button>
          </div>
        </div>
      )}
    </div>
  );
}
