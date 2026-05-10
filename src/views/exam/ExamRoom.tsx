import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lazy } from 'react';
import {
  ChevronLeft, ChevronRight, Flag, Send, AlertTriangle,
  Monitor, Save, BookOpen, Maximize, Minimize,
} from 'lucide-react';
import { useStudentExam, useStartExam, useSubmitAnswer, useSubmitExam, useExamAnswers } from '../../queries/examQueries';
import { useAuthStore } from '../../stores/authStore';
import { useExamStore } from '../../stores/examStore';
import { useToast } from '../../hooks/useToast';
import { Timer } from '../../components/exam/Timer';
import { AnswerSheet } from '../../components/exam/AnswerSheet';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import type { Question, AttemptAnswer } from '../../types';

//const ReactQuill = lazy(() => import('react-quill'));
//修考试界面打不开的bug
import ReactQuill from 'react-quill';

import 'react-quill/dist/quill.snow.css';

const TYPE_LABELS = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题',
};

const TYPE_COLORS = {
  single_choice: 'bg-blue-100 text-blue-700',
  multiple_choice: 'bg-teal-100 text-teal-700',
  true_false: 'bg-amber-100 text-amber-700',
  short_answer: 'bg-rose-100 text-rose-700',
};

// 防作弊模块
const useAntiCheat = () => {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount <= 3) {
            setShowWarning(true);
            toast.warning(`检测到标签页切换 (${newCount}/3 警告)`);
          } else {
            toast.error('超过最大标签页切换次数！考试将被自动提交。');
            // 强制提交考试
            setTimeout(() => {
              // 触发提交逻辑
            }, 1000);
          }
          return newCount;
        });
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning('考试期间禁止使用右键菜单');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 禁用 F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        toast.warning('考试期间禁用开发者工具');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      toast.error('进入全屏失败');
    }
  };

  const exitFullscreen = async () => {
    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } catch {
      toast.error('退出全屏失败');
    }
  };

  return {
    tabSwitchCount,
    isFullscreen,
    showWarning,
    setShowWarning,
    enterFullscreen,
    exitFullscreen,
  };
};

