import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { Clock, BookOpen, Calendar, ArrowRight, CheckCircle, Lock, Play, Trophy } from 'lucide-react';
import { useExams } from '../../queries/examQueries';
import { useToast } from '../../hooks/useToast';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDuration, getExamStatus } from '../../utils/examHelpers';
import type { Exam, ExamAttempt } from '../../types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const getExamId = (exam: Exam) => (exam as unknown as { id?: string; _id?: string }).id ?? (exam as unknown as { id?: string; _id?: string })._id ?? '';

const statusConfig = {
  not_started: { label: '未开始', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: '进行中', color: 'bg-emerald-100 text-emerald-700', icon: <Play className="w-3.5 h-3.5" /> },
  ended: { label: '已结束', color: 'bg-gray-100 text-gray-600', icon: <Lock className="w-3.5 h-3.5" /> },
  my_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700', icon: <BookOpen className="w-3.5 h-3.5" /> },
  completed: { label: '已完成', color: 'bg-teal-100 text-teal-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

interface ExamCardProps {
  exam: Exam;
  attempt?: ExamAttempt;
  onEnter: (exam: Exam) => void;
}

function ExamCard({ exam, attempt, onEnter }: ExamCardProps) {
  const examStatus = getExamStatus(exam);
  const hasSubmitted = attempt?.status === 'completed' || attempt?.status === 'graded';
  const hasStarted = attempt?.status === 'in_progress';

  const displayStatus = hasSubmitted ? 'completed' : hasStarted ? 'my_progress' : examStatus;
  const cfg = statusConfig[displayStatus];

  const canEnter = examStatus === 'in_progress' && !hasSubmitted;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </span>
              {hasSubmitted && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  {attempt?.total_score}/{exam.total_points}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{exam.title}</h3>
            {exam.description && (
              <p className="text-gray-500 text-sm line-clamp-2">{exam.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </div>
            {formatDuration(exam.duration_minutes)}
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            {exam.total_points} 分
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm col-span-2">
            <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span>
              {dayjs(exam.start_time).format('MM月DD日')} – {dayjs(exam.end_time).format('MM月DD日 HH:mm')}
            </span>
          </div>
        </div>

        {examStatus === 'not_started' && (
          <div className="bg-amber-50 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-amber-700 text-xs font-medium">
              {dayjs(exam.start_time).fromNow()}开始
            </p>
          </div>
        )}

        <button
          onClick={() => canEnter && onEnter(exam)}
          disabled={!canEnter}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
            canEnter
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 group-hover:shadow-blue-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {hasSubmitted ? (
            <>
              <CheckCircle className="w-4 h-4" />
              查看成绩
            </>
          ) : hasStarted ? (
            <>
              <ArrowRight className="w-4 h-4" />
              继续考试
            </>
          ) : canEnter ? (
            <>
              <Play className="w-4 h-4" />
              开始考试
            </>
          ) : examStatus === 'not_started' ? (
            <>
              <Lock className="w-4 h-4" />
              暂未开放
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              考试已结束
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ExamList() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const { data: exams = [], isLoading } = useExams();

  const attempts = exams.reduce((acc, exam) => {
    if (exam.exam_attempts && exam.exam_attempts.length > 0) {
      const examId = getExamId(exam);
      if (examId) acc[examId] = exam.exam_attempts[0];
    }
    return acc;
  }, {} as Record<string, ExamAttempt>);

  const handleEnter = (exam: Exam) => {
    const examId = getExamId(exam);
    if (!examId) {
      toast.error('考试ID缺失，无法进入考试');
      return;
    }
    navigate(`/exam/${examId}`);
  };

  const activeExams = exams.filter((e) => getExamStatus(e) === 'in_progress');
  const upcomingExams = exams.filter((e) => getExamStatus(e) === 'not_started');
  const pastExams = exams.filter((e) => getExamStatus(e) === 'ended');

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="我的考试"
          subtitle="查看并参加您的考试"
          icon={<BookOpen className="w-6 h-6" />}
        />

        {isLoading ? (
          <LoadingSpinner text="正在加载考试..." />
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无考试</h3>
            <p className="text-gray-400 max-w-sm">当前没有已发布的考试，请稍后再查看。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeExams.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  正在进行的考试 ({activeExams.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeExams.map((exam, index) => {
                    const examId = getExamId(exam);
                    const examKey = examId || `${exam.title}-${exam.start_time}-${exam.end_time}-${index}`;
                    return <ExamCard key={examKey} exam={exam} attempt={examId ? attempts[examId] : undefined} onEnter={handleEnter} />;
                  })}
                </div>
              </section>
            )}

            {upcomingExams.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  即将开始 ({upcomingExams.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcomingExams.map((exam, index) => {
                    const examId = getExamId(exam);
                    const examKey = examId || `${exam.title}-${exam.start_time}-${exam.end_time}-${index}`;
                    return <ExamCard key={examKey} exam={exam} attempt={examId ? attempts[examId] : undefined} onEnter={handleEnter} />;
                  })}
                </div>
              </section>
            )}

            {pastExams.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full" />
                  历史考试 ({pastExams.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pastExams.map((exam, index) => {
                    const examId = getExamId(exam);
                    const examKey = examId || `${exam.title}-${exam.start_time}-${exam.end_time}-${index}`;
                    return <ExamCard key={examKey} exam={exam} attempt={examId ? attempts[examId] : undefined} onEnter={handleEnter} />;
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
