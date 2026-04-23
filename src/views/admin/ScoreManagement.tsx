import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { BarChart3, Search, Filter, Eye, Trophy, Users } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { useToast } from '../../hooks/useToast';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getScoreColor, getGrade } from '../../utils/examHelpers';
import type { ExamAttempt, Exam, Profile } from '../../types';

type AttemptWithRelations = ExamAttempt & { exams: Exam; profiles: Profile };

export default function ScoreManagement() {
  const [attempts, setAttempts] = useState<AttemptWithRelations[]>([]);
  const [filtered, setFiltered] = useState<AttemptWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const getId = (v: unknown) => (v as { id?: string; _id?: string }).id ?? (v as { id?: string; _id?: string })._id ?? '';

  useEffect(() => {
    api
      .get('/attempts/all')
      .then((data) => {
        const submitted = (data as AttemptWithRelations[]).filter((a) => a.status !== 'in_progress');
        setAttempts(submitted);
        setFiltered(submitted);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : '加载成绩失败'))
      .finally(() => setIsLoading(false));
  }, [toast]);

  useEffect(() => {
    let result = attempts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        a.profiles?.full_name?.toLowerCase().includes(q) ||
        a.profiles?.email?.toLowerCase().includes(q) ||
        a.exams?.title?.toLowerCase().includes(q)
      );
    }
    if (filterExam) {
      result = result.filter((a) => a.exam_id === filterExam);
    }
    setFiltered(result);
  }, [searchQuery, filterExam, attempts]);

  const uniqueExams = Array.from(new Map(attempts.map((a) => [a.exam_id, a.exams])).values()).filter(Boolean);

  const stats = {
    total: filtered.length,
    passed: filtered.filter((a) => a.exams && a.total_score >= a.exams.pass_score).length,
    avgScore: filtered.length > 0 ? Math.round(filtered.reduce((s, a) => s + a.total_score, 0) / filtered.length) : 0,
  };

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="成绩管理"
          subtitle="查看并管理学生考试成绩"
          icon={<BarChart3 className="w-6 h-6" />}
        />

        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: '提交总数', value: stats.total, icon: <Users className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
            { label: '通过人数', value: stats.passed, icon: <Trophy className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50' },
            { label: '平均分', value: `${stats.avgScore} 分`, icon: <BarChart3 className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg}`}>{card.icon}</div>
              <div>
                <div className="text-2xl font-black text-gray-900">{card.value}</div>
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索学生姓名、邮箱或考试标题..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          {uniqueExams.length > 1 && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterExam}
                onChange={(e) => setFilterExam(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors appearance-none bg-white"
              >
                <option value="">全部考试</option>
                {uniqueExams.map((e) => (
                  <option key={getId(e) || e.title} value={getId(e)}>{e.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner text="正在加载成绩..." />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无提交记录</h3>
            <p className="text-gray-400">当前筛选条件下没有找到提交记录。</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['学生', '考试', '得分', '等级', '状态', '提交时间', '操作'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest px-5 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((att) => {
                  const exam = att.exams;
                  const pct = exam ? Math.round((att.total_score / exam.total_points) * 100) : 0;
                  const passed = exam ? att.total_score >= exam.pass_score : false;
                  const grade = exam ? getGrade(att.total_score, exam.total_points) : '-';
                  const attemptId = getId(att);

                  return (
                    <tr key={attemptId || `${att.student_id}-${att.exam_id}-${att.created_at}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {att.profiles?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{att.profiles?.full_name || '未知用户'}</div>
                            <div className="text-xs text-gray-400">{att.profiles?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-700 font-medium max-w-40 truncate">{exam?.title || '未知考试'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className={`text-sm font-bold ${getScoreColor(att.total_score, exam?.total_points || 100)}`}>
                          {pct}%
                        </div>
                        <div className="text-xs text-gray-400">{att.total_score}/{exam?.total_points || 0}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-lg font-black ${getScoreColor(att.total_score, exam?.total_points || 100)}`}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {passed ? '通过' : '未通过'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-gray-500">{att.submitted_at ? dayjs(att.submitted_at).format('MM月DD日 HH:mm') : '-'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => attemptId && navigate(`/results/${attemptId}`)}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="查看成绩"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
