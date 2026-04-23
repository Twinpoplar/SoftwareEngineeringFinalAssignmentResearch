import express from 'express';
import { auth, authorize, AuthRequest } from '../middleware/auth';
import { Exam } from '../models/Exam';
import { ExamAttempt } from '../models/Attempt';
import { ExamQuestion } from '../models/ExamQuestion';

const router = express.Router();
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const getDocId = (v: unknown) => {
  if (typeof v === 'string') return v;
  if (!isRecord(v)) return '';
  const id = typeof v.id === 'string' ? v.id : '';
  if (id) return id;
  return typeof v._id === 'string' ? (v._id as string) : '';
};

// 获取考试列表 (学生看已发布的，老师/管理员看全部)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const { role, id } = req.user!;
    const filter: Record<string, unknown> = {};
    
    if (role === 'student') {
      filter.is_published = true;
    }

    // 查询所有符合条件的考试
    const exams = await Exam.find(filter).sort({ start_time: 1 }).lean({ virtuals: true });
    
    // 查询当前用户的尝试记录
    const examIds = (exams as unknown[]).map((e) => getDocId(e)).filter(Boolean);
    const attempts =
      role === 'student'
        ? await ExamAttempt.find({ student_id: id }).lean({ virtuals: true })
        : await ExamAttempt.find({ exam_id: { $in: examIds } }).lean({ virtuals: true });
    const normalizedAttempts = (attempts as unknown[]).map((raw) => {
      const a = (raw as Record<string, unknown>) ?? {};
      const attemptId = (typeof a.id === 'string' && a.id) ? a.id : (typeof a._id === 'string' ? (a._id as string) : '');
      const normalized = { ...a, id: attemptId };
      delete (normalized as Record<string, unknown>)._id;
      delete (normalized as Record<string, unknown>).__v;
      return normalized;
    });
    
    // 合并数据：把对应的 attempt 放到 exam 的 exam_attempts 字段里，保持和之前 Supabase 一致的数据结构
    const examsWithAttempts = exams.map(exam => {
      const examId = getDocId(exam);
      const examAttempts = normalizedAttempts.filter((a) => isRecord(a) && a.exam_id === examId);
      return {
        ...exam,
        id: examId || (exam as unknown as { id?: string }).id,
        exam_attempts: examAttempts
      };
    });

    res.json(examsWithAttempts);
  } catch (err) {
    console.error('获取考试列表失败:', err);
    res.status(500).json({ error: '获取考试列表失败' });
  }
});

// 获取考试详情
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean({ virtuals: true });
    if (!exam) return res.status(404).json({ error: '考试不存在' });

    // 查询关联的题目（通过 ExamQuestion 关联表，支持题目复用）
    const examQuestions = await ExamQuestion.find({ exam_id: req.params.id })
      .populate('question_id')
      .sort({ order_index: 1 });

    const questions = examQuestions
      .map((eq) => {
        const qDoc = eq.question_id as unknown as { toObject?: (opts?: unknown) => Record<string, unknown> };
        const qObj = typeof qDoc?.toObject === 'function' ? qDoc.toObject({ virtuals: true }) : (qDoc as unknown as Record<string, unknown>);
        const qId = typeof qObj?.id === 'string' ? qObj.id : typeof qObj?._id === 'string' ? (qObj._id as string) : '';
        if (!qId) return null;
        const normalized = { ...qObj, id: qId };
        delete (normalized as Record<string, unknown>)._id;
        delete (normalized as Record<string, unknown>).__v;

        return {
          ...(normalized as Record<string, unknown>),
          points: eq.points,
          order_index: eq.order_index,
        };
      })
      .filter((q): q is Record<string, unknown> => q !== null);


    const exam_attempts =
      req.user?.role === 'student'
        ? await ExamAttempt.find({ exam_id: req.params.id, student_id: req.user.id }).lean({ virtuals: true })
        : await ExamAttempt.find({ exam_id: req.params.id }).lean({ virtuals: true });

    const normalizedExamAttempts = (exam_attempts as unknown[]).map((raw) => {
      const a = (raw as Record<string, unknown>) ?? {};
      const attemptId = (typeof a.id === 'string' && a.id) ? a.id : (typeof a._id === 'string' ? (a._id as string) : '');
      const normalized = { ...a, id: attemptId };
      delete (normalized as Record<string, unknown>)._id;
      delete (normalized as Record<string, unknown>).__v;
      return normalized;
    });
    
    // 如果是学生，隐藏正确答案
    if (req.user?.role === 'student') {
      questions.forEach(q => {
        delete q.correct_answer;
        delete q.explanation;
        if (q.options) {
          q.options.forEach((opt: { is_correct?: unknown }) => delete opt.is_correct);
        }
      });
    }

    res.json({ ...exam, questions, exam_attempts: normalizedExamAttempts });
  } catch {
    res.status(500).json({ error: '获取考试详情失败' });
  }
});

// 创建考试 (教师/管理员)
router.post('/', auth, authorize(['teacher', 'admin']), async (req: AuthRequest, res) => {
  try {
    const newExam = new Exam({
      ...req.body,
      created_by: req.user!.id
    });
    await newExam.save();
    res.status(201).json(newExam);
  } catch {
    res.status(500).json({ error: '创建考试失败' });
  }
});

// 更新考试 (教师/管理员)
router.put('/:id', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedExam) return res.status(404).json({ error: '考试不存在' });
    res.json(updatedExam);
  } catch {
    res.status(500).json({ error: '更新考试失败' });
  }
});

// 删除考试 (教师/管理员)
router.delete('/:id', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    // 删除该考试与题目的关联以及答题记录（不删除题库题目本身）
    await ExamQuestion.deleteMany({ exam_id: req.params.id });
    await ExamAttempt.deleteMany({ exam_id: req.params.id });
    
    res.json({ message: '考试删除成功' });
  } catch {
    res.status(500).json({ error: '删除考试失败' });
  }
});

export default router;
