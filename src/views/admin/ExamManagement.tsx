import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Plus, Search, Trash2, CreditCard as Edit, GraduationCap, Clock, Users, ToggleLeft, ToggleRight, BarChart3, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAdminExams, useCreateExam, useUpdateExam, useDeleteExam } from '../../queries/adminQueries';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/useToast';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import type { Exam } from '../../types';

const examSchema = z.object({
  title: z.string().min(3, '考试标题至少需要 3 个字符'),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(5).max(480),
  start_time: z.string().min(1, '请选择开始时间'),
  end_time: z.string().min(1, '请选择结束时间'),
  total_points: z.coerce.number().min(1),
  pass_score: z.coerce.number().min(0),
  allow_review: z.boolean(),
  subject: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

type ExamForm = z.infer<typeof examSchema>;

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function InputCls() { return 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all'; }

export default function ExamManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = useState(false);

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExamForm>({
    resolver: zodResolver(examSchema) as unknown as Resolver<ExamForm>,
    defaultValues: {
      duration_minutes: 60,
      total_points: 100,
      pass_score: 60,
      allow_review: true,
      difficulty: 'medium',
    },
  });

  // React Query hooks
  const { data: exams = [], isLoading } = useAdminExams();
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const deleteExamMutation = useDeleteExam();

  // 筛选考试
  const filteredExams = useMemo(() => {
    if (!searchQuery) return exams;
    const query = searchQuery.toLowerCase();
    return exams.filter((exam: Exam) => 
      exam.title.toLowerCase().includes(query) || 
      exam.description?.toLowerCase().includes(query) ||
      exam.subject?.toLowerCase().includes(query)
    );
  }, [exams, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter((e: Exam) => e.is_published).length;
    const active = exams.filter((e: Exam) => {
      const now = dayjs();
      return e.is_published && dayjs(e.start_time).isBefore(now) && dayjs(e.end_time).isAfter(now);
    }).length;
    const completed = exams.filter((e: Exam) => dayjs(e.end_time).isBefore(dayjs())).length;

    const statusData = [
      { name: '进行中', value: active, color: '#10b981' },
      { name: '未开始', value: published - active - completed, color: '#f59e0b' },
      { name: '已结束', value: completed, color: '#6b7280' },
      { name: '草稿', value: total - published, color: '#e5e7eb' },
    ];

    const subjectData = exams.reduce((acc: Record<string, number>, exam: Exam) => {
      const subject = exam.subject || '通用';
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const subjectChartData = Object.entries(subjectData).map(([subject, count]) => ({
      subject,
      count,
    }));

    return {
      total,
      published,
      active,
      completed,
      statusData,
      subjectChartData,
    };
  }, [exams]);

  const openCreate = () => {
    setEditingExam(null);
    reset({
      title: '',
      description: '',
      duration_minutes: 60,
      start_time: dayjs().add(1, 'day').format('YYYY-MM-DDTHH:mm'),
      end_time: dayjs().add(2, 'day').format('YYYY-MM-DDTHH:mm'),
      total_points: 100,
      pass_score: 60,
      allow_review: true,
      subject: '',
      difficulty: 'medium',
    });
    setShowModal(true);
  };

  const openEdit = (exam: Exam) => {
    const examId = (exam as unknown as { id?: string; _id?: string }).id ?? (exam as unknown as { id?: string; _id?: string })._id ?? '';
    setEditingExam({ ...(exam as unknown as Record<string, unknown>), id: examId } as unknown as Exam);
    reset({
      title: exam.title,
      description: exam.description,
      duration_minutes: exam.duration_minutes,
      start_time: dayjs(exam.start_time).format('YYYY-MM-DDTHH:mm'),
      end_time: dayjs(exam.end_time).format('YYYY-MM-DDTHH:mm'),
      total_points: exam.total_points,
      pass_score: exam.pass_score,
      allow_review: exam.allow_review,
      subject: exam.subject || '',
      difficulty: exam.difficulty || 'medium',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: ExamForm) => {
    if (!user) return;
    
    try {
      const payload = {
        ...data,
        description: data.description || '',
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        created_by: user.id,
        is_published: editingExam?.is_published ?? false,
      };

      if (editingExam) {
        const examId =
          (editingExam as unknown as { id?: string; _id?: string }).id ?? (editingExam as unknown as { id?: string; _id?: string })._id ?? '';
        if (!examId) {
          toast.error('考试ID缺失，无法保存');
          return;
        }
        await updateExamMutation.mutateAsync({
          id: examId,
          ...payload,
        });
        toast.success('考试更新成功');
      } else {
        await createExamMutation.mutateAsync(payload);
        toast.success('考试创建成功');
      }
      setShowModal(false);
    } catch {
      toast.error('保存考试失败');
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`确认删除“${exam.title}”吗？该操作会一并删除该考试下的题目关联与成绩记录。`)) return;
    if (!confirm('二次确认：删除后不可恢复，确认继续吗？')) return;
    
    try {
      const examId = (exam as unknown as { id?: string; _id?: string }).id ?? (exam as unknown as { id?: string; _id?: string })._id ?? '';
      if (!examId) {
        toast.error('考试ID缺失，无法删除');
        return;
      }
      await deleteExamMutation.mutateAsync(examId);
      toast.success('考试删除成功');
    } catch {
      toast.error('删除考试失败');
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    try {
      const examId = (exam as unknown as { id?: string; _id?: string }).id ?? (exam as unknown as { id?: string; _id?: string })._id ?? '';
      if (!examId) {
        toast.error('考试ID缺失，无法更新状态');
        return;
      }
      await updateExamMutation.mutateAsync({
        id: examId,
        is_published: !exam.is_published,
      });
      toast.success(exam.is_published ? '考试已取消发布' : '考试发布成功');
    } catch {
      toast.error('更新考试状态失败');
    }
  };

  const getStatus = (exam: Exam) => {
    const now = dayjs();
    if (!exam.is_published) return { label: '草稿', color: 'bg-gray-100 text-gray-600' };
    if (dayjs(exam.start_time).isAfter(now)) return { label: '未开始', color: 'bg-amber-100 text-amber-700' };
    if (dayjs(exam.end_time).isBefore(now)) return { label: '已结束', color: 'bg-gray-100 text-gray-500' };
    return { label: '进行中', color: 'bg-emerald-100 text-emerald-700' };
  };

  const inputCls = InputCls();

  if (isLoading) return <LoadingSpinner text="正在加载考试列表..." fullScreen />;

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="考试管理"
          subtitle="创建、发布并维护你的考试"
          icon={<GraduationCap className="w-6 h-6" />}
          action={
            <div className="flex gap-3">
              {/*<Button variant="outline" onClick={() => setShowStats(!showStats)} icon={<BarChart3 className="w-4 h-4" />}>
                统计面板
              </Button>*/}
              <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                新建考试
              </Button>
            </div>
          }
        />

        {/* 统计面板 */}
        {showStats && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              考试统计
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 状态分布饼图 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">考试状态分布</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {stats.statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 科目分布柱状图 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">学科考试分布</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.subjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div className="bg-blue-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-800 font-medium mt-1">考试总数</div>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-emerald-600">{stats.published}</div>
                <div className="text-sm text-emerald-800 font-medium mt-1">已发布</div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-amber-600">{stats.active}</div>
                <div className="text-sm text-amber-800 font-medium mt-1">进行中</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-gray-600">{stats.completed}</div>
                <div className="text-sm text-gray-800 font-medium mt-1">已结束</div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索考试标题、描述或学科..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">未找到符合条件的考试</h3>
            <p className="text-gray-400 mb-4">你可以先创建一个新的考试。</p>
            <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>创建考试</Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['标题', '时长', '时间段', '总分', '状态', '参与人数', '操作'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest px-5 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExams.map((exam, index) => {
                  const status = getStatus(exam);
                  const participantCount = exam.exam_attempts?.length || 0;
                  const examId = (exam as unknown as { id?: string; _id?: string }).id ?? (exam as unknown as { id?: string; _id?: string })._id ?? '';
                  
                  return (
                    <tr key={examId || `${exam.title}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 text-sm">{exam.title}</div>
                        {exam.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{exam.description}</div>}
                        {exam.subject && (
                          <div className="text-xs text-blue-600 font-medium mt-1">{exam.subject}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {exam.duration_minutes} 分钟
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {exam.difficulty && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              exam.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              exam.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {exam.difficulty === 'easy' ? '简单' : exam.difficulty === 'hard' ? '困难' : '中等'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-gray-500">
                          <div>{dayjs(exam.start_time).format('MM月DD日 HH:mm')}</div>
                          <div className="text-gray-300">–</div>
                          <div>{dayjs(exam.end_time).format('MM月DD日 HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-700 font-medium">{exam.total_points}</div>
                        <div className="text-xs text-gray-400">及格线：{exam.pass_score}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {participantCount}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (!examId) {
                                toast.error('考试ID缺失，无法进入管理页面');
                                return;
                              }
                              navigate(`/admin/exams/${examId}/questions`);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="管理题目"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(exam)}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                            title="编辑考试"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTogglePublish(exam)}
                            className={`p-2 rounded-lg transition-all ${exam.is_published ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={exam.is_published ? '取消发布' : '发布考试'}
                          >
                            {exam.is_published ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(exam)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="删除考试"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingExam ? '编辑考试' : '创建新考试'}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
              <Button loading={createExamMutation.isPending || updateExamMutation.isPending} onClick={handleSubmit(onSubmit)}>
                {editingExam ? '保存修改' : '创建考试'}
              </Button>
            </>
          }
        >
          <form className="space-y-4">
            <FormField label="考试标题" error={errors.title?.message}>
              <input {...register('title')} placeholder="例如：高一数学期中测试" className={inputCls} />
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="学科" error={errors.subject?.message}>
                <input {...register('subject')} placeholder="例如：数学" className={inputCls} />
              </FormField>
              <FormField label="难度" error={errors.difficulty?.message}>
                <select {...register('difficulty')} className={inputCls}>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </FormField>
            </div>

            <FormField label="考试说明（可选）">
              <textarea {...register('description')} rows={2} placeholder="填写考试说明..." className={inputCls + ' resize-none'} />
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="考试时长（分钟）" error={errors.duration_minutes?.message}>
                <input {...register('duration_minutes')} type="number" min={5} max={480} className={inputCls} />
              </FormField>
              <FormField label="总分" error={errors.total_points?.message}>
                <input {...register('total_points')} type="number" min={1} className={inputCls} />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="开始时间" error={errors.start_time?.message}>
                <input {...register('start_time')} type="datetime-local" className={inputCls} />
              </FormField>
              <FormField label="结束时间" error={errors.end_time?.message}>
                <input {...register('end_time')} type="datetime-local" className={inputCls} />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="及格分" error={errors.pass_score?.message}>
                <input {...register('pass_score')} type="number" min={0} className={inputCls} />
              </FormField>
              <FormField label="允许交卷后查看">
                <div className="flex items-center gap-3 h-10">
                  <input {...register('allow_review')} type="checkbox" id="allow_review" className="w-4 h-4 rounded text-blue-600" />
                  <label htmlFor="allow_review" className="text-sm text-gray-600">学生提交后可查看作答详情</label>
                </div>
              </FormField>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
