import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import type { Question } from '../types';

// 获取题库列表
export const useQuestionBank = (filters?: {
  subject?: string;
  type?: string;
  difficulty?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      const data = await api.get('/questions');
      const list = (data as Question[]) ?? [];

      const q = (filters?.search ?? '').trim().toLowerCase();
      return list.filter((item) => {
        if (filters?.subject && item.subject !== filters.subject) return false;
        if (filters?.type && item.type !== filters.type) return false;
        if (filters?.difficulty && item.difficulty !== filters.difficulty) return false;
        if (q) {
          const hay = `${item.content ?? ''} ${item.subject ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 创建题目
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (question: Partial<Question>) => {
      const saved = await api.post('/questions/batch', [question]);
      const arr = saved as Question[];
      return arr[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
};

// 更新题目
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...question }: { id: string } & Partial<Question>) => {
      const saved = await api.post('/questions/batch', [{ id, ...question }]);
      const arr = saved as Question[];
      return arr[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question', data.id] });
    },
  });
};

// 删除题目
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
};

// 获取题目详情
export const useQuestion = (id: string) => {
  return useQuery({
    queryKey: ['question', id],
    queryFn: async () => {
      const data = await api.get('/questions');
      const list = (data as Question[]) ?? [];
      const found = list.find((q) => q.id === id);
      if (!found) throw new Error('题目不存在');
      return found;
    },
    enabled: !!id,
  });
};
