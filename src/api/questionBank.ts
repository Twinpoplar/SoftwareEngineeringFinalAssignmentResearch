//题库操作
import { api } from '../lib/apiClient';

export interface Question {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
  content: string;
  points: number;
  explanation?: string;
  correct_answer: string | string[];
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: Array<{
    key: string;
    text: string;
    is_correct?: boolean;
  }>;
  usage_count?: number;
  last_used?: string;
  created_by?: string;
  tags?: string[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionFilters {
  subject?: string;
  type?: string;
  difficulty?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface QuestionListResponse {
  questions: Question[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 获取题库列表
export const getQuestionBank = async (filters: QuestionFilters = {}): Promise<QuestionListResponse> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.append(key, String(value));
      }
    }
  });

  return api.get<QuestionListResponse>(`/question-bank?${params}`);
};

// 获取学科列表
export const getSubjects = async (): Promise<{ subjects: string[] }> => {
  return api.get<{ subjects: string[] }>('/question-bank/subjects');
};

// 获取题目详情
export const getQuestion = async (id: string): Promise<Question> => {
  return api.get<Question>(`/question-bank/${id}`);
};

// 创建题目
export const createQuestion = async (data: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<Question> => {
  return api.post<Question>('/question-bank', data);
};

// 更新题目
export const updateQuestion = async (id: string, data: Partial<Question>): Promise<Question> => {
  return api.put<Question>(`/question-bank/${id}`, data);
};

// 删除题目
export const deleteQuestion = async (id: string): Promise<{ message: string; usage_count?: number }> => {
  return api.delete<{ message: string; usage_count?: number }>(`/question-bank/${id}`);
};

// 批量导入题目
export const batchImportQuestions = async (questions: Omit<Question, 'id' | 'created_at' | 'updated_at'>[]): Promise<{
  created: number;
  errors: Array<{ index: number; error: string }>;
  questions: Question[];
}> => {
  return api.post<{
    created: number;
    errors: Array<{ index: number; error: string }>;
    questions: Question[];
  }>('/question-bank/batch', { questions });
};
