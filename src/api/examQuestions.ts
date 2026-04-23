import { api } from '../lib/apiClient';

// 为考试添加题目
export const addQuestionsToExam = async (examId: string, questionIds: string[]): Promise<void> => {
  await api.post(`/exam-questions/exams/${examId}/questions`, {
    questionIds,
  });
};

// 获取考试的题目列表
export const getExamQuestions = async (examId: string, page: number = 1, limit: number = 50): Promise<{
  questions: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  return api.get<{
    questions: Array<Record<string, unknown>>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>(`/exam-questions/exams/${examId}/questions?page=${page}&limit=${limit}`);
};

// 从考试中移除题目
export const removeQuestionFromExam = async (examId: string, questionId: string): Promise<void> => {
  await api.delete(`/exam-questions/exams/${examId}/questions/${questionId}`);
};

// 更新考试题目设置
export const updateExamQuestionSettings = async (
  examId: string, 
  questionId: string, 
  settings: { points?: number; is_required?: boolean; order_index?: number }
): Promise<void> => {
  await api.put(`/exam-questions/exams/${examId}/questions/${questionId}`, settings);
};
