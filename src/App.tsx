// 1. React 核心工具
import { useEffect } from 'react';
// 2. 路由工具（管页面跳转）
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// 3. 全局登录状态管理（存你的登录信息）
import { useAuthStore } from './stores/authStore';
// 4. 后端接口（获取用户信息）
import { getProfile } from './api/auth';
// 5. 所有页面组件（登录页、考试页、后台页……）
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
// 6. 加载动画（转圈的那个）
import { LoadingSpinner } from './components/common/LoadingSpinner';

//普通门卫（「没登录不让进」）
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  // 如果正在检查登录状态，显示转圈加载
  if (isLoading) return <LoadingSpinner fullScreen />;

  // 已登录 → 让你进去；没登录 → 强制跳转到登录页
  return user ? <>{children}</> : <Navigate to="/login" />;
}

//高级门卫（「不仅要登录，还要看身份」）
function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner fullScreen />;
  // 已登录 + 身份符合（比如是老师/管理员）→ 放行；否则 → 回登录页
  return user && roles.includes(user.role) ? <>{children}</> : <Navigate to="/login" />;
}

//App 主组件（自动登录 + 导航地图）
export default function App() {
  const { setUser, setToken, setIsLoading, isLoading } = useAuthStore();

  // 页面一加载，立刻执行：检查你之前有没有登录过
  //useEffect传参：副作用函数, 依赖数组
  useEffect(() => {
    //第一个参数：副作用函数：先声明一个异步函数然后调用
    const initAuth = async () => {
      try {

        // 从 zustand store 获取当前持久化的 token
        // 从本地存储里拿之前存的「登录令牌（token）」
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
          // 拿着令牌去后端问：「这个令牌还能用吗？是谁的？」
          const profile = await getProfile(currentToken);
          if (profile) {
            // 令牌有效 → 自动登录，把用户信息存起来
            setUser(profile);
          } else {
            // token 可能过期或无效
            // 令牌过期/无效 → 清空登录状态
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        // 不管成功失败，都结束「加载中」状态
        setIsLoading(false);
      }
    };

    initAuth();
  }, [setUser, setToken, setIsLoading]);

  //正在检查登录状态时，屏幕中间显示一个转圈的加载动画
  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <Router>
      <Routes>
        {/* 1. 登录页：所有人都能进，不用门卫 */}
        <Route path="/login" element={<Login />} />

        {/* 2. 学生/普通用户页面：需要登录（过普通门卫） */}
        <Route path="/exams" element={<ProtectedRoute><ExamList /></ProtectedRoute>} />
        <Route path="/exam/:examId" element={<ProtectedRoute><ExamRoom /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><ResultsList /></ProtectedRoute>} />
        <Route path="/results/:attemptId" element={<ProtectedRoute><Results /></ProtectedRoute>} />

        {/* 3. 老师/管理员页面：需要登录 + 身份符合（过高级门卫） */}
        <Route path="/dashboard" element={<RoleRoute roles={['admin', 'teacher']}><Dashboard /></RoleRoute>} />
        <Route path="/admin/exams" element={<RoleRoute roles={['admin', 'teacher']}><ExamManagement /></RoleRoute>} />
        <Route path="/admin/questions" element={<RoleRoute roles={['admin', 'teacher']}><QuestionBank /></RoleRoute>} />
        <Route path="/admin/exams/:examId/questions" element={<RoleRoute roles={['admin', 'teacher']}><ExamQuestionManagement /></RoleRoute>} />
        <Route path="/admin/scores" element={<RoleRoute roles={['admin', 'teacher']}><ScoreManagement /></RoleRoute>} />
        {/* 4. 只有管理员能进的页面 */}
        <Route path="/admin/users" element={<RoleRoute roles={['admin']}><UserManagement /></RoleRoute>} />

        {/* 5. 默认首页：直接跳转到登录页 */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
