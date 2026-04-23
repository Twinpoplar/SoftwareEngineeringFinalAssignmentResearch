import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Eye, EyeOff, User, BookOpen } from 'lucide-react';
import { signIn, signUp, getProfile } from '../../api/auth';
import { isAdminLogin, adminSignIn } from '../../api/adminAuth';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import type { Profile } from '../../types';

const emailOrAdminSchema = z.string().refine(
  (val) => {
    if (val === 'admin') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  },
  { message: '请输入有效的邮箱地址或管理员账号' }
);

const loginSchema = z.object({
  email: emailOrAdminSchema,
  password: z.string().min(6, '密码至少需要6个字符'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string(),
  studentId: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

type RoleOption = { role: Profile['role']; label: string; icon: React.ReactNode; color: string; description: string };

const roles: RoleOption[] = [
  { role: 'student', label: '学生', icon: <BookOpen className="w-5 h-5" />, color: 'border-emerald-300 bg-emerald-50 text-emerald-700', description: '参加考试 & 查看成绩' },
  { role: 'teacher', label: '教师', icon: <User className="w-5 h-5" />, color: 'border-blue-300 bg-blue-50 text-blue-700', description: '创建考试 & 管理题库' },
];

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<Profile['role']>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      let result;
      
      // 检查是否是管理员账号登录
      if (isAdminLogin(data.email, data.password)) {
        result = await adminSignIn();
      } else {
        result = await signIn(data.email, data.password);
      }
      
      if (result.user && result.session) {
        const profile = await getProfile(result.session.access_token);
        if (profile) {
          setUser(profile);
          setToken(result.session.access_token);
          toast.success(`欢迎回来，${profile.full_name}！`);
          if (profile.role === 'student') navigate('/exams');
          else navigate('/dashboard');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登录失败';
      if (data.email === 'admin' && message.includes('Invalid login credentials')) {
        toast.error('管理员账号或密码错误，请确认账号：admin，密码：TestAdmin123');
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, data.fullName, selectedRole, data.studentId);
      toast.success('账号创建成功！请登录。');
      setMode('login');
      registerForm.reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/50 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">在线考试系统</h1>
          <p className="text-blue-300/70 text-sm">智能化考试管理平台</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              注册
            </button>
          </div>

          {mode === 'register' && (
            <div className="mb-5">
              <p className="text-white/60 text-xs mb-2 uppercase tracking-widest font-medium">选择角色</p>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => setSelectedRole(r.role)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selectedRole === r.role
                        ? 'border-blue-400 bg-blue-500/20 text-white'
                        : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/70'
                    }`}
                  >
                    <div className="flex justify-center mb-1.5">{r.icon}</div>
                    <p className="text-xs font-semibold">{r.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'login' ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void loginForm.handleSubmit(handleLogin)(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">邮箱</label>
                <input
                  {...loginForm.register('email')}
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  placeholder="请输入邮箱地址或输入 admin"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">密码</label>
                <div className="relative">
                  <input
                    {...loginForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" loading={isLoading} size="lg" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-xl shadow-lg shadow-blue-900/50">
                登录
              </Button>
            </form>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void registerForm.handleSubmit(handleRegister)(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">姓名</label>
                <input
                  {...registerForm.register('fullName')}
                  placeholder="请输入姓名"
                  autoComplete="name"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
                {registerForm.formState.errors.fullName && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">邮箱</label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  placeholder="请输入邮箱地址"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              {selectedRole === 'student' && (
                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">学号（可选）</label>
                  <input
                    {...registerForm.register('studentId')}
                    placeholder="请输入你的学号"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">密码</label>
                <div className="relative">
                  <input
                    {...registerForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少6个字符"
                    autoComplete="new-password"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest font-medium mb-1.5">确认密码</label>
                <input
                  {...registerForm.register('confirmPassword')}
                  type="password"
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" loading={isLoading} size="lg" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-xl shadow-lg shadow-blue-900/50">
                创建账号
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
