import express from 'express';
import { auth, authorize, AuthRequest } from '../middleware/auth';
import { ExamAttempt } from '../models/Attempt';
import { Exam } from '../models/Exam';
import { ExamQuestion } from '../models/ExamQuestion';

const router = express.Router();
const normalizeChoice = (v: unknown) => String(v ?? '').trim().toUpperCase();
const normalizeTrueFalse = (v: unknown): 'true' | 'false' => {
  const s = String(v ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y', '对', '正确', '是'].includes(s)) return 'true';
  return 'false';
};

// HTML 剥离并标准化文本
const stripHtml = (html: string): string => {
  if (typeof html !== 'string') return '';
  // 移除 HTML 标签
  let text = html.replace(/<[^>]*>/g, '');
  // 移除多余的空格和换行
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};

// 归一化文本用于对比
const normalizeText = (text: string): string => {
  return stripHtml(text).toLowerCase();
};
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const getDocId = (v: unknown) => {
  if (typeof v === 'string') return v;
  if (!isRecord(v)) return '';
  const id = typeof v.id === 'string' ? v.id : '';
  if (id) return id;
  return typeof v._id === 'string' ? (v._id as string) : '';
};
const normalizeDoc = (v: unknown) => {
  if (!isRecord(v)) return null;
  const id = getDocId(v);
  if (!id) return v;
  const normalized: Record<string, unknown> = { ...v, id };
  delete (normalized as Record<string, unknown>)._id;
  delete (normalized as Record<string, unknown>).__v;
  return normalized;
};

// 开始考试 (学生)
router.post('/start', auth, async (req: AuthRequest, res) => {
  try {
    const { exam_id } = req.body;
    const student_id = req.user!.id;

    // 检查是否已经开始了该考试
    let attempt = await ExamAttempt.findOne({ exam_id, student_id });

    if (!attempt) {
      attempt = new ExamAttempt({
        exam_id,
        student_id,
        status: 'in_progress',
        started_at: new Date(),
        answers: []
      });
      await attempt.save();
    }

    res.status(201).json(attempt);
  } catch (err) {
    console.error('开始考试失败:', err);
    res.status(500).json({ error: '开始考试失败' });
  }
});

// 获取全部已提交记录 (教师/管理员)
router.get('/all', auth, authorize(['teacher', 'admin']), async (req: AuthRequest, res) => {
  try {
    const attempts = await ExamAttempt.find({ status: { $ne: 'in_progress' } })
      .populate('exam_id')
      .populate('student_id')
      .sort({ submitted_at: -1, created_at: -1 })
      .lean({ virtuals: true });

    const normalized = (attempts as unknown[]).map((raw) => {
      const a = (raw as Record<string, unknown>) ?? {};
      const examValue = a.exam_id;
      const studentValue = a.student_id;

      const exam = isRecord(examValue) ? examValue : null;
      const student = isRecord(studentValue) ? studentValue : null;

      const examId = getDocId(exam) || getDocId(examValue);
      const studentId = getDocId(student) || getDocId(studentValue);

      return {
        ...a,
        exam_id: examId,
        student_id: studentId,
        exams: normalizeDoc(exam),
        profiles: student
          ? {
              id: String(student._id),
              email: String(student.email ?? ''),
              full_name: String(student.fullName ?? ''),
              role: String(student.role ?? 'student'),
              student_id: String(student.studentId ?? ''),
              created_at: student.createdAt,
            }
          : null,
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('获取成绩失败:', err);
    res.status(500).json({ error: '获取成绩失败' });
  }
});

// 获取学生所有考试成绩
router.get('/student/:studentId', auth, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;

    if (req.user!.id !== studentId && req.user!.role === 'student') {
      return res.status(403).json({ error: '没有权限查看他人的成绩' });
    }

    const attempts = await ExamAttempt.find({ student_id: studentId, status: { $ne: 'in_progress' } })
      .populate('exam_id')
      .sort({ submitted_at: -1 })
      .lean({ virtuals: true });

    const normalized = (attempts as unknown[]).map((raw) => {
      const a = (raw as Record<string, unknown>) ?? {};
      const examValue = a.exam_id;
      const exam = isRecord(examValue) ? examValue : null;
      const examId = getDocId(exam) || getDocId(examValue);
      return { ...a, exam_id: examId, exams: normalizeDoc(exam) };
    });

    res.json(normalized);
  } catch (err) {
    console.error('获取成绩失败:', err);
    res.status(500).json({ error: '获取成绩失败' });
  }
});

// 获取某次考试的所有学生成绩 (教师/管理员)
router.get('/exam/:examId/results', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const attempts = await ExamAttempt.find({ exam_id: req.params.examId, status: { $ne: 'in_progress' } })
      .populate('exam_id')
      .populate('student_id')
      .sort({ submitted_at: -1 })
      .lean({ virtuals: true });

    const normalized = (attempts as unknown[]).map((raw) => {
      const a = (raw as Record<string, unknown>) ?? {};
      const examValue = a.exam_id;
      const studentValue = a.student_id;

      const exam = isRecord(examValue) ? examValue : null;
      const student = isRecord(studentValue) ? studentValue : null;

      const examId = getDocId(exam) || getDocId(examValue);
      const studentId = getDocId(student) || getDocId(studentValue);

      return {
        ...a,
        exam_id: examId,
        student_id: studentId,
        exams: normalizeDoc(exam),
        profiles: student
          ? {
              id: String(student._id),
              email: String(student.email ?? ''),
              full_name: String(student.fullName ?? ''),
              role: String(student.role ?? 'student'),
              student_id: String(student.studentId ?? ''),
              created_at: student.createdAt,
            }
          : null,
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('获取成绩失败:', err);
    res.status(500).json({ error: '获取成绩失败' });
  }
});

// 获取单条考试记录（放在最后，避免覆盖 /all /student /exam 路由）
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id).populate('exam_id').lean({ virtuals: true });

    if (!attempt) {
      return res.status(404).json({ error: '找不到考试记录' });
    }

    const attemptObj = attempt as unknown as Record<string, unknown>;
    if (attemptObj.student_id !== req.user!.id && req.user!.role === 'student') {
      return res.status(403).json({ error: '没有权限' });
    }

    const examValue = attemptObj.exam_id;
    const exam = isRecord(examValue) ? examValue : null;
    const examId = getDocId(exam) || getDocId(examValue);

    const attemptId = getDocId(attemptObj);
    const normalizedAttempt = attemptId ? { ...attemptObj, id: attemptId } : attemptObj;
    res.json({ ...normalizedAttempt, exam_id: examId, exams: normalizeDoc(exam) });
  } catch (err) {
    console.error('获取考试记录失败:', err);
    res.status(500).json({ error: '获取考试记录失败' });
  }
});

