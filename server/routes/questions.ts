import express from 'express';
import { auth, authorize, AuthRequest } from '../middleware/auth';
import { Question } from '../models/Question';
import { ExamQuestion } from '../models/ExamQuestion';

const router = express.Router();

// 获取题库 (教师/管理员)
router.get('/', auth, authorize(['teacher', 'admin']), async (req: AuthRequest, res) => {
  try {
    const questions = await Question.find().sort({ created_at: -1 }).lean({ virtuals: true });
    res.json(questions);
  } catch {
    res.status(500).json({ error: '获取题库失败' });
  }
});

// 获取某个考试的题目 (教师/管理员可获取全部包括答案，学生在考试接口已经处理过了)
router.get('/exam/:examId', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const examQuestions = await ExamQuestion.find({ exam_id: req.params.examId })
      .populate('question_id')
      .sort({ order_index: 1 });

    const questions = examQuestions
      .map((eq) => {
        const qDoc = eq.question_id as unknown as { toObject?: (opts?: unknown) => Record<string, unknown> };
        const qObj = typeof qDoc?.toObject === 'function' ? qDoc.toObject({ virtuals: true }) : (qDoc as unknown as Record<string, unknown>);
        const id = typeof qObj?.id === 'string' ? qObj.id : typeof qObj?._id === 'string' ? (qObj._id as string) : '';
        const normalized = { ...qObj, id };
        delete (normalized as Record<string, unknown>)._id;
        delete (normalized as Record<string, unknown>).__v;

        return {
          ...(normalized as Record<string, unknown>),
          points: eq.points,
          order_index: eq.order_index,
        };
      })
      .filter((q) => typeof q.id === 'string' && q.id.length > 0);

    res.json(questions);
  } catch {
    res.status(500).json({ error: '获取题目失败' });
  }
});

// 批量创建或更新题目 (教师/管理员)
router.post('/batch', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const questionsData = req.body;
    if (!Array.isArray(questionsData)) {
      return res.status(400).json({ error: '请求数据格式不正确' });
    }

    const savedQuestions = [];
    for (const q of questionsData) {
      if (q.id || q._id) {
        // 更新现有题目
        const updated = await Question.findByIdAndUpdate(
          q.id || q._id, 
          q, 
          { new: true, runValidators: true }
        );
        if (updated) savedQuestions.push(updated);
      } else {
        // 创建新题目
        const newQuestion = new Question(q);
        await newQuestion.save();
        savedQuestions.push(newQuestion);
      }
    }
    
    res.status(201).json(savedQuestions);
  } catch (error) {
    console.error('保存题目失败:', error);
    res.status(500).json({ error: '保存题目失败' });
  }
});

// 删除题目
router.delete('/:id', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: '题目删除成功' });
  } catch {
    res.status(500).json({ error: '删除题目失败' });
  }
});

export default router;
