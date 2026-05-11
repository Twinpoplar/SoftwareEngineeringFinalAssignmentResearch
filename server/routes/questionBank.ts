import express from 'express';
import { Question } from '../models/Question';
import { ExamQuestion } from '../models/ExamQuestion';
import { Exam } from '../models/Exam';
import { auth } from '../middleware/auth';

const router = express.Router();

// 获取题库列表 - 支持分页和筛选
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      subject, 
      type, 
      difficulty, 
      search,
      tags 
    } = req.query;

    type QuestionBankFilter = {
      is_active: boolean;
      subject?: unknown;
      type?: unknown;
      difficulty?: unknown;
      tags?: { $in: string[] };
      $or?: Array<Record<string, unknown>>;
    };

    const filter: QuestionBankFilter = { is_active: true };
    
    if (subject) filter.subject = subject;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (tags) filter.tags = { $in: (tags as string).split(',') };
    
    if (search) {
      filter.$or = [
        { content: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Question.countDocuments(filter)
    ]);

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
    console.error('获取题库列表失败:', error);
    res.status(500).json({ error: '获取题库列表失败' });
  }
});

// 获取学科列表
router.get('/subjects', auth, async (req, res) => {
  try {
    const subjects = await Question.distinct('subject', { is_active: true });
    res.json({ subjects: subjects.sort() });
  } catch (error) {
    console.error('获取学科列表失败:', error);
    res.status(500).json({ error: '获取学科列表失败' });
  }
});

// 获取题目详情
router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: '题目不存在' });
    }
    res.json(question);
  } catch (error) {
    console.error('获取题目详情失败:', error);
    res.status(500).json({ error: '获取题目详情失败' });
  }
});

// 创建新题目
router.post('/', auth, async (req, res) => {
  try {
    const {
      type,
      content,
      points,
      explanation,
      correct_answer,
      subject,
      difficulty,
      options,
      tags
    } = req.body;

    // HTML 剥离并标准化文本
    const stripHtml = (html: string): string => {
      if (typeof html !== 'string') return '';
      let text = html.replace(/<[^>]*>/g, '');
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    };

    // 对简答题答案进行 HTML 清洗
    let finalCorrectAnswer = correct_answer;
    if (type === 'short_answer' && correct_answer) {
      finalCorrectAnswer = stripHtml(String(correct_answer));
    }

    // 验证必填字段
    if (!type || !content || !correct_answer || !subject) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // 验证题型对应的答案格式
    if (type === 'true_false' && !['true', 'false'].includes(correct_answer)) {
      return res.status(400).json({ error: '判断题答案只能是 true 或 false' });
    }

    if ((type === 'single_choice' || type === 'multiple_choice') && !options?.length) {
      return res.status(400).json({ error: '选择题必须提供选项' });
    }

    const question = new Question({
      type,
      content,
      points: points || 5,
      explanation,
      correct_answer: finalCorrectAnswer,
      subject,
      difficulty: difficulty || 'medium',
      options: options || [],
      tags: tags || [],
      created_by: req.user.id
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('创建题目失败:', error);
    res.status(500).json({ error: '创建题目失败' });
  }
});

// 更新题目
router.put('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: '题目不存在' });
    }

    const updateData = { ...req.body };
    delete updateData._id; // 防止更新 _id

    Object.assign(question, updateData);
    await question.save();

    await ExamQuestion.updateMany(
      { question_id: req.params.id },
      { $set: { points: Number(question.points ?? 5) } }
    );

    res.json(question);
  } catch (error) {
    console.error('更新题目失败:', error);
    res.status(500).json({ error: '更新题目失败' });
  }
});

// 删除题目（软删除）
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: '题目不存在' });
    }

    const examIds = await ExamQuestion.distinct('exam_id', { question_id: req.params.id });
    const existingExamIds = (
      await Exam.find({ _id: { $in: examIds } }).select('_id').lean()
    ).map((e) => String((e as unknown as { _id?: unknown })._id));

    await ExamQuestion.deleteMany({
      question_id: req.params.id,
      exam_id: { $nin: existingExamIds },
    });

    const usageCount = await ExamQuestion.countDocuments({
      question_id: req.params.id,
      exam_id: { $in: existingExamIds },
    });
    question.is_active = false;
    await question.save();

    res.json({
      message: usageCount > 0 ? '题目已下架（仍被考试引用）' : '题目已删除',
      usage_count: usageCount,
    });
  } catch (error) {
    console.error('删除题目失败:', error);
    res.status(500).json({ error: '删除题目失败' });
  }
});

// 批量导入题目
router.post('/batch', auth, async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: '请提供题目数据' });
    }

    const createdQuestions = [];
    const errors = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = new Question({
          ...questions[i],
          created_by: req.user.id
        });
        await question.save();
        createdQuestions.push(question);
      } catch (error) {
        errors.push({
          index: i,
          error: (error as Error).message
        });
      }
    }

    res.json({
      created: createdQuestions.length,
      errors,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('批量导入题目失败:', error);
    res.status(500).json({ error: '批量导入题目失败' });
  }
});

export default router;
