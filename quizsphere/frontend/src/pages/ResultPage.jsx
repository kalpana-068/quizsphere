import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { downloadReport } from '../utils/pdf';

export default function ResultPage() {
  const { id } = useParams();
  const [r, setR] = useState(null);

  useEffect(() => { api.get(`/attempts/${id}/result`).then((x) => setR(x.data)).catch((e) => toast.error(errMsg(e))); }, [id]);
  if (!r) return <p className="p-10 text-center text-slate-500">Loading result...</p>;
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="card space-y-4 text-center">
        <p className="text-sm text-slate-500">{r.quiz.title} ({r.quiz.subject})</p>
        <p className="text-5xl font-bold">{r.score}<span className="text-2xl text-slate-400"> / {r.total}</span></p>
        <p className="text-slate-600">{pct}% scored, passing marks {r.quiz.passingMarks}</p>
        <p className={`text-lg font-bold ${r.passed ? 'text-brand-700' : 'text-red-700'}`}>{r.passed ? 'You passed' : 'You did not pass'}</p>
        <p className="text-sm text-slate-500">Tab switches recorded: {r.tabSwitches}</p>
        <div className="flex gap-3 justify-center">
          <button className="btn" onClick={() => downloadReport(r)}>Download PDF {r.passed ? 'scorecard and certificate' : 'scorecard'}</button>
          <Link to="/student" className="btn-light">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
