/**
 * 当前考试的所有状态
 * 只在考试期间使用，交卷后清空
 */
import { create } from 'zustand';
import type { Exam, Question, ExamAttempt, AttemptAnswer } from '../types';

interface ExamState {
  currentExam: Exam | null;
  questions: Question[];
  attempt: ExamAttempt | null;
  answers: Record<string, AttemptAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  isSubmitting: boolean;
  tabSwitchCount: number;

  setCurrentExam: (exam: Exam | null) => void;
  setQuestions: (questions: Question[]) => void;
  setAttempt: (attempt: ExamAttempt | null) => void;
  setAnswers: (answers: Record<string, AttemptAnswer>) => void;
  updateAnswer: (questionId: string, answer: AttemptAnswer) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setTimeRemaining: (time: number | ((prev: number) => number)) => void;
  setIsSubmitting: (submitting: boolean) => void;
  incrementTabSwitch: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  currentExam: null,
  questions: [],
  attempt: null,
  answers: {},
  currentQuestionIndex: 0,
  timeRemaining: 0,
  isSubmitting: false,
  tabSwitchCount: 0,

  setCurrentExam: (exam) => set({ currentExam: exam }),
  setQuestions: (questions) => set({ questions }),
  setAttempt: (attempt) => set({ attempt }),
  setAnswers: (answers) => set({ answers }),
  updateAnswer: (questionId, answer) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setTimeRemaining: (time) =>
    set((state) => ({
      timeRemaining: typeof time === 'function' ? time(state.timeRemaining) : time,
    })),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  incrementTabSwitch: () =>
    set((state) => ({ tabSwitchCount: state.tabSwitchCount + 1 })),
  reset: () =>
    set({
      currentExam: null,
      questions: [],
      attempt: null,
      answers: {},
      currentQuestionIndex: 0,
      timeRemaining: 0,
      isSubmitting: false,
      tabSwitchCount: 0,
    }),
}));
