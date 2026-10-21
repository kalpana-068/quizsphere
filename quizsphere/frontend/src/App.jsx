import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import QuestionBank from './pages/QuestionBank';
import CreateQuiz from './pages/CreateQuiz';
import QuizMonitor from './pages/QuizMonitor';
import StudentDashboard from './pages/StudentDashboard';
import QuizEntry from './pages/QuizEntry';
import TakeQuiz from './pages/TakeQuiz';
import ResultPage from './pages/ResultPage';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/questions" element={<ProtectedRoute role="teacher"><QuestionBank /></ProtectedRoute>} />
        <Route path="/teacher/quizzes/new" element={<ProtectedRoute role="teacher"><CreateQuiz /></ProtectedRoute>} />
        <Route path="/teacher/quizzes/:id" element={<ProtectedRoute role="teacher"><QuizMonitor /></ProtectedRoute>} />

        <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/quiz/:id" element={<ProtectedRoute role="student"><QuizEntry /></ProtectedRoute>} />
        <Route path="/attempt/:id" element={<ProtectedRoute role="student"><TakeQuiz /></ProtectedRoute>} />
        <Route path="/result/:id" element={<ProtectedRoute role="student"><ResultPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
