import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import type { Exam, Question, ExamAttempt, AttemptAnswer } from '../types';

// Fetch all exams (filtered by backend based on role)
export const useExams = () => {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const data = await api.get('/exams');
      return data as (Exam & { exam_attempts: ExamAttempt[] })[];
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
};

// Fetch single exam with questions
export const useExam = (id: string | undefined) => {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: async () => {
      if (!id) throw new Error('Exam ID is required');
      const data = await api.get(`/exams/${id}`);
      return data as Exam & { questions: Question[]; exam_attempts?: ExamAttempt[] };
    },
    enabled: !!id,
  });
};

export const useStudentExam = (id: string | undefined) => {
  return useQuery({
    queryKey: ['student-exam', id],
    queryFn: async () => {
      if (!id) throw new Error('Exam ID is required');
      const exam = (await api.get(`/exams/${id}`)) as Exam & { questions?: unknown[]; exam_attempts?: ExamAttempt[] };
      const hasQuestions = Array.isArray(exam.questions) && exam.questions.length > 0;

      const fallback = hasQuestions
        ? null
        : ((await api.get(`/exam-questions/exams/${id}/questions?page=1&limit=500`)) as {
            questions?: unknown[];
          });

      const rawQuestions = (hasQuestions ? exam.questions : fallback?.questions) ?? [];
      const normalizedQuestions = rawQuestions
        .map((q) => {
          const rec = (q ?? {}) as Record<string, unknown>;
          const qId = (rec.id as string | undefined) ?? (rec._id as string | undefined) ?? '';
          if (!qId) return null;

          const optionsRaw = Array.isArray(rec.options) ? (rec.options as Array<Record<string, unknown>>) : [];
          const options = optionsRaw.map((opt) => {
            const optId = (opt.id as string | undefined) ?? (opt._id as string | undefined);
            const next = { ...opt };
            if (optId) next.id = optId;
            delete (next as Record<string, unknown>)._id;
            delete (next as Record<string, unknown>).is_correct;
            return next;
          });

          const next: Record<string, unknown> = {
            ...rec,
            id: qId,
            points: (rec.points as number | undefined) ?? (rec.exam_points as number | undefined) ?? 5,
            order_index: (rec.order_index as number | undefined) ?? (rec.exam_order as number | undefined) ?? 0,
            options,
          };

          delete next._id;
          delete next.__v;
          delete next.correct_answer;
          delete next.explanation;
          delete next.exam_points;
          delete next.exam_order;

          return next as unknown as Question;
        })
        .filter((x): x is Question => x !== null)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

      const normalizedAttempts = (exam.exam_attempts ?? []).map((a) => {
        const rec = (a ?? {}) as unknown as Record<string, unknown>;
        const attemptId = (rec.id as string | undefined) ?? (rec._id as string | undefined) ?? '';
        if (!attemptId) return a;
        return { ...(rec as unknown as ExamAttempt), id: attemptId } as ExamAttempt;
      });

      return { ...exam, questions: normalizedQuestions, exam_attempts: normalizedAttempts } as Exam & {
        questions: Question[];
        exam_attempts?: ExamAttempt[];
      };
    },
    enabled: !!id,
  });
};

// Start or get exam attempt
export const useStartExam = () => {
  return useMutation({
    mutationFn: async ({ examId }: { examId: string }) => {
      const data = await api.post('/attempts/start', { exam_id: examId });
      return data as ExamAttempt;
    },
  });
};

// Get current attempt
export const useExamAttempt = (attemptId: string | undefined) => {
  return useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('Attempt ID is required');
      const data = await api.get(`/attempts/${attemptId}`);
      return data as ExamAttempt;
    },
    enabled: !!attemptId,
  });
};

export const useExamAnswers = (attemptId: string | undefined) => {
  return useQuery({
    queryKey: ['attempt-answers', attemptId],
    queryFn: async () => {
      if (!attemptId) return [] as AttemptAnswer[];
      const data = await api.get(`/attempts/${attemptId}`);
      const attempt = data as ExamAttempt & { answers?: AttemptAnswer[] };
      return (attempt.answers ?? []) as AttemptAnswer[];
    },
    enabled: !!attemptId,
  });
};

// Submit a single answer
export const useSubmitAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      questionId,
      answer,
      answerText,
    }: {
      attemptId: string;
      questionId: string;
      answer?: string | string[];
      answerText?: string;
    }) => {
      const data = await api.post(`/attempts/${attemptId}/answer`, {
        question_id: questionId,
        answer,
        answer_text: answerText
      });
      return data as ExamAttempt;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attempt', variables.attemptId] });
      queryClient.invalidateQueries({ queryKey: ['attempt-answers', variables.attemptId] });
    },
  });
};

// Submit the whole exam
export const useSubmitExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const data = await api.put(`/attempts/${attemptId}/submit`);
      return data as ExamAttempt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });
};
