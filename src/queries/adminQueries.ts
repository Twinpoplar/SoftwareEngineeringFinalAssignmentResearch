import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import type { Exam, Question, ExamAttempt } from '../types';

export const useAdminExams = () => {
  return useQuery({
    queryKey: ['admin-exams'],
    queryFn: async () => {
      const data = await api.get('/exams');
      return data as Exam[];
    },
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exam: Omit<Exam, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await api.post('/exams', exam);
      return data as Exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
    },
  });
};

export const useUpdateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Exam> & { id: string }) => {
      const data = await api.put(`/exams/${id}`, updates);
      return data as Exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
    },
  });
};

export const useDeleteExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
    },
  });
};

// Questions Management
export const useAdminQuestions = (examId?: string) => {
  return useQuery({
    queryKey: ['admin-questions', examId],
    queryFn: async () => {
      const endpoint = examId ? `/questions/exam/${examId}` : '/questions';
      const data = await api.get(endpoint);
      return data as Question[];
    },
  });
};

export const useSaveQuestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questions: Partial<Question>[]) => {
      const data = await api.post('/questions/batch', questions);
      return data as Question[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });
};

// Results Management
export const useExamResults = (examId: string | undefined) => {
  return useQuery({
    queryKey: ['exam-results', examId],
    queryFn: async () => {
      if (!examId) return [];
      const data = await api.get(`/attempts/exam/${examId}/results`);
      // MongoDB 返回的 student_id 已经被 populate，包含姓名等信息
      return data as (ExamAttempt & { student_id: { email: string, fullName: string, studentId: string } })[];
    },
    enabled: !!examId,
  });
};