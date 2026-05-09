//用户管理（增删改查）
import { api } from '../lib/apiClient';

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  student_id: string;
  is_active: boolean;
  created_at: string;
};

export const listUsers = async (role?: 'student' | 'teacher') => {
  const q = role ? `?role=${role}` : '';
  return api.get<AdminUser[]>(`/users${q}`);
};

export const createUser = async (payload: { email: string; fullName: string; role: 'student' | 'teacher'; studentId?: string }) => {
  return api.post<{ user: AdminUser; temp_password: string }>('/users', payload);
};

export const updateStudentId = async (id: string, studentId: string) => {
  return api.patch<{ user: AdminUser }>(`/users/${id}/student-id`, { studentId });
};

export const removeUser = async (id: string) => {
  return api.delete<{ message: string }>(`/users/${id}`);
};

