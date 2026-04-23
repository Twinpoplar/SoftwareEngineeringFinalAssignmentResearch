/*
  # Online Exam System Schema

  ## Overview
  Creates the full database schema for the online examination system including
  user profiles, exams, questions, attempts, and answers.

  ## New Tables

  ### profiles
  - `id` (uuid, FK to auth.users) - User identifier
  - `email` (text) - User email
  - `full_name` (text) - User display name
  - `role` (text) - User role: student, teacher, or admin
  - `student_id` (text) - Optional student number
  - `created_at` (timestamptz) - Record creation time

  ### exams
  - `id` (uuid, PK) - Exam identifier
  - `title` (text) - Exam title
  - `description` (text) - Exam description
  - `duration_minutes` (int) - Exam duration in minutes
  - `start_time` (timestamptz) - When exam becomes available
  - `end_time` (timestamptz) - When exam closes
  - `total_points` (int) - Maximum possible score
  - `pass_score` (int) - Minimum passing score
  - `created_by` (uuid, FK profiles) - Creator (teacher/admin)
  - `is_published` (bool) - Whether visible to students
  - `allow_review` (bool) - Whether students can review after submission

  ### questions
  - `id` (uuid, PK) - Question identifier
  - `exam_id` (uuid, FK exams) - Parent exam
  - `type` (text) - single_choice, multiple_choice, true_false, short_answer
  - `content` (text) - Question text/HTML
  - `options` (jsonb) - Array of answer options (for choice questions)
  - `correct_answer` (jsonb) - Correct answer(s)
  - `points` (int) - Points awarded for correct answer
  - `order_index` (int) - Display order
  - `explanation` (text) - Answer explanation shown after review

  ### exam_attempts
  - `id` (uuid, PK) - Attempt identifier
  - `exam_id` (uuid, FK exams) - The exam being attempted
  - `user_id` (uuid, FK profiles) - Student taking the exam
  - `started_at` (timestamptz) - When attempt started
  - `submitted_at` (timestamptz) - When attempt was submitted
  - `total_score` (int) - Final score
  - `status` (text) - in_progress, submitted, graded
  - `tab_switch_count` (int) - Anti-cheat: number of tab switches

  ### attempt_answers
  - `id` (uuid, PK) - Answer identifier
  - `attempt_id` (uuid, FK exam_attempts) - Parent attempt
  - `question_id` (uuid, FK questions) - The question answered
  - `answer` (jsonb) - Student's answer
  - `is_correct` (bool) - Whether answer is correct
  - `score` (int) - Points awarded
  - `is_flagged` (bool) - Whether student flagged for review

  ## Security
  - RLS enabled on all tables
  - Students can only access their own data and published exams
  - Teachers can manage exams they created
  - Admins have full access
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  student_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  duration_minutes int NOT NULL DEFAULT 60,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  total_points int NOT NULL DEFAULT 100,
  pass_score int NOT NULL DEFAULT 60,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_published bool NOT NULL DEFAULT false,
  allow_review bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('single_choice', 'multiple_choice', 'true_false', 'short_answer')),
  content text NOT NULL,
  options jsonb DEFAULT '[]',
  correct_answer jsonb DEFAULT 'null',
  points int NOT NULL DEFAULT 5,
  order_index int NOT NULL DEFAULT 0,
  explanation text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  total_score int DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  tab_switch_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer jsonb DEFAULT 'null',
  is_correct bool DEFAULT false,
  score int DEFAULT 0,
  is_flagged bool DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins and teachers can read all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Students can read published exams"
  ON exams FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Teachers can read own exams"
  ON exams FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can read all exams"
  ON exams FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Teachers and admins can create exams"
  ON exams FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin'))
  );

CREATE POLICY "Teachers can update own exams"
  ON exams FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update any exam"
  ON exams FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Teachers can delete own exams"
  ON exams FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can delete any exam"
  ON exams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Students can read questions of published exams"
  ON questions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.is_published = true)
  );

CREATE POLICY "Teachers can manage questions of own exams"
  ON questions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.created_by = auth.uid())
  );

CREATE POLICY "Teachers can insert questions"
  ON questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Teachers can update own questions"
  ON questions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Teachers can delete own questions"
  ON questions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Students can read own attempts"
  ON exam_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can read attempts for own exams"
  ON exam_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_id AND e.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Students can create attempts"
  ON exam_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own attempts"
  ON exam_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can read own answers"
  ON attempt_answers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = attempt_id AND ea.user_id = auth.uid())
  );

CREATE POLICY "Teachers can read answers for own exams"
  ON attempt_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts ea
      JOIN exams e ON e.id = ea.exam_id
      WHERE ea.id = attempt_id AND (e.created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "Students can insert own answers"
  ON attempt_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = attempt_id AND ea.user_id = auth.uid())
  );

CREATE POLICY "Students can update own answers"
  ON attempt_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = attempt_id AND ea.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = attempt_id AND ea.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
