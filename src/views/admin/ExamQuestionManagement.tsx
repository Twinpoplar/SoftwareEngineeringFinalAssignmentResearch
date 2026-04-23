import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  BookOpen,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  useExamQuestions, 
  useAddQuestionsToExam, 
  useRemoveQuestionFromExam 
} from '../../queries/examQuestionQueries';
import { useQuestionBank } from '../../queries/questionBankQueries';
import { useExam } from '../../queries/examQueries';
import { useToast } from '../../hooks/useToast';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

type OptionItem = { key: string; text: string };
type ExamQuestionItem = {
  id: string;
  type: string;
  subject: string;
  difficulty: string;
  content: string;
  correct_answer: string | string[];
  exam_points?: number;
  options?: OptionItem[];
  explanation?: string;
};

type BankQuestionItem = {
  id: string;
  type: string;
  subject: string;
  difficulty: string;
  content: string;
  correct_answer: string | string[];
  points: number;
  options?: OptionItem[];
  explanation?: string;
};

export default function ExamQuestionManagement() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // 获取考试信息
  const { data: exam, isLoading: isExamLoading } = useExam(examId!);
  
  // 获取考试题目列表
  const { data: examQuestionsData, isLoading: isExamQuestionsLoading } = useExamQuestions(examId!);
  
  // 获取题库列表（用于选择题目）
  const { data: questionBankData } = useQuestionBank({
    limit: 50, // 显示更多题目便于选择
  });

  // 变异操作
  const addQuestionsMutation = useAddQuestionsToExam();
  const removeQuestionMutation = useRemoveQuestionFromExam();

  const examQuestions = (examQuestionsData?.questions ?? []) as Array<ExamQuestionItem & { _id?: string }>;
  const allQuestions = (questionBankData?.questions ?? []) as Array<BankQuestionItem & { _id?: string }>;
  const getId = (v: unknown) => (v as { id?: string; _id?: string }).id ?? (v as { id?: string; _id?: string })._id ?? '';
  const examQuestionIdSet = new Set(examQuestions.map((q) => getId(q)).filter(Boolean));
  const availableQuestions = allQuestions.filter((q) => !examQuestionIdSet.has(getId(q)));
  const filteredAvailableQuestions = selectedTypeFilter
    ? availableQuestions.filter((q) => q.type === selectedTypeFilter)
    : availableQuestions;

  const handleAddQuestions = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('请选择要添加的题目');
      return;
    }

    try {
      await addQuestionsMutation.mutateAsync({
        examId: examId!,
        questionIds: selectedQuestions,
      });
      
      toast.success(`成功添加 ${selectedQuestions.length} 道题目`);
      setSelectedQuestions([]);
      setShowQuestionSelector(false);
    } catch {
      toast.error('添加题目失败');
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!questionId) {
      toast.error('题目ID缺失，无法移除');
      return;
    }
    if (!confirm('确认从考试中移除这道题目吗？')) return;
    if (!confirm('二次确认：移除后该题将不再出现在本场考试中，确认继续吗？')) return;
    
    try {
      await removeQuestionMutation.mutateAsync({
        examId: examId!,
        questionId
      });
      
      toast.success('题目移除成功');
    } catch (error) {
      toast.error(`移除题目失败：${(error as Error).message}`);
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    if (!questionId) return;
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels = {
      single_choice: '单选题',
      multiple_choice: '多选题',
      true_false: '判断题',
      short_answer: '简答题'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      easy: '简单',
      medium: '中等',
      hard: '困难'
    };
    return labels[difficulty as keyof typeof labels] || difficulty;
  };

  if (isExamLoading || isExamQuestionsLoading) {
    return <LoadingSpinner text="加载考试题目中..." fullScreen />;
  }

  const totalPoints = examQuestions.reduce((sum, q) => sum + (q.exam_points ?? 0), 0);

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title={exam?.title || '考试题目管理'}
          subtitle={`共 ${examQuestions.length} 道题目，总分 ${totalPoints} 分`}
          icon={<BookOpen className="w-6 h-6" />}
          action={
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/admin/exams')} icon={<ArrowLeft className="w-4 h-4" />}>
                返回考试列表
              </Button>
              <Button onClick={() => setShowQuestionSelector(true)} icon={<Plus className="w-4 h-4" />}>
                添加题目
              </Button>
            </div>
          }
        />

        {/* 考试统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">题目数量</p>
                <p className="text-xl font-semibold text-gray-900">{examQuestions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总分</p>
                <p className="text-xl font-semibold text-gray-900">{totalPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">可用题目</p>
                <p className="text-xl font-semibold text-gray-900">{availableQuestions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">状态</p>
                <p className="text-sm font-medium text-gray-900">
                  {examQuestions.length === 0 ? '未配置题目' : '已配置题目'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 当前考试题目列表 */}
        {examQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无题目</h3>
            <p className="text-gray-500 mb-6">这个考试还没有配置任何题目。</p>
            <Button onClick={() => setShowQuestionSelector(true)} icon={<Plus className="w-4 h-4" />}>
              添加题目
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">考试题目列表</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowQuestionSelector(true)}
                >
                  继续添加
                </Button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {examQuestions.map((question, index) => {
                const questionIdValue = getId(question);
                const questionKey = questionIdValue || `${index}-${question.type}-${question.subject}`;
                return (
                <div key={questionKey} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-semibold text-blue-700">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {getQuestionTypeLabel(question.type)}
                        </span>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {question.subject}
                        </span>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {getDifficultyLabel(question.difficulty)}
                        </span>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          {question.exam_points} 分
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-gray-900 font-medium" dangerouslySetInnerHTML={{ __html: question.content }} />
                        
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {question.options.map((opt: OptionItem, optIndex: number) => {
                              const isCorrect = Array.isArray(question.correct_answer)
                                ? question.correct_answer.includes(opt.key)
                                : question.correct_answer === opt.key;
                              return (
                                <div
                                  key={`${opt.key}-${optIndex}`}
                                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                                    isCorrect 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-gray-500'}`}>
                                    {opt.key}.
                                  </span>
                                  <span className="flex-1">{opt.text}</span>
                                  {isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {question.type === 'true_false' && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              question.correct_answer === 'true' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {question.correct_answer === 'true' ? '✓ 正确' : '✗ 错误'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {question.explanation && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>解析：</strong>{question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(questionIdValue)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 题目选择器模态框 */}
        <Modal
          isOpen={showQuestionSelector}
          onClose={() => {
            setShowQuestionSelector(false);
            setSelectedQuestions([]);
            setSelectedTypeFilter('');
          }}
          title="选择题目"
          size="xl"
          footer={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  已选择 {selectedQuestions.length} 道题目
                </span>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowQuestionSelector(false);
                    setSelectedQuestions([]);
                  }}
                >
                  取消
                </Button>
                <Button 
                  onClick={handleAddQuestions}
                  disabled={selectedQuestions.length === 0}
                >
                  添加题目
                </Button>
              </div>
            </div>
          }
        >
          <div className="max-h-96 overflow-y-auto">
            <div className="mb-4">
              <label className="mb-2 block text-sm text-gray-600">按题型筛选</label>
              <select
                value={selectedTypeFilter}
                onChange={(event) => setSelectedTypeFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">全部题型</option>
                <option value="single_choice">单选题</option>
                <option value="multiple_choice">多选题</option>
                <option value="true_false">判断题</option>
                <option value="short_answer">简答题</option>
              </select>
            </div>
            {filteredAvailableQuestions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">暂无可选题目</h4>
                <p className="text-gray-500 mb-4">
                  {selectedTypeFilter ? '当前筛选条件下没有可添加题目。' : '所有题目都已添加到当前考试中。'}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin/questions')}
                >
                  去题库添加新题目
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAvailableQuestions.map((question) => (
                  <div
                    key={getId(question) || `${question.type}-${question.subject}-${question.content}`}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedQuestions.includes(getId(question))
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleQuestionSelection(getId(question))}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(getId(question))}
                        onChange={() => {}} // 空函数，点击由外层div处理
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {getQuestionTypeLabel(question.type)}
                          </span>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {question.subject}
                          </span>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {getDifficultyLabel(question.difficulty)}
                          </span>
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            {question.points} 分
                          </span>
                        </div>
                        
                        <p className="text-gray-900 font-medium mb-2" dangerouslySetInnerHTML={{ __html: question.content }} />
                        
                        {question.options && question.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                            {question.options.slice(0, 2).map((opt: OptionItem, optIndex: number) => (
                              <div key={`${opt.key}-${optIndex}`} className="text-gray-600">
                                {opt.key}. {opt.text}
                              </div>
                            ))}
                            {question.options.length > 2 && (
                              <div className="text-gray-400 text-xs">
                                ...还有 {question.options.length - 2} 个选项
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
