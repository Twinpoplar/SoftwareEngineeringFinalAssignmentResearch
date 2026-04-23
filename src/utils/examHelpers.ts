import dayjs from 'dayjs';
import type { Exam, ExamStatus } from '../types';

export function getExamStatus(exam: Exam): ExamStatus {
  const now = dayjs();
  const start = dayjs(exam.start_time);
  const end = dayjs(exam.end_time);

  if (now.isBefore(start)) return 'not_started';
  if (now.isAfter(end)) return 'ended';
  return 'in_progress';
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getTimeUntilStart(exam: Exam): number {
  return Math.max(0, dayjs(exam.start_time).diff(dayjs(), 'second'));
}

export function getScoreColor(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 70) return 'text-blue-600';
  if (pct >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export function getScoreBg(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct >= 90) return 'bg-emerald-50 border-emerald-200';
  if (pct >= 70) return 'bg-blue-50 border-blue-200';
  if (pct >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function getGrade(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}
