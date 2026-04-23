import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  addQuestionsToExam,
  getExamQuestions,
  removeQuestionFromExam,
  updateExamQuestionSettings
} from '../api/examQuestions';

// 为考试添加题目
export const useAddQuestionsToExam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ examId, questionIds }: { 
      examId: string; 
      questionIds: string[]; 
    }) => addQuestionsToExam(examId, questionIds),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['examQuestions', examId] });
    },
  });
};

// 获取考试的题目列表
export const useExamQuestions = (examId: string, page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: ['examQuestions', examId, page, limit],
    queryFn: () => getExamQuestions(examId, page, limit),
    enabled: !!examId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 从考试中移除题目
export const useRemoveQuestionFromExam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ examId, questionId }: { examId: string; questionId: string }) => 
      removeQuestionFromExam(examId, questionId),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['examQuestions', examId] });
    },
  });
};

// 更新考试题目设置
export const useUpdateExamQuestionSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ examId, questionId, settings }: { 
      examId: string; 
      questionId: string; 
      settings: { points?: number; is_required?: boolean; order_index?: number } 
    }) => updateExamQuestionSettings(examId, questionId, settings),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['examQuestions', examId] });
    },
  });
};