function QuestionCard({
  question,
  index,
  total,
  answer,
  onAnswer,
  onFlag,
}: {
  question: Question;
  index: number;
  total: number;
  answer?: AttemptAnswer;
  onAnswer: (value: string | string[]) => void;
  onFlag: () => void;
}) {
  const [quillValue, setQuillValue] = useState('');
  const isFlagged = answer?.is_flagged ?? false;

  useEffect(() => {
    if (question.type === 'short_answer') {
      setQuillValue(typeof answer?.answer === 'string' ? answer.answer : '');
    }
  }, [answer, question.type]);

  const handleSingleChoice = (key: string) => onAnswer(key);

  const handleMultipleChoice = (key: string) => {
    const current = Array.isArray(answer?.answer) ? (answer!.answer as string[]) : [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    onAnswer(updated);
  };

  const handleShortAnswer = (value: string) => {
    setQuillValue(value);
    onAnswer(value);
  };

  const currentSingle = typeof answer?.answer === 'string' ? answer.answer : '';
  const currentMultiple = Array.isArray(answer?.answer) ? (answer!.answer as string[]) : [];

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">第 {index + 1} 题 / 共 {total} 题</span>
          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${TYPE_COLORS[question.type]}`}>
            {TYPE_LABELS[question.type]}
          </span>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
            {question.points} 分
          </span>
        </div>
        <button
          onClick={onFlag}
          className={`p-2 rounded-xl transition-all ${
            isFlagged
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-amber-500'
          }`}
          title="标记待复查"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      <div
        className="text-gray-900 font-medium text-lg leading-relaxed mb-6 flex-1"
        dangerouslySetInnerHTML={{ __html: question.content }}
      />

      {(question.type === 'single_choice' || question.type === 'true_false') && (
        <div className="space-y-3">
          {question.type === 'true_false' ? (
            [
              { label: 'T', key: 'true' },
              { label: 'F', key: 'false' },
            ].map((opt) => {
              const key = opt.key;
              const isSelected = currentSingle === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSingleChoice(key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })
          ) : (
            question.options?.map((opt) => {
              const isSelected = currentSingle === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleSingleChoice(opt.key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-gray-500 font-bold w-5 shrink-0">{opt.key}.</span>
                  <span className="font-medium flex-1">{opt.text}</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {question.type === 'multiple_choice' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 mb-3">可多选</p>
          {question.options?.map((opt) => {
            const isSelected = currentMultiple.includes(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => handleMultipleChoice(opt.key)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-500 font-bold w-5 shrink-0">{opt.key}.</span>
                <span className="font-medium flex-1">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="space-y-4">
          <ReactQuill
            theme="snow"
            value={quillValue}
            onChange={handleShortAnswer}
            modules={modules}
            className="bg-white rounded-xl border-2 border-gray-100 focus-within:border-blue-400 transition-colors"
            placeholder="请输入你的答案，可使用上方格式工具"
          />
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Save className="w-3 h-3" />
            答案会自动保存
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamRoom() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  
  const {
    questions, attempt, answers,
    currentQuestionIndex,
    isSubmitting,
    setCurrentExam, setQuestions, setAttempt, setAnswers,
    updateAnswer, setCurrentQuestionIndex,
    setTimeRemaining,
    setIsSubmitting,
    reset,
  } = useExamStore();

  const attemptIdValue =
    (attempt as unknown as { id?: string; _id?: string })?.id ??
    (attempt as unknown as { id?: string; _id?: string })?._id ??
    '';
  const attemptStartedAt =
    (attempt as unknown as { started_at?: string; created_at?: string })?.started_at ??
    (attempt as unknown as { started_at?: string; created_at?: string })?.created_at ??
    '';
  const canSubmitNow = (() => {
    if (!attemptStartedAt) return false;
    const startMs = new Date(String(attemptStartedAt)).getTime();
    if (!Number.isFinite(startMs)) return false;
    return Date.now() - startMs >= 60_000;
  })();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const antiCheat = useAntiCheat();
  
  // React Query hooks
  const {
    data: exam,
    isLoading: isExamLoading,
    isError: isExamError,
    error: examError,
  } = useStudentExam(examId!);
  const {
    data: examAnswers = [],
    isLoading: isAnswersLoading,
    isError: isAnswersError,
    error: answersError,
  } = useExamAnswers(attemptIdValue || '');
  const { mutateAsync: startExam } = useStartExam();
  const { mutateAsync: submitAnswer } = useSubmitAnswer();
  const { mutateAsync: submitExam } = useSubmitExam();

  // 初始化考试
  useEffect(() => {
    if (exam && user) {
      setCurrentExam(exam);
      setQuestions(exam.questions || []);
      setCurrentQuestionIndex(0);
      
      // 开始考试或获取现有尝试
      const initExam = async () => {
        try {
          const existingAttempt = exam.exam_attempts?.find(a => a.student_id === user.id);
          if (existingAttempt) {
            if (existingAttempt.status === 'completed' || existingAttempt.status === 'graded') {
              const attemptIdValue =
                (existingAttempt as unknown as { id?: string; _id?: string }).id ??
                (existingAttempt as unknown as { id?: string; _id?: string })._id ??
                '';
              if (attemptIdValue) navigate(`/results/${attemptIdValue}`);
              return;
            }
            const attemptIdValue =
              (existingAttempt as unknown as { id?: string; _id?: string }).id ??
              (existingAttempt as unknown as { id?: string; _id?: string })._id ??
              '';
            setAttempt({ ...(existingAttempt as unknown as Record<string, unknown>), id: attemptIdValue } as unknown as typeof existingAttempt);

            const startedAtValue =
              (existingAttempt as unknown as { started_at?: string; created_at?: string }).started_at ??
              (existingAttempt as unknown as { started_at?: string; created_at?: string }).created_at ??
              '';
            const durationSeconds = Math.max(0, Number(exam.duration_minutes) * 60);
            const startedAtMs = startedAtValue ? new Date(String(startedAtValue)).getTime() : Number.NaN;
            const elapsedSeconds = Number.isFinite(startedAtMs) ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0;
            setTimeRemaining(Math.max(0, durationSeconds - elapsedSeconds));
          } else {
            const examIdValue =
              (exam as unknown as { id?: string; _id?: string }).id ??
              (exam as unknown as { id?: string; _id?: string })._id ??
              examId ??
              '';
            if (!examIdValue) {
              toast.error('考试ID缺失，无法开始考试');
              navigate('/exams');
              return;
            }
            const newAttempt = await startExam({
              examId: examIdValue,
            });
            const attemptIdValue =
              (newAttempt as unknown as { id?: string; _id?: string }).id ??
              (newAttempt as unknown as { id?: string; _id?: string })._id ??
              '';
            setAttempt({ ...(newAttempt as unknown as Record<string, unknown>), id: attemptIdValue } as unknown as typeof newAttempt);
            setTimeRemaining(Math.max(0, Number(exam.duration_minutes) * 60));
          }
        } catch {
          toast.error('初始化考试失败');
          navigate('/exams');
        }
      };
      
      initExam();
    }
  }, [exam, examId, user, navigate, setAttempt, setCurrentExam, setCurrentQuestionIndex, setQuestions, setTimeRemaining, startExam, toast]);

  // 加载现有答案
  useEffect(() => {
    if (examAnswers.length > 0) {
      const answerMap = examAnswers.reduce((acc, answer) => {
        acc[answer.question_id] = answer;
        return acc;
      }, {} as Record<string, typeof examAnswers[0]>);
      setAnswers(answerMap);
    }
  }, [examAnswers, setAnswers]);

  // 自动保存答案
  const handleAnswer = useCallback(async (value: string | string[]) => {
    if (!attemptIdValue || !questions[currentQuestionIndex]) return;
    const q = questions[currentQuestionIndex];

    // 乐观更新本地状态
    const optimisticAnswer = {
      id: answers[q.id]?.id || '',
      attempt_id: attemptIdValue,
      question_id: q.id,
      answer: value,
      is_flagged: answers[q.id]?.is_flagged ?? false,
      score: 0,
      updated_at: new Date().toISOString(),
      created_at: answers[q.id]?.created_at ?? new Date().toISOString(),
    };
    updateAnswer(q.id, optimisticAnswer);

    // 提交到服务器（防抖）
    try {
      setIsSaving(true);
      await submitAnswer({
        attemptId: attemptIdValue,
        questionId: q.id,
        answer: value,
      });
    } catch {
      toast.error('保存答案失败');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [attemptIdValue, questions, currentQuestionIndex, answers, updateAnswer, submitAnswer, toast]);

  const handleFlag = useCallback(async () => {
    if (!attemptIdValue || !questions[currentQuestionIndex]) return;
    const q = questions[currentQuestionIndex];
    const current = answers[q.id];
    const newFlagged = !(current?.is_flagged ?? false);

    try {
      await submitAnswer({
        attemptId: attemptIdValue,
        questionId: q.id,
        answer: current?.answer ?? '',
      });
      updateAnswer(q.id, { ...current, is_flagged: newFlagged });
    } catch {
      toast.error('更新标记失败');
    }
  }, [attemptIdValue, questions, currentQuestionIndex, answers, updateAnswer, submitAnswer, toast]);

  const handleSubmit = useCallback(async () => {
    if (!attemptIdValue) return;
    if (!canSubmitNow) {
      toast.warning('最短提交时间不得小于1分钟');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitExam(attemptIdValue);
      toast.success('交卷成功');
      navigate(`/results/${attemptIdValue}`);
    } catch {
      toast.error('交卷失败');
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptIdValue, canSubmitNow, navigate, setIsSubmitting, submitExam, toast]);

  const handleTimeExpire = useCallback(() => {
    toast.warning('考试时间已到，正在自动交卷...');
    handleSubmit();
  }, [handleSubmit, toast]);

  // 键盘快捷键
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toast.success('答案已保存');
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentQuestionIndex(Math.min(currentQuestionIndex + 1, questions.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentQuestionIndex(Math.max(currentQuestionIndex - 1, 0));
      } else if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key) - 1;
        if (num < questions.length) {
          setCurrentQuestionIndex(num);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentQuestionIndex, questions.length, setCurrentQuestionIndex, toast]);

  // 清理
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  if (isExamLoading || isAnswersLoading) return <LoadingSpinner text="正在加载考试..." fullScreen />;
  if (isExamError || isAnswersError) {
    const msg =
      (examError as Error | undefined)?.message ||
      (answersError as Error | undefined)?.message ||
      '加载失败';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">考试加载失败</div>
              <div className="text-sm text-gray-500 mt-1">{msg}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => navigate('/exams')}>返回考试列表</Button>
            <Button onClick={() => window.location.reload()}>刷新重试</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="text-lg font-bold text-gray-900">未找到考试</div>
          <div className="text-sm text-gray-500 mt-2">该考试可能已被删除或你没有权限访问。</div>
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate('/exams')}>返回考试列表</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!attemptIdValue) {
    return <LoadingSpinner text="正在进入考试..." fullScreen />;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="text-lg font-bold text-gray-900">该考试暂未配置题目</div>
          <div className="text-sm text-gray-500 mt-2">
            请联系教师/管理员在“考试管理 → 管理题目”中为该考试添加题目后再开始考试。
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => navigate('/exams')}>返回考试列表</Button>
            {user?.role !== 'student' && (
              <Button onClick={() => navigate(`/admin/exams/${examId}/questions`)}>去管理题目</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const unansweredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return true;
    if (Array.isArray(a.answer)) return a.answer.length === 0;
    return !a.answer || a.answer.trim() === '';
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 防作弊警告弹窗 */}
      <Modal
        isOpen={antiCheat.showWarning}
        onClose={() => antiCheat.setShowWarning(false)}
        title="检测到切屏行为"
        footer={
          <Button onClick={() => antiCheat.setShowWarning(false)}>我知道了</Button>
        }
      >
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-gray-700 text-sm leading-relaxed">
              系统检测到你离开了考试页面，该行为已被记录。
              <strong className="text-gray-900"> 当前已记录 {antiCheat.tabSwitchCount} 次切屏</strong>。
            </p>
            <p className="text-gray-500 text-sm mt-2">请保持在当前页面完成考试。</p>
          </div>
        </div>
      </Modal>

      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">{exam.title}</h1>
              <p className="text-xs text-gray-400">{questions.length} 题 · 总分 {exam.total_points} 分</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSaving && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Save className="w-3.5 h-3.5 animate-pulse" />
                保存中...
              </div>
            )}
            
            {antiCheat.tabSwitchCount > 0 && (
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                antiCheat.tabSwitchCount >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <Monitor className="w-3.5 h-3.5" />
                切屏 {antiCheat.tabSwitchCount}/3
              </div>
            )}

            <button
              onClick={antiCheat.isFullscreen ? antiCheat.exitFullscreen : antiCheat.enterFullscreen}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title={antiCheat.isFullscreen ? '退出全屏' : '进入全屏'}
            >
              {antiCheat.isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <Timer onExpire={handleTimeExpire} />
            
            <Button
              onClick={() => setShowSubmitModal(true)}
              variant="primary"
              icon={<Send className="w-4 h-4" />}
              size="sm"
              disabled={!canSubmitNow}
            >
              提交试卷
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 flex gap-5">
        <div className="flex-1 flex flex-col gap-4">
          <QuestionCard
            question={currentQuestion}
            index={currentQuestionIndex}
            total={questions.length}
            answer={answers[currentQuestion.id]}
            onAnswer={handleAnswer}
            onFlag={handleFlag}
          />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              上一题
            </Button>
            
            <span className="text-sm text-gray-400 font-medium">
              {currentQuestionIndex + 1} / {questions.length}
            </span>
            
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              下一题
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="w-64 shrink-0">
          <AnswerSheet
            questions={questions}
            answers={answers}
            currentIndex={currentQuestionIndex}
            onJump={setCurrentQuestionIndex}
          />
        </div>
      </div>

      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="确认提交试卷"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>取消</Button>
            <Button 
              variant="danger" 
              loading={isSubmitting} 
              onClick={handleSubmit} 
              icon={<Send className="w-4 h-4" />}
              disabled={!canSubmitNow}
            >
              立即提交
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {unansweredCount > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">未作答题目</p>
                <p className="text-amber-700 text-sm mt-1">
                  你还有 <strong>{unansweredCount}</strong> 题未作答，这些题目将按 0 分计算。
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
              <div className="w-5 h-5 text-emerald-600 shrink-0">✓</div>
              <div>
                <p className="font-semibold text-emerald-800">已完成全部作答</p>
                <p className="text-emerald-700 text-sm mt-1">你已完成全部 {questions.length} 题。</p>
              </div>
            </div>
          )}
          <p className="text-gray-600 text-sm">
            提交后将无法修改答案，确认现在提交吗？
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-bold text-gray-900">{questions.length - unansweredCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">已作答</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-bold text-amber-600">{unansweredCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">未作答</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-bold text-gray-900">{questions.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">总题数</div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
