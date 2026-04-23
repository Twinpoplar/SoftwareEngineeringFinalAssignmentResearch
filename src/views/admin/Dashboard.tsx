import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, FileText, Users, BarChart3, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Exam, ExamAttempt } from '../../types';

interface Stats {
  totalExams: number;
  activeExams: number;
  totalAttempts: number;
  avgScore: number;
}

type AttemptWithExam = ExamAttempt & { exams: Exam; profiles: { full_name: string; email: string } };
type DashboardSummary = { stats: Stats; recentAttempts: AttemptWithExam[]; recentExams: Exam[] };

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalExams: 0, activeExams: 0, totalAttempts: 0, avgScore: 0 });
  const [recentAttempts, setRecentAttempts] = useState<AttemptWithExam[]>([]);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<DashboardSummary>('/dashboard/summary');
        setStats(data.stats);
        setRecentAttempts(data.recentAttempts ?? []);
        setRecentExams(data.recentExams ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  const statCards = [
    { label: '考试总数', value: stats.totalExams, icon: <GraduationCap className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', change: '' },
    { label: '进行中考试', value: stats.activeExams, icon: <Clock className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600', change: '' },
    { label: '已提交次数', value: stats.totalAttempts, icon: <Users className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600', change: '' },
    { label: '平均分', value: `${stats.avgScore}`, icon: <TrendingUp className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600', change: '分' },
  ];

  if (isLoading) return <LoadingSpinner text="正在加载仪表盘..." fullScreen />;

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title={`欢迎回来，${user?.full_name}`}
          subtitle={dayjs().format('YYYY年M月D日')}
          icon={<BarChart3 className="w-6 h-6" />}
        />

        <div className="grid grid-cols-4 gap-5 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                  {card.icon}
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">
                {card.value}{card.change}
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />
                最近的考试
              </h2>
              <button
                onClick={() => navigate('/admin/exams')}
                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentExams.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">还没有创建任何考试</p>
            ) : (
              <div className="space-y-3">
                {recentExams.map((exam) => {
                  const now = dayjs();
                  const isActive = dayjs(exam.start_time).isBefore(now) && dayjs(exam.end_time).isAfter(now) && exam.is_published;
                  const examKey = (exam as unknown as { id?: string; _id?: string }).id ?? (exam as unknown as { id?: string; _id?: string })._id ?? `${exam.title}-${exam.start_time}-${exam.end_time}`;
                  return (
                    <div
                      key={examKey}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/exams/${examKey}/questions`)}
                    >
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : exam.is_published ? 'bg-amber-400' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{exam.title}</p>
                        <p className="text-xs text-gray-400">{dayjs(exam.start_time).format('MM月DD日')} – {dayjs(exam.end_time).format('MM月DD日')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${exam.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {exam.is_published ? '已发布' : '草稿'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                最近提交
              </h2>
              <button
                onClick={() => navigate('/admin/scores')}
                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentAttempts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">暂时还没有提交记录</p>
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((att) => {
                  const pct = att.exams ? Math.round((att.total_score / att.exams.total_points) * 100) : 0;
                  const attKey =
                    (att as unknown as { id?: string; _id?: string }).id ??
                    (att as unknown as { id?: string; _id?: string })._id ??
                    `${att.student_id}-${att.exam_id}-${att.created_at}`;
                  return (
                    <div key={attKey} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {att.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{att.profiles?.full_name || '未知用户'}</p>
                        <p className="text-xs text-gray-400 truncate">{att.exams?.title}</p>
                      </div>
                      <div className={`text-sm font-bold ${pct >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
