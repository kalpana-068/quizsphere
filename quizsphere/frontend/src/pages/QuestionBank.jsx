import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';

const empty = { subject: '', unit: '', difficulty: 'medium', type: 'mcq', text: '', options: ['', '', '', ''], correctIdx: 0, correctAnswer: 'True', marks: 1 };

export default function QuestionBank() {
  const [list, setList] = useState([]);
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [flt, setFlt] = useState({ subject: '', difficulty: '', type: '' });
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);

  const load = () => api.get('/questions').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setOpt = (i, v) => setF((p) => { const o = [...p.options]; o[i] = v; return { ...p, options: o }; });

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...f };
      if (f.type === 'mcq') body.correctAnswer = f.options[f.correctIdx] || '';
      if (f.type === 'truefalse') body.options = ['True', 'False'];
      if (editId) await api.put('/questions/' + editId, body);
      else await api.post('/questions', body);
      toast.success(editId ? 'Question updated' : 'Question added');
      setF(empty); setEditId(null); load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const edit = (q) => {
    setEditId(q._id);
    const opts = q.type === 'mcq' ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''];
    setF({
      subject: q.subject, unit: q.unit, difficulty: q.difficulty, type: q.type, text: q.text,
      options: opts, correctIdx: Math.max(0, opts.indexOf(q.correctAnswer)), correctAnswer: q.correctAnswer, marks: q.marks,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!confirm('Delete this question?')) return;
    try { await api.delete('/questions/' + id); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  const upload = async () => {
    if (!file) return toast.error('Choose a CSV file first');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api.post('/questions/bulk', fd);
      setRes(r.data); setFile(null);
      toast.success(`${r.data.imported} questions imported`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const template = () => {
    const csv = 'subject,unit,difficulty,type,text,optionA,optionB,optionC,optionD,correctAnswer\n' +
      'Mathematics,Algebra,easy,mcq,"What is 2+2?",3,4,5,6,B\n' +
      'Mathematics,Algebra,easy,truefalse,"0 is an even number",,,,,True\n' +
      'Science,Physics,medium,fillblank,"The unit of force is ____",,,,,Newton\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'questions_template.csv';
    a.click();
  };

  const shown = list.filter((q) =>
    (!flt.subject || q.subject.toLowerCase().includes(flt.subject.toLowerCase())) &&
    (!flt.difficulty || q.difficulty === flt.difficulty) && (!flt.type || q.type === flt.type));

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl">Question bank</h1>

      <form onSubmit={save} className="card space-y-4">
        <h2 className="text-lg">{editId ? 'Edit question' : 'Add a question'}</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <div><label className="label">Subject</label><input className="input" required value={f.subject} onChange={(e) => set('subject', e.target.value)} /></div>
          <div><label className="label">Unit</label><input className="input" value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="General" /></div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={f.type} onChange={(e) => setF((p) => ({ ...p, type: e.target.value, correctAnswer: e.target.value === 'truefalse' ? 'True' : '' }))}>
              <option value="mcq">Multiple choice</option><option value="truefalse">True / False</option><option value="fillblank">Fill in the blank</option>
            </select>
          </div>
        </div>
        <div><label className="label">Question</label><textarea className="input" rows={2} required value={f.text} onChange={(e) => set('text', e.target.value)} /></div>

        {f.type === 'mcq' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {f.options.map((o, i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={f.correctIdx === i} onChange={() => set('correctIdx', i)} title="Mark as correct" />
                <input className="input" placeholder={`Option ${'ABCD'[i]}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
              </label>
            ))}
            <p className="text-xs text-slate-500 sm:col-span-2">Select the radio button next to the correct option.</p>
          </div>
        )}
        {f.type === 'truefalse' && (
          <div className="max-w-xs"><label className="label">Correct answer</label>
            <select className="input" value={f.correctAnswer} onChange={(e) => set('correctAnswer', e.target.value)}><option>True</option><option>False</option></select>
          </div>
        )}
        {f.type === 'fillblank' && (
          <div className="max-w-md"><label className="label">Correct answer (separate alternatives with |)</label>
            <input className="input" required value={f.correctAnswer} onChange={(e) => set('correctAnswer', e.target.value)} />
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="w-24"><label className="label">Marks</label><input className="input" type="number" min="1" value={f.marks} onChange={(e) => set('marks', e.target.value)} /></div>
          <button className="btn">{editId ? 'Save changes' : 'Add question'}</button>
          {editId && <button type="button" className="btn-light" onClick={() => { setEditId(null); setF(empty); }}>Cancel</button>}
        </div>
      </form>

      <section className="card space-y-3">
        <h2 className="text-lg">Bulk upload from CSV</h2>
        <p className="text-sm text-slate-600">Columns: subject, unit, difficulty, type (mcq, truefalse, fillblank), text, optionA to optionD, correctAnswer (A-D letter or the answer text).</p>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
          <button className="btn" onClick={upload}>Upload CSV</button>
          <button className="btn-light" onClick={template}>Download template</button>
        </div>
        {res && (
          <div className="text-sm">
            <p><b>{res.imported}</b> imported, <b>{res.failed}</b> skipped.</p>
            {res.errors.map((er, i) => <p key={i} className="text-red-700">{er}</p>)}
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg">All questions ({shown.length})</h2>
          <div className="flex gap-2">
            <input className="input" placeholder="Filter by subject" value={flt.subject} onChange={(e) => setFlt({ ...flt, subject: e.target.value })} />
            <select className="input" value={flt.difficulty} onChange={(e) => setFlt({ ...flt, difficulty: e.target.value })}><option value="">Any difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
            <select className="input" value={flt.type} onChange={(e) => setFlt({ ...flt, type: e.target.value })}><option value="">Any type</option><option value="mcq">MCQ</option><option value="truefalse">True/False</option><option value="fillblank">Fill blank</option></select>
          </div>
        </div>
        {shown.length === 0 ? <p className="text-slate-500 text-sm">No questions yet. Add one above or upload a CSV.</p> : (
          <div className="divide-y">
            {shown.map((q) => (
              <div key={q._id} className="py-3 flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{q.text}</p>
                  <p className="text-sm text-slate-500">{q.subject}, {q.unit}, {q.difficulty}, {q.type}, {q.marks} mark(s). Answer: <b>{q.correctAnswer}</b></p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-light" onClick={() => edit(q)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(q._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
