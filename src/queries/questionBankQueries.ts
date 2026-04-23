import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getQuestionBank, 
  getSubjects, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion,
  batchImportQuestions,
  type Question,
  type QuestionFilters
} from '../api/questionBank';

// 获取题库列表
export const useQuestionBank = (filters: QuestionFilters = {}) => {
  return useQuery({
    queryKey: ['questionBank', filters],
    queryFn: () => getQuestionBank(filters),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 获取学科列表
export const useSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: getSubjects,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 创建题目
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionBank'] });
    },
  });
};

// 更新题目
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Question> }) => 
      updateQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionBank'] });
    },
  });
};

// 删除题目
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionBank'] });
    },
  });
};

// 批量导入题目
export const useBatchImportQuestions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: batchImportQuestions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionBank'] });
    },
  });
};