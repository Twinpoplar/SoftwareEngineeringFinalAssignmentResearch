import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import type { ExamAttempt, Exam, Question, AttemptAnswer } from '../types';

type QuestionWithAnswer = Question & { answer?: AttemptAnswer };

export const useStudentResults = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['student-results', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const data = await api.get(`/attempts/student/${studentId}`);
      return data as (ExamAttempt & { exams: Exam })[];
    },
    enabled: !!studentId,
  });
};

export const useAttemptDetails = (attemptId: string | undefined) => {
  return useQuery({
    queryKey: ['attempt-details', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('Attempt ID is required');
      
      const attemptData = await api.get(`/attempts/${attemptId}`);
      const attempt = attemptData as ExamAttempt & { exams?: Exam };
      
      if (!attempt) {
        throw new Error('找不到考试记录');
      }

      // 获取该考试的所有题目以便对比
      const examId = attempt.exams?.id ?? attempt.exam_id;
      const questionsData = await api.get<Exam & { questions?: Question[] }>(`/exams/${examId}`);
      const questions = questionsData.questions ?? [];

      return {
        attempt,
        exam: (attempt.exams ?? questionsData) as Exam,
        questions
      };
    },
    enabled: !!attemptId,
  });
};

export const useExamResults = (attemptId: string | undefined) => {
  return useQuery({
    queryKey: ['exam-results', attemptId],
    queryFn: async () => {
      if (!attemptId) return null;

      const attemptData = await api.get(`/attempts/${attemptId}`);
      const attempt = attemptData as ExamAttempt & { exams?: Exam; answers?: AttemptAnswer[] };

      const examId = attempt.exams?.id ?? attempt.exam_id;
      const examData = await api.get(`/exams/${examId}?includeAnswers=true`);
      const exam = examData as Exam & { questions: Question[] };

      const answers = attempt.answers ?? [];
      const getId = (v: unknown) => (v as { id?: string; _id?: string }).id ?? (v as { id?: string; _id?: string })._id ?? '';
      const toId = (v: unknown) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && typeof (v as { toString?: () => string }).toString === 'function') {
          return (v as { toString: () => string }).toString();
        }
        return '';
      };

      const answerMap = new Map<string, AttemptAnswer>(
        answers
          .map((a) => [toId(a.question_id), a] as const)
          .filter(([k]) => Boolean(k))
      );
      const questions: QuestionWithAnswer[] = (exam.questions ?? []).flatMap((q) => {
        const qId = getId(q);
        if (!qId) return [];
        return [{
          ...(q as Question),
          id: qId,
          answer: answerMap.get(qId),
        }];
      });

      const grouped: Record<string, { total: number; score: number }> = {};
      for (const q of questions) {
        const subject = q.subject || '综合';
        if (!grouped[subject]) grouped[subject] = { total: 0, score: 0 };
        grouped[subject].total += q.points;
        grouped[subject].score += q.answer?.score ?? 0;
      }

      const performanceData = Object.entries(grouped).map(([subject, v]) => ({
        subject,
        score: v.total > 0 ? Math.round((v.score / v.total) * 100) : 0,
      }));

      return {
        attempt,
        exam,
        questions,
        performanceData,
      };
    },
    enabled: !!attemptId,
  });
};
