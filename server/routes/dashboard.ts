import express from 'express';
import dayjs from 'dayjs';
import { auth, authorize, AuthRequest } from '../middleware/auth';
import { Exam } from '../models/Exam';
import { ExamAttempt } from '../models/Attempt';
import { User } from '../models/User';

const router = express.Router();

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

router.get('/summary', auth, authorize(['teacher', 'admin']), async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const role = req.user!.role;
    const userId = req.user!.id;

    const examFilter: Record<string, unknown> = {};
    if (role !== 'admin') {
      examFilter.created_by = userId;
    }

    const exams = (await Exam.find(examFilter).sort({ created_at: -1 }).lean({ virtuals: true })) as unknown[];
    const examIds = exams
      .map((e) => (isRecord(e) && typeof e.id === 'string' ? e.id : null))
      .filter((id): id is string => !!id);

    const activeExams = exams.filter((e) => {
      if (!isRecord(e)) return false;
      const isPublished = e.is_published === true;
      const start = e.start_time;
      const end = e.end_time;
      if (!isPublished || (!start && !end)) return false;
      return dayjs(start as unknown as string).isBefore(now) && dayjs(end as unknown as string).isAfter(now);
    });

    const attempts = examIds.length
      ? await ExamAttempt.find({ exam_id: { $in: examIds } })
          .sort({ created_at: -1 })
          .limit(20)
          .lean({ virtuals: true })
      : [];

    const studentIds = Array.from(
      new Set(
        (attempts as unknown[]).map((a) => (isRecord(a) && typeof a.student_id === 'string' ? a.student_id : null)).filter((v): v is string => !!v)
      )
    );
    const students = (studentIds.length ? await User.find({ _id: { $in: studentIds } }).lean() : []) as unknown[];
    const studentMap = new Map<string, Record<string, unknown>>(
      students
        .filter(isRecord)
        .map((s) => [String(s._id), s])
    );
    const examMap = new Map<string, Record<string, unknown>>(
      exams
        .filter(isRecord)
        .filter((e) => typeof e.id === 'string')
        .map((e) => [e.id as string, e])
    );

    const submittedAttempts = (attempts as unknown[]).filter((a) => isRecord(a) && a.status !== 'in_progress') as Record<string, unknown>[];
    const avgScore =
      submittedAttempts.length > 0
        ? Math.round(
            submittedAttempts.reduce((sum: number, a) => sum + (typeof a.total_score === 'number' ? a.total_score : 0), 0) / submittedAttempts.length
          )
        : 0;

    const recentAttempts = submittedAttempts.slice(0, 5).map((a) => {
      const examId = typeof a.exam_id === 'string' ? a.exam_id : '';
      const studentId = typeof a.student_id === 'string' ? a.student_id : '';
      const exam = examMap.get(examId);
      const student = studentMap.get(studentId);
      return {
        ...a,
        exams: exam ?? null,
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

    res.json({
      stats: {
        totalExams: exams.length,
        activeExams: activeExams.length,
        totalAttempts: submittedAttempts.length,
        avgScore,
      },
      recentExams: exams.slice(0, 5),
      recentAttempts,
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({ error: '获取仪表盘数据失败' });
  }
});

export default router;
