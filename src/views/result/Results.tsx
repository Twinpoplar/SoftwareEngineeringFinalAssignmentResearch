import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowLeft, Target, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { useExamResults } from '../../queries/resultQueries';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { getScoreColor, getScoreBg, getGrade, formatDuration } from '../../utils/examHelpers';
import type { Question, AttemptAnswer, QuestionOption } from '../../types';

type QuestionWithAnswer = Question & { answer?: AttemptAnswer };

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: results, isLoading } = useExamResults(attemptId!);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) return <LoadingSpinner text="正在加载成绩..." fullScreen />;
  if (!results) return null;

  const { attempt, exam, questions, performanceData } = results as {
    attempt: typeof results.attempt;
    exam: typeof results.exam;
    questions: QuestionWithAnswer[];
    performanceData: Array<{ subject: string; score: number }>;
  };
  const percentage = exam.total_points > 0 ? Math.round((attempt.total_score / exam.total_points) * 100) : 0;
  const passed = attempt.total_score >= exam.pass_score;
  const grade = getGrade(attempt.total_score, exam.total_points);
  const duration = attempt.submitted_at
    ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)
    : exam.duration_minutes;
  const correctCount = questions.filter((q) => q.answer?.is_correct).length;
  const answeredCount = questions.filter((q) => q.answer && q.answer.answer !== null && q.answer.answer !== '').length;
  const wrongCount = Math.max(0, answeredCount - correctCount);

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <PageHeader
          title="考试成绩"
          subtitle={exam.title}
          icon={<Trophy className="w-6 h-6" />}
          action={
            <Button variant="outline" onClick={() => navigate('/exams')} icon={<ArrowLeft className="w-4 h-4" />}>
              返回考试列表
            </Button>
          }
        />

        {/* 成绩概览 */}
        <div className={`rounded-3xl border-2 p-8 mb-8 ${getScoreBg(attempt.total_score, exam.total_points)}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="text-center">
              <div className={`text-8xl font-black ${getScoreColor(attempt.total_score, exam.total_points)} mb-2`}>
                {percentage}%
              </div>
              <div className="text-gray-600 font-medium text-lg mb-4">
                {attempt.total_score} / {exam.total_points} 分
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold ${
                passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {passed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {passed ? '通过' : '未通过'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-gray-900">{grade}</div>
                  <div className="text-sm text-gray-500 mt-1 font-medium">等级</div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-gray-900">{correctCount}</div>
                  <div className="text-sm text-gray-500 mt-1 font-medium">答对</div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-gray-900">{wrongCount}</div>
                  <div className="text-sm text-gray-500 mt-1 font-medium">答错</div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-gray-900">{formatDuration(duration)}</div>
                  <div className="text-sm text-gray-500 mt-1 font-medium">用时</div>
                </div>
              </div>

              <div className="bg-white/60 rounded-2xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">及格分</span>
                  <span className="font-semibold">{exam.pass_score} 分</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">正确率</span>
                  <span className="font-semibold">{questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">提交时间</span>
                  <span className="font-semibold">{dayjs(attempt.submitted_at).format('YYYY年MM月DD日 HH:mm')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 知识点掌握雷达图 */}
        {performanceData && performanceData.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              知识点掌握情况
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performanceData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Radar
                    name="掌握度"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 题目回顾 */}
        {exam.allow_review && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">题目回顾</h2>
            <div className="space-y-4">
              {questions.map((q, i: number) => {
                const isExpanded = expandedIds.has(q.id);
                const hasAnswer = q.answer && q.answer.answer !== null;
                const isCorrect = q.answer?.is_correct ?? false;
                const studentAnswer = q.answer?.answer;

                return (
                  <div
                    key={q.id}
                    className={`bg-gray-50 rounded-2xl border transition-all duration-200 ${
                      isCorrect ? 'border-emerald-200 bg-emerald-50/30' : hasAnswer ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                    }`}
                  >
                    <button
                      className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-white/50 transition-colors"
                      onClick={() => toggleExpand(q.id)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-600' : hasAnswer ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-semibold text-gray-500">第 {i + 1} 题</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            q.type === 'single_choice' ? 'bg-blue-100 text-blue-700' :
                            q.type === 'multiple_choice' ? 'bg-teal-100 text-teal-700' :
                            q.type === 'true_false' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {q.type === 'single_choice'
                              ? '单选题'
                              : q.type === 'multiple_choice'
                                ? '多选题'
                                : q.type === 'true_false'
                                  ? '判断题'
                                  : '简答题'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.content }} />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-bold ${
                          isCorrect ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {q.answer?.score ?? 0}/{q.points} 分
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 space-y-4">
                        {/* 正确答案显示 */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">正确答案</p>
                          {q.type !== 'short_answer' && q.options && q.options.length > 0 ? (
                            <div className="space-y-2">
                          {(q.options ?? []).map((opt: QuestionOption) => {
                                const isCorrectAnswer = Array.isArray(q.correct_answer)
                                  ? q.correct_answer.includes(opt.key)
                                  : q.correct_answer === opt.key;
                                
                                if (isCorrectAnswer) {
                                  return (
                                    <div key={opt.key} className="bg-emerald-100 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                                      <span className="font-bold text-emerald-800">{opt.key}.</span>
                                      <span className="text-emerald-800 flex-1">{opt.text}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          ) : (
                            <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-3 text-emerald-800 font-medium">
                              {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}
                            </div>
                          )}
                        </div>

                        {/* 学生答案显示 */}
                        {hasAnswer && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">你的答案</p>
                            {q.type !== 'short_answer' && (q.options?.length ?? 0) > 0 ? (
                              <div className="space-y-2">
                                {(q.options ?? []).map((opt: QuestionOption) => {
                                  const isSelected = Array.isArray(studentAnswer)
                                    ? studentAnswer.includes(opt.key)
                                    : studentAnswer === opt.key;
                                  const isCorrectAnswer = Array.isArray(q.correct_answer)
                                    ? q.correct_answer.includes(opt.key)
                                    : q.correct_answer === opt.key;
                                  
                                  if (isSelected) {
                                    return (
                                      <div key={opt.key} className={`border rounded-xl p-3 flex items-center gap-3 ${
                                        isCorrectAnswer ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                                      }`}>
                                        {isCorrectAnswer ? 
                                          <CheckCircle className="w-4 h-4 text-emerald-600" /> : 
                                          <XCircle className="w-4 h-4 text-red-500" />
                                        }
                                        <span className="font-bold">{opt.key}.</span>
                                        <span className="flex-1">{opt.text}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            ) : (
                              <div className={`border rounded-xl p-3 ${
                                isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                {String(studentAnswer) || <span className="text-gray-400 italic">未作答</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 解释说明 */}
                        {q.explanation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-widest">解析</p>
                            <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 教师评语 */}
        {attempt.feedback && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              教师评语
            </h3>
            <p className="text-amber-800 leading-relaxed">{attempt.feedback}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
