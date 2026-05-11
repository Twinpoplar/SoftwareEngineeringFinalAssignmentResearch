import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import * as katex from 'katex';
import { QuillEditor } from '../../components/common/QuillEditor';
import {
  useBatchImportQuestions,
  useCreateQuestion,
  useDeleteQuestion,
  useQuestionBank,
  useSubjects,
  useUpdateQuestion,
} from '../../queries/questionBankQueries';
import { useToast } from '../../hooks/useToast';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { TikuAdapter } from '../../components/tikuAdapter/TikuAdapter';
import { uploadImageDataUrl } from '../../api/uploads';
import type { Question } from '../../api/questionBank';

import 'quill/dist/quill.snow.css';
import 'katex/dist/katex.min.css';

const optionSchema = z.object({
  key: z.string(),
  text: z.string(),
});

const questionSchema = z.object({
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'short_answer']),
  content: z.string().min(5, '题目内容至少 5 个字符'),
  points: z.coerce.number().min(1, '分值至少为 1').max(100, '分值不能超过 100'),
  subject: z.string().min(1, '请选择学科'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string().optional(),
  options: z.array(optionSchema),
  correctAnswerText: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;
type QuestionType = Question['type'];

const DEFAULT_OPTIONS = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题',
};

const DIFFICULTY_LABELS: Record<Question['difficulty'], string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

function getDefaultFormValues(): QuestionFormValues {
  return {
    type: 'single_choice',
    content: '',
    points: 5,
    subject: '',
    difficulty: 'medium',
    explanation: '',
    options: DEFAULT_OPTIONS,
    correctAnswerText: '',
  };
}

function questionToFormValues(question: Question): QuestionFormValues {
  return {
    type: question.type,
    content: question.content,
    points: question.points,
    subject: question.subject,
    difficulty: question.difficulty,
    explanation: question.explanation ?? '',
    options: question.options && question.options.length > 0 ? question.options : DEFAULT_OPTIONS,
    correctAnswerText: Array.isArray(question.correct_answer)
      ? question.correct_answer.join(',')
      : String(question.correct_answer ?? ''),
  };
}

