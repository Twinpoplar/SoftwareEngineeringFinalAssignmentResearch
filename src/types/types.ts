export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  total_points: number;
  pass_score: number;
  allow_review: boolean;
  is_published: boolean;
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
  updated_at: string;
  created_by: string;
  questions?: Question[];
  exam_attempts?: ExamAttempt[];
}

export interface Question {
  id: string;
  exam_id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
  content: string;
  points: number;
  explanation?: string;
  correct_answer: string | string[];
  order_index: number;
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  options?: QuestionOption[];
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id?: string;
  question_id?: string;
  key: string;
  text: string;
  is_correct?: boolean;
  created_at?: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  status: AttemptStatus;
  total_score: number;
  started_at: string;
  submitted_at?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
  exam?: Exam;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string | string[];
  answer_text?: string;
  is_correct?: boolean;
  score: number;
  is_flagged: boolean;
  updated_at: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
export type UserRole = 'student' | 'teacher' | 'admin';
export type ExamStatus = 'not_started' | 'in_progress' | 'ended';
export type AttemptStatus = 'in_progress' | 'completed' | 'graded';
export type Difficulty = 'easy' | 'medium' | 'hard';
