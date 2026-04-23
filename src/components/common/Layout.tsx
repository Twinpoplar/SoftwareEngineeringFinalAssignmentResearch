import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  BarChart3,
  LogOut,
  User,
  GraduationCap,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { signOut } from '../../api/auth';
import { useToast } from '../../hooks/useToast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: '仪表盘', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard', roles: ['admin', 'teacher'] },
  { label: '我的考试', icon: <BookOpen className="w-5 h-5" />, path: '/exams', roles: ['student'] },
  { label: '题库管理', icon: <FileText className="w-5 h-5" />, path: '/admin/questions', roles: ['admin', 'teacher'] },
  { label: '考试管理', icon: <GraduationCap className="w-5 h-5" />, path: '/admin/exams', roles: ['admin', 'teacher'] },
  { label: '成绩管理', icon: <BarChart3 className="w-5 h-5" />, path: '/admin/scores', roles: ['admin', 'teacher'] },
  { label: '账号管理', icon: <Users className="w-5 h-5" />, path: '/admin/users', roles: ['admin'] },
  { label: '我的成绩', icon: <BarChart3 className="w-5 h-5" />, path: '/results', roles: ['student'] },
];

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-emerald-100 text-emerald-700',
};

const roleLabels = {
  admin: '管理员',
  teacher: '教师',
  student: '学生',
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      logout();
      navigate('/login');
    } catch {
      toast.error('退出登录失败');
    }
  };

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">在线考试系统</h1>
              <p className="text-xs text-gray-400">线上考试系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || '用户'}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${roleColors[user?.role || 'student']}`}>
                {roleLabels[user?.role || 'student']}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function ProfileDropdown() {
  const { user } = useAuthStore();
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
        {user?.full_name?.charAt(0) || <User className="w-4 h-4" />}
      </div>
    </div>
  );
}
