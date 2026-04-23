import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, ArrowRight, BarChart3 } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useStudentResults } from '../../queries/resultQueries';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getScoreColor, getGrade } from '../../utils/examHelpers';

export default function ResultsList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: attempts = [], isLoading } = useStudentResults(user?.id);
  const getAttemptId = (att: unknown) => (att as { id?: string; _id?: string }).id ?? (att as { id?: string; _id?: string })._id ?? '';

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="我的成绩"
          subtitle="查看已完成考试的成绩"
          icon={<BarChart3 className="w-6 h-6" />}
        />

        {isLoading ? (
          <LoadingSpinner text="正在加载成绩..." />
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无成绩</h3>
            <p className="text-gray-400 max-w-sm">完成一次考试后，就可以在这里查看成绩。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((att) => {
              const exam = att.exams;
              const pct = exam ? Math.round((att.total_score / exam.total_points) * 100) : 0;
              const grade = exam ? getGrade(att.total_score, exam.total_points) : '-';
              const attemptId = getAttemptId(att);

              return (
                <div
                  key={attemptId || `${att.exam_id}-${att.created_at}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => attemptId && navigate(`/results/${attemptId}`)}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                    pct >= 90 ? 'bg-emerald-100 text-emerald-700' :
                    pct >= 70 ? 'bg-blue-100 text-blue-700' :
                    pct >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {grade}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{exam?.title || '未知考试'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {att.submitted_at ? dayjs(att.submitted_at).format('YYYY-MM-DD HH:mm') : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-2xl font-black ${getScoreColor(att.total_score, exam?.total_points || 100)}`}>
                      {pct}%
                    </div>
                    <div className="text-sm text-gray-400">{att.total_score}/{exam?.total_points || 0} 分</div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
