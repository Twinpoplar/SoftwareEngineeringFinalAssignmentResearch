import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { getProfile } from './api/auth';
import Login from './views/auth/Login';
import ExamList from './views/exam/ExamList';
import ExamRoom from './views/exam/ExamRoom';
import Results from './views/result/Results';
import ResultsList from './views/result/ResultsList';
import Dashboard from './views/admin/Dashboard';
import ExamManagement from './views/admin/ExamManagement';
import QuestionBank from './views/admin/QuestionBank';
import ExamQuestionManagement from './views/admin/ExamQuestionManagement';
import ScoreManagement from './views/admin/ScoreManagement';
import UserManagement from './views/admin/UserManagement';
import { LoadingSpinner } from './components/common/LoadingSpinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner fullScreen />;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner fullScreen />;
  return user && roles.includes(user.role) ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const { setUser, setToken, setIsLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 从 zustand store 获取当前持久化的 token
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
          const profile = await getProfile(currentToken);
          if (profile) {
            setUser(profile);
          } else {
            // token 可能过期或无效
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [setUser, setToken, setIsLoading]);

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/exams" element={<ProtectedRoute><ExamList /></ProtectedRoute>} />
        <Route path="/exam/:examId" element={<ProtectedRoute><ExamRoom /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><ResultsList /></ProtectedRoute>} />
        <Route path="/results/:attemptId" element={<ProtectedRoute><Results /></ProtectedRoute>} />

        <Route path="/dashboard" element={<RoleRoute roles={['admin', 'teacher']}><Dashboard /></RoleRoute>} />
        <Route path="/admin/exams" element={<RoleRoute roles={['admin', 'teacher']}><ExamManagement /></RoleRoute>} />
        <Route path="/admin/questions" element={<RoleRoute roles={['admin', 'teacher']}><QuestionBank /></RoleRoute>} />
        <Route path="/admin/exams/:examId/questions" element={<RoleRoute roles={['admin', 'teacher']}><ExamQuestionManagement /></RoleRoute>} />
        <Route path="/admin/scores" element={<RoleRoute roles={['admin', 'teacher']}><ScoreManagement /></RoleRoute>} />
        <Route path="/admin/users" element={<RoleRoute roles={['admin']}><UserManagement /></RoleRoute>} />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
