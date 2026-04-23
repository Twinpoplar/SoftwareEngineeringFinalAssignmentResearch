export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      exams: {
        Row: Exam;
        Insert: Omit<Exam, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Exam, 'id' | 'created_at'>>;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at'>;
        Update: Partial<Omit<Question, 'id' | 'created_at'>>;
      };
      exam_attempts: {
        Row: ExamAttempt;
        Insert: Omit<ExamAttempt, 'id' | 'created_at'>;
        Update: Partial<Omit<ExamAttempt, 'id' | 'created_at'>>;
      };
      attempt_answers: {
        Row: AttemptAnswer;
        Insert: Omit<AttemptAnswer, 'id'>;
        Update: Partial<Omit<AttemptAnswer, 'id'>>;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  student_id: string;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  total_points: number;
  pass_score: number;
  created_by: string | null;
  is_published: boolean;
  allow_review: boolean;
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  type: QuestionType;
  content: string;
  options: QuestionOption[];
  correct_answer: string | string[] | null;
  points: number;
  order_index: number;
  explanation: string;
  created_at: string;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number;
  status: AttemptStatus;
  tab_switch_count: number;
  created_at: string;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string | string[] | null;
  is_correct: boolean;
  score: number;
  is_flagged: boolean;
  updated_at: string;
}

export interface ExamWithAttempt extends Exam {
  attempt?: ExamAttempt;
  question_count?: number;
}

export type ExamStatus = 'not_started' | 'in_progress' | 'ended' | 'my_progress' | 'completed';

export interface QuestionWithAnswer extends Question {
  answer?: AttemptAnswer;
}