// 提交单个答案
router.post('/:id/answer', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params; // attempt_id
    const { question_id, answer, answer_text } = req.body;
    
    const attempt = await ExamAttempt.findById(id);
    if (!attempt) return res.status(404).json({ error: '找不到考试记录' });
    if (attempt.student_id !== req.user!.id) return res.status(403).json({ error: '没有权限' });
    if (attempt.status !== 'in_progress') return res.status(400).json({ error: '考试已结束，无法提交答案' });

    // 查找该题目是否已经答过
    const existingAnswerIndex = attempt.answers.findIndex(a => a.question_id.toString() === question_id);

    if (existingAnswerIndex !== -1) {
      attempt.answers[existingAnswerIndex].answer = answer;
      attempt.answers[existingAnswerIndex].answer_text = answer_text;
    } else {
      attempt.answers.push({ question_id, answer, answer_text } as unknown as (typeof attempt.answers)[number]);
    }

    await attempt.save();
    res.json(attempt);
  } catch (err) {
    console.error('保存答案失败:', err);
    res.status(500).json({ error: '保存答案失败' });
  }
});

// 交卷并计算分数
router.put('/:id/submit', auth, async (req: AuthRequest, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ error: '找不到考试记录' });
    if (attempt.student_id !== req.user!.id) return res.status(403).json({ error: '没有权限' });
    if (attempt.status !== 'in_progress') return res.status(400).json({ error: '考试已交卷' });

    const exam = await Exam.findById(attempt.exam_id);
    if (!exam) return res.status(404).json({ error: '找不到相关考试' });

    // 获取该考试的所有题目并计算分数
    const examQuestions = await ExamQuestion.find({ exam_id: attempt.exam_id }).populate('question_id');
    const questionMap = new Map<
      string,
      { type: string; correct_answer: unknown; points: number }
    >();

    examQuestions.forEach((eq) => {
      const q = eq.question_id as unknown as { _id?: unknown; type?: unknown; correct_answer?: unknown };
      const qId = typeof q?._id === 'string' ? q._id : typeof (q?._id as { toString?: () => string })?.toString === 'function' ? (q._id as { toString: () => string }).toString() : '';
      if (!qId) return;
      questionMap.set(qId, {
        type: typeof q.type === 'string' ? q.type : '',
        correct_answer: q.correct_answer,
        points: eq.points,
      });
    });

    let totalScore = 0;
    let needsManualGrading = false;

    for (const ans of attempt.answers) {
      const qId = ans.question_id.toString();
      const q = questionMap.get(qId);
      if (q) {
        // 自动批改单选和判断题
        if (q.type === 'single_choice' || q.type === 'true_false') {
          const correct =
            q.type === 'true_false'
              ? normalizeTrueFalse(q.correct_answer)
              : normalizeChoice(q.correct_answer);
          const actual =
            q.type === 'true_false'
              ? normalizeTrueFalse(ans.answer)
              : normalizeChoice(ans.answer);

          if (correct === actual) {
            ans.is_correct = true;
            ans.score = q.points;
            totalScore += q.points;
          } else {
            ans.is_correct = false;
            ans.score = 0;
          }
        }
        // 多选题 (简单全匹配)
        else if (q.type === 'multiple_choice') {
          const correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
          const ansArr = Array.isArray(ans.answer) ? ans.answer : [ans.answer];
          const normCorrect = Array.from(new Set(correctArr.map(normalizeChoice))).sort();
          const normAns = Array.from(new Set(ansArr.map(normalizeChoice))).sort();

          if (normCorrect.length === normAns.length && normCorrect.every((v, i) => v === normAns[i])) {
            ans.is_correct = true;
            ans.score = q.points;
            totalScore += q.points;
          } else {
            ans.is_correct = false;
            ans.score = 0;
          }
        }
        // 简答题 (需要手动批改)
        else if (q.type === 'short_answer') {
          needsManualGrading = true;
          ans.score = 0; // 初始给0分

          // 对简答题答案进行 HTML 剥离和标准化比较
          const studentAnswerText = normalizeText(ans.answer_text || String(ans.answer));
          const correctAnswerText = normalizeText(String(q.correct_answer));

          if (studentAnswerText === correctAnswerText) {
            ans.is_correct = true;
            ans.score = q.points;
            totalScore += q.points;
            needsManualGrading = false; // 自动匹配则无需手动批改
          } else {
            ans.is_correct = false;
            ans.score = 0;
          }
        }
      }
    }

    attempt.status = needsManualGrading ? 'completed' : 'graded';
    attempt.total_score = totalScore;
    attempt.submitted_at = new Date();

    await attempt.save();

    res.json(attempt);
  } catch (err) {
    console.error('交卷失败:', err);
    res.status(500).json({ error: '交卷失败' });
  }
});

export default router;
