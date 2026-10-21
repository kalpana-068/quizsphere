import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { downloadReport } from '../utils/pdf';

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/quizzes'), api.get('/attempts/mine')])
      .then(([q, r]) => { setQuizzes(q.data); setResults(r.data); })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-10 text-center text-slate-500">Loading...</p>;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <section>
        <h1 className="text-2xl mb-4">Available quizzes</h1>
        {quizzes.length === 0 ? <div className="card text-slate-600">No quizzes are published right now. Check back later or open a quiz link shared by your teacher.</div> : (
          <div className="grid sm:grid-cols-2 gap-4">
            {quizzes.map((q) => (
              <div key={q._id} className="card flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-lg">{q.title}</h2>
                  <p className="text-sm text-slate-500">{q.subject}, {q.questionCount} questions, {q.totalMarks} marks, {q.duration} min</p>
                </div>
                {q.attempt?.status === 'submitted'
                  ? <Link className="btn-light" to={`/result/${q.attempt._id}`}>View result</Link>
                  : <Link className="btn" to={`/quiz/${q._id}`}>{q.attempt ? 'Resume exam' : 'Open quiz'}</Link>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl mb-4">My results</h2>
        {results.length === 0 ? <p className="text-sm text-slate-500">You have not submitted any quiz yet.</p> : (
          <div className="card overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Quiz</th><th>Score</th><th>Result</th><th>Date</th><th></th></tr></thead>
            <tbody>{results.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="py-2">{r.quiz.title}</td><td>{r.score} / {r.total}</td>
                <td className={r.passed ? 'text-brand-700 font-bold' : 'text-red-700 font-bold'}>{r.passed ? 'Pass' : 'Fail'}</td>
                <td>{new Date(r.submittedAt).toLocaleDateString()}</td>
                <td className="text-right"><button className="btn-light" onClick={() => downloadReport(r)}>Download PDF</button></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </main>
  );
}
