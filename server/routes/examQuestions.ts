import express from 'express';
import { ExamQuestion } from '../models/ExamQuestion';
import { Question } from '../models/Question';
import { auth } from '../middleware/auth';

const router = express.Router();

// 为考试添加题目
router.post('/exams/:examId/questions', auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: '请选择题目' });
    }

    // 验证题目是否存在
    const questions = await Question.find({ 
      _id: { $in: questionIds }, 
      is_active: true 
    });

    if (questions.length !== questionIds.length) {
      return res.status(400).json({ error: '部分题目不存在或已被删除' });
    }

    const pointsByQuestionId = new Map<string, number>();
    questions.forEach((q) => {
      pointsByQuestionId.set(String(q._id), Number(q.points ?? 5));
    });

    // 获取当前考试的最大顺序号
    const maxOrder = await ExamQuestion.findOne({ exam_id: examId })
      .sort({ order_index: -1 })
      .select('order_index');

    const startOrder = maxOrder ? Number((maxOrder as unknown as { order_index?: unknown }).order_index) + 1 : 0;

    // 批量创建考试题目关联（分值严格取题库中题目的 points）
    const examQuestions = questionIds.map((questionId, index) => {
      const matchedPoints = pointsByQuestionId.get(String(questionId));
      if (matchedPoints === undefined) {
        throw new Error(`题目分值未找到: ${String(questionId)}`);
      }
      return {
        exam_id: examId,
        question_id: questionId,
        order_index: startOrder + index,
        points: matchedPoints,
        is_required: true
      };
    });

    await ExamQuestion.insertMany(examQuestions);

    // 更新题目使用统计
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { 
        $inc: { usage_count: 1 },
        $set: { last_used: new Date() }
      }
    );

    res.json({ message: '题目添加成功', count: questionIds.length });
  } catch (error) {
    console.error('添加考试题目失败:', error);
    res.status(500).json({ error: '添加考试题目失败' });
  }
});

// 获取考试的题目列表（带题目详情）
router.get('/exams/:examId/questions', auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [examQuestions, total] = await Promise.all([
      ExamQuestion.find({ exam_id: examId })
        .populate('question_id')
        .sort({ order_index: 1 })
        .skip(skip)
        .limit(Number(limit)),
      ExamQuestion.countDocuments({ exam_id: examId })
    ]);

    const bulkOps: Array<{
      updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> };
    }> = [];

    const questions = examQuestions
      .map((eq) => {
          const qDoc = eq.question_id as unknown as { toObject?: (opts?: unknown) => Record<string, unknown> };
          const qObj = typeof qDoc?.toObject === 'function' ? qDoc.toObject({ virtuals: true }) : (qDoc as unknown as Record<string, unknown>);
          const qId = typeof qObj?.id === 'string' ? qObj.id : typeof qObj?._id === 'string' ? (qObj._id as string) : '';
          if (!qId) return null;

          const normalized = { ...qObj, id: qId };
          delete (normalized as Record<string, unknown>)._id;
          delete (normalized as Record<string, unknown>).__v;

          const desiredPoints = Number((qObj as unknown as { points?: unknown }).points ?? 5);
          const currentPoints = Number((eq as unknown as { points?: unknown }).points);
          if (Number.isFinite(desiredPoints) && desiredPoints !== currentPoints) {
            bulkOps.push({
              updateOne: {
                filter: { _id: String((eq as unknown as { _id?: unknown })._id) },
                update: { $set: { points: desiredPoints } },
              },
            });
          }

          return {
            ...(normalized as Record<string, unknown>),
            exam_points: desiredPoints,
            exam_order: Number((eq as unknown as { order_index?: unknown }).order_index),
            is_required: Boolean((eq as unknown as { is_required?: unknown }).is_required),
          };
        })
        .filter(
          (q): q is Record<string, unknown> & { exam_points: number; exam_order: number; is_required: boolean } => q !== null
        );

    if (bulkOps.length > 0) {
      await ExamQuestion.bulkWrite(bulkOps);
    }

    res.json({
      questions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('获取考试题目失败:', error);
    res.status(500).json({ error: '获取考试题目失败' });
  }
});

// 从考试中移除题目
router.delete('/exams/:examId/questions/:questionId', auth, async (req, res) => {
  try {
    const { examId, questionId } = req.params;

    const result = await ExamQuestion.findOneAndDelete({
      exam_id: examId,
      question_id: questionId
    });

    if (!result) {
      return res.status(404).json({ error: '题目不存在' });
    }

    // 更新题目使用统计
    await Question.findByIdAndUpdate(questionId, {
      $inc: { usage_count: -1 }
    });

    // 重新排序剩余题目
    await ExamQuestion.updateMany(
      { exam_id: examId, order_index: { $gt: result.order_index } },
      { $inc: { order_index: -1 } }
    );

    res.json({ message: '题目移除成功' });
  } catch (error) {
    console.error('移除考试题目失败:', error);
    res.status(500).json({ error: '移除考试题目失败' });
  }
});

// 更新考试题目设置
router.put('/exams/:examId/questions/:questionId', auth, async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const { points, is_required, order_index } = req.body;

    const examQuestion = await ExamQuestion.findOneAndUpdate(
      { exam_id: examId, question_id: questionId },
      { points, is_required, order_index },
      { new: true }
    );

    if (!examQuestion) {
      return res.status(404).json({ error: '题目不存在' });
    }

    res.json(examQuestion);
  } catch (error) {
    console.error('更新考试题目设置失败:', error);
    res.status(500).json({ error: '更新考试题目设置失败' });
  }
});

export default router;
