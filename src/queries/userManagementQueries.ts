import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, listUsers, removeUser, updateStudentId, type AdminUser } from '../api/users';

export const useAdminUsers = (role?: 'student' | 'teacher') => {
  return useQuery({
    queryKey: ['admin-users', role ?? 'all'],
    queryFn: () => listUsers(role),
  });
};

export const useAdminCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useAdminUpdateStudentId = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) => updateStudentId(id, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useAdminRemoveUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export type { AdminUser };