export default function QuestionBank() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAdapterOpen, setIsAdapterOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<Question | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [pendingRemoveOptionIndex, setPendingRemoveOptionIndex] = useState<number | null>(null);
  const [showConvertToTFConfirm, setShowConvertToTFConfirm] = useState(false);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema) as unknown as Resolver<QuestionFormValues>,
    defaultValues: getDefaultFormValues(),
  });

  const watchedType = form.watch('type');
  const watchedOptions = form.watch('options');

  const { data: questionBankData, isLoading } = useQuestionBank({
    page,
    limit: 20,
    search,
    subject: subjectFilter || undefined,
    type: typeFilter || undefined,
    difficulty: difficultyFilter || undefined,
  });
  const { data: subjectsData } = useSubjects();
  const createQuestionMutation = useCreateQuestion();
  const updateQuestionMutation = useUpdateQuestion();
  const deleteQuestionMutation = useDeleteQuestion();
  const batchImportMutation = useBatchImportQuestions();

  const questions = questionBankData?.questions ?? [];
  const pagination = questionBankData?.pagination;
  const subjects = subjectsData?.subjects ?? [];

  const inputClassName =
    'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500';

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [latexOptionIndex, setLatexOptionIndex] = useState<number | null>(null);
  const [latexValue, setLatexValue] = useState('');

  useEffect(() => {
    (window as unknown as { katex?: unknown }).katex = katex;
  }, []);

  const readFileAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const { url } = await uploadImageDataUrl(dataUrl);
    toast.success('图片已插入题干');
    return url;
  }, [readFileAsDataUrl, toast]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    form.reset(getDefaultFormValues());
    setIsEditorOpen(true);
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    form.reset(questionToFormValues(question));
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingQuestion(null);
    form.reset(getDefaultFormValues());
  };

  const normalizeCorrectAnswer = (values: QuestionFormValues): string | string[] => {
    const raw = (values.correctAnswerText ?? '').trim();

    if (values.type === 'multiple_choice') {
      return raw
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
    }

    if (values.type === 'true_false') {
      return raw === 'false' ? 'false' : 'true';
    }

    return raw.toUpperCase();
  };

  const buildOptions = (values: QuestionFormValues) => {
    if (values.type === 'single_choice' || values.type === 'multiple_choice') {
      return values.options.filter((option) => option.text.trim() !== '');
    }
    return [];
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        type: values.type,
        content: values.content,
        points: values.points,
        subject: values.subject,
        difficulty: values.difficulty,
        explanation: values.explanation || '',
        options: buildOptions(values),
        correct_answer: normalizeCorrectAnswer(values),
      };

      if (editingQuestion) {
        await updateQuestionMutation.mutateAsync({ id: editingQuestion.id, data: payload });
        toast.success('题目已更新');
      } else {
        await createQuestionMutation.mutateAsync(payload);
        toast.success('题目已创建');
      }

      closeEditor();
    } catch {
      toast.error('保存题目失败');
    }
  });

  const handleDelete = async (question: Question) => {
    setPendingDeleteQuestion(question);
    setDeleteConfirmStep(1);
  };

  const executeDeleteQuestion = async () => {
    if (!pendingDeleteQuestion) return;
    try {
      const result = await deleteQuestionMutation.mutateAsync(pendingDeleteQuestion.id);
      toast.success(result?.message || '题目已删除');
    } catch (error) {
      toast.error(`删除题目失败：${(error as Error).message}`);
    } finally {
      setPendingDeleteQuestion(null);
      setDeleteConfirmStep(1);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question-bank-page-${page}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('当前页题目已导出');
  };

  const handleAdapterImport = async (items: Omit<Question, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const result = await batchImportMutation.mutateAsync(items);
      toast.success(`导入完成：成功 ${result.created} 题，失败 ${result.errors.length} 题`);
      setIsAdapterOpen(false);
    } catch (error) {
      toast.error(`导入失败：${(error as Error).message}`);
    }
  };

  const setOptionText = (index: number, text: string) => {
    const nextOptions = [...watchedOptions];
    nextOptions[index] = { ...nextOptions[index], text };
    form.setValue('options', nextOptions, { shouldValidate: true });
  };

  const openLatexModal = (index: number) => {
    setLatexOptionIndex(index);
    setLatexValue('');
  };

  const closeLatexModal = () => {
    setLatexOptionIndex(null);
    setLatexValue('');
  };

  const normalizeAnswerKeyText = (raw: string) =>
    raw
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

  const rekeyOptions = (options: Array<{ key: string; text: string }>) =>
    options.map((opt, idx) => ({ ...opt, key: String.fromCharCode(65 + idx) }));

  const removeOptionAt = (index: number) => {
    const currentOptions = watchedOptions;
    const next = currentOptions.filter((_, i) => i !== index);

    if (next.length < 3) {
      setShowConvertToTFConfirm(true);
      return false;
    }

    const rekeyed = rekeyOptions(next);
    const oldAnswerText = String(form.getValues('correctAnswerText') ?? '').trim().toUpperCase();

    if (watchedType === 'multiple_choice') {
      const selectedOldKeys = normalizeAnswerKeyText(oldAnswerText);
      const mappedKeys = selectedOldKeys
        .map((k) => currentOptions.findIndex((opt) => opt.key.toUpperCase() === k))
        .filter((i) => i >= 0 && i !== index)
        .map((oldIndex) => (oldIndex > index ? oldIndex - 1 : oldIndex))
        .map((newIndex) => rekeyed[newIndex]?.key)
        .filter(Boolean);
      form.setValue('correctAnswerText', mappedKeys.join(','), { shouldValidate: true });
    } else if (watchedType === 'single_choice') {
      const oldIndex = currentOptions.findIndex((opt) => opt.key.toUpperCase() === oldAnswerText);
      if (oldIndex === index) {
        form.setValue('correctAnswerText', '', { shouldValidate: true });
      } else if (oldIndex >= 0) {
        const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
        form.setValue('correctAnswerText', rekeyed[newIndex]?.key ?? '', { shouldValidate: true });
      }
    }

    form.setValue('options', rekeyed, { shouldValidate: true });
    return true;
  };

  const insertLatexIntoOption = () => {
    if (latexOptionIndex === null) return;
    const latex = latexValue.trim();
    if (!latex) return;
    const next = `${watchedOptions[latexOptionIndex]?.text ?? ''}\\(${latex}\\)`;
    setOptionText(latexOptionIndex, next);
    closeLatexModal();
  };

  if (isLoading) {
    return <LoadingSpinner text="题库加载中..." fullScreen />;
  }

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="题库管理"
          subtitle={`当前共有 ${pagination?.total ?? 0} 道题目`}
          icon={<BookOpen className="h-6 w-6" />}
          action={
            <div className="flex flex-wrap gap-3">
              {/*<Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
                导出题目
              </Button>
              <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => setIsAdapterOpen(true)}>
                题库适配器
              </Button>*/}
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                新建题目
              </Button>
            </div>
          }
        />

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="搜索题目内容"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
              className={inputClassName}
            >
              <option value="">全部学科</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value);
              }}
              className={inputClassName}
            >
              <option value="">全部题型</option>
              <option value="single_choice">单选题</option>
              <option value="multiple_choice">多选题</option>
              <option value="true_false">判断题</option>
              <option value="short_answer">简答题</option>
            </select>

            <select
              value={difficultyFilter}
              onChange={(event) => {
                setPage(1);
                setDifficultyFilter(event.target.value);
              }}
              className={inputClassName}
            >
              <option value="">全部难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
              暂无题目，先创建一道题试试吧。
            </div>
          ) : (
            questions.map((question) => (
              <div key={question.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {TYPE_LABELS[question.type]}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {question.subject}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {DIFFICULTY_LABELS[question.difficulty]}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {question.points} 分
                  </span>
                </div>

                <div className="mb-4 text-sm leading-6 text-gray-800">
                  <div dangerouslySetInnerHTML={{ __html: question.content }} />
                </div>

                {question.options && question.options.length > 0 && (
                  <div className="mb-4 grid gap-2 md:grid-cols-2">
                    {question.options.map((option) => {
                      const isCorrect = Array.isArray(question.correct_answer)
                        ? question.correct_answer.includes(option.key)
                        : question.correct_answer === option.key;

                      return (
                        <div
                          key={option.key}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            isCorrect
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="mr-2 font-semibold">{option.key}.</span>
                          {option.text}
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.explanation && (
                  <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    解析：{question.explanation}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => openEditModal(question)}>
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => handleDelete(question)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              上一页
            </Button>
            <span className="text-sm text-gray-500">
              第 {pagination.page} / {pagination.pages} 页
            </span>
            <Button
              variant="outline"
              disabled={page >= pagination.pages}
              onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
            >
              下一页
            </Button>
          </div>
        )}

        <Modal
          isOpen={isEditorOpen}
          onClose={closeEditor}
          title={editingQuestion ? '编辑题目' : '新建题目'}
          size="xl"
          footer={
            <>
              <Button variant="outline" onClick={closeEditor}>
                取消
              </Button>
              <Button
                loading={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                onClick={onSubmit}
              >
                保存
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">题型</label>
              <select {...form.register('type')} className={inputClassName}>
                <option value="single_choice">单选题</option>
                <option value="multiple_choice">多选题</option>
                <option value="true_false">判断题</option>
                <option value="short_answer">简答题</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">学科</label>
              <input {...form.register('subject')} className={inputClassName} placeholder="如：数学" />
              {form.formState.errors.subject && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">难度</label>
              <select {...form.register('difficulty')} className={inputClassName}>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">分值</label>
              <input type="number" {...form.register('points')} className={inputClassName} />
              {form.formState.errors.points && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.points.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">题目内容</label>
            <Controller
              control={form.control}
              name="content"
              render={({ field }) => (
                <QuillEditor
                  value={field.value}
                  onChange={field.onChange}
                  uploadImage={uploadImage}
                  onUploadStateChange={setIsUploadingImage}
                  placeholder="请输入题目内容（支持粘贴/上传图片，支持 LaTeX：\\( ... \\) 或 $$ ... $$，也可点工具栏公式按钮）"
                />
              )}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>支持粘贴图片或点击工具栏图片按钮上传</span>
              <span>{isUploadingImage ? '图片上传中...' : ''}</span>
            </div>
            {form.formState.errors.content && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.content.message}</p>
            )}
          </div>

          {(watchedType === 'single_choice' || watchedType === 'multiple_choice') && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">选项</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextKey = String.fromCharCode(65 + watchedOptions.length);
                    form.setValue('options', [...watchedOptions, { key: nextKey, text: '' }]);
                  }}
                >
                  添加选项
                </Button>
              </div>

              {watchedOptions.map((option, index) => (
                <div key={option.key} className="flex items-center gap-3">
                  <div className="w-10 rounded-lg bg-gray-100 py-2 text-center text-sm font-semibold text-gray-600">
                    {option.key}
                  </div>
                  <input
                    value={option.text}
                    onChange={(event) => setOptionText(index, event.target.value)}
                    className={inputClassName}
                    placeholder={`选项 ${option.key}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPendingRemoveOptionIndex(index);
                    }}
                  >
                    移除
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">正确答案</label>
            {watchedType === 'true_false' ? (
              <select {...form.register('correctAnswerText')} className={inputClassName}>
                <option value="true">T</option>
                <option value="false">F</option>
              </select>
            ) : (
              <input
                {...form.register('correctAnswerText')}
                className={inputClassName}
                placeholder={watchedType === 'multiple_choice' ? '如：A,B' : '如：A'}
              />
            )}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">答案解析</label>
            <textarea
              rows={3}
              {...form.register('explanation')}
              className={inputClassName}
              placeholder="可选"
            />
          </div>
        </Modal>

        <Modal
          isOpen={pendingDeleteQuestion !== null}
          onClose={() => {
            setPendingDeleteQuestion(null);
            setDeleteConfirmStep(1);
          }}
          title="确认删除题目"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingDeleteQuestion(null);
                  setDeleteConfirmStep(1);
                }}
              >
                取消
              </Button>
              {deleteConfirmStep === 1 ? (
                <Button onClick={() => setDeleteConfirmStep(2)}>继续</Button>
              ) : (
                <Button variant="danger" onClick={executeDeleteQuestion}>
                  确认删除
                </Button>
              )}
            </>
          }
        >
          <div className="text-sm text-gray-700 space-y-2">
            <p>确认删除题目“{pendingDeleteQuestion?.content.slice(0, 20)}...”吗？</p>
            <p className="text-gray-500">删除/下架后将无法在题库中继续使用。</p>
          </div>
        </Modal>

        <Modal
          isOpen={pendingRemoveOptionIndex !== null}
          onClose={() => setPendingRemoveOptionIndex(null)}
          title="确认移除选项"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setPendingRemoveOptionIndex(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (pendingRemoveOptionIndex === null) return;
                  removeOptionAt(pendingRemoveOptionIndex);
                  setPendingRemoveOptionIndex(null);
                }}
              >
                确认移除
              </Button>
            </>
          }
        >
          <div className="text-sm text-gray-700">
            确认移除选项 {pendingRemoveOptionIndex !== null ? watchedOptions[pendingRemoveOptionIndex]?.key : ''} 吗？
          </div>
        </Modal>

        <Modal
          isOpen={showConvertToTFConfirm}
          onClose={() => setShowConvertToTFConfirm(false)}
          title="选项数量不足"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowConvertToTFConfirm(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  form.setValue('type', 'true_false', { shouldValidate: true });
                  form.setValue('options', [], { shouldValidate: true });
                  form.setValue('correctAnswerText', 'true', { shouldValidate: true });
                  setShowConvertToTFConfirm(false);
                  toast.success('已切换为判断题（T/F）');
                }}
              >
                改为判断题
              </Button>
            </>
          }
        >
          <div className="text-sm text-gray-700">
            单选/多选题至少保留三个选项，继续移除将不满足要求。是否改为判断题（T/F）？
          </div>
        </Modal>

        <Modal
          isOpen={latexOptionIndex !== null}
          onClose={closeLatexModal}
          title="插入 LaTeX"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={closeLatexModal}>
                取消
              </Button>
              <Button onClick={insertLatexIntoOption}>插入</Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="text-sm text-gray-600">请输入 LaTeX（示例：{`\\frac{a}{b}`}）</div>
            <input
              value={latexValue}
              onChange={(e) => setLatexValue(e.target.value)}
              className={inputClassName}
              placeholder="\\frac{a}{b}"
            />
          </div>
        </Modal>

        <Modal isOpen={isAdapterOpen} onClose={() => setIsAdapterOpen(false)} title="题库适配器" size="lg">
          <TikuAdapter onImportQuestions={handleAdapterImport} />
        </Modal>
      </div>
    </Layout>
  );
}
