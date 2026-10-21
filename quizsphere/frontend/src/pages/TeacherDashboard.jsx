import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';

export default function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/quizzes/mine').then((r) => setQuizzes(r.data)).catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const copy = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${id}`);
    toast.success('Quiz link copied');
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl">Your quizzes</h1>
        <Link to="/teacher/quizzes/new" className="btn">Create quiz</Link>
      </div>

      {loading ? <p className="text-slate-500">Loading...</p> : quizzes.length === 0 ? (
        <div className="card text-center text-slate-600">
          <p className="mb-3">You have no quizzes yet. Add questions to your bank first, then create a quiz from them.</p>
          <Link to="/teacher/questions" className="btn">Open question bank</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((q) => (
            <div key={q._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg">{q.title}</h2>
                  <p className="text-sm text-slate-500">{q.subject}, {q.questionCount} questions, {q.totalMarks} marks, {q.duration} min, pass at {q.passingMarks}</p>
                  <p className="text-sm mt-1">Access code: <span className="font-bold tracking-wider bg-slate-100 px-2 py-0.5 rounded">{q.accessCode}</span></p>
                </div>
                <div className="flex gap-2">
                  <span className="tag">{q.isPublished ? 'Published' : 'Draft'}</span>
                  {q.isPaused && <span className="tag bg-amber-100 text-amber-800">Frozen</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {!q.isPublished && <button className="btn" onClick={() => act(() => api.put(`/quizzes/${q._id}/publish`), 'Published and students notified')}>Publish</button>}
                {q.isPublished && <button className="btn-light" onClick={() => copy(q._id)}>Copy quiz link</button>}
                <Link to={`/teacher/quizzes/${q._id}`} className="btn-light">Live monitor and analytics</Link>
                <button className="btn-danger" onClick={() => { if (confirm('Delete this quiz and all its results?')) act(() => api.delete(`/quizzes/${q._id}`), 'Quiz deleted'); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
