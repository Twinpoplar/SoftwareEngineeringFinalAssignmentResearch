//登录、注册、获取个人信息
import type { Profile } from '../types';

const API_URL = 'http://localhost:3000/api/auth';
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export async function signIn(email: string, password: string) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message = isRecord(data) ? (data.error as string | undefined) : undefined;
    throw new Error(message || '登录失败');
  }

  const token = isRecord(data) ? (data.token as string | undefined) : undefined;
  const user = isRecord(data) ? (data.user as unknown) : undefined;
  if (!token || !user) throw new Error('登录返回数据格式不正确');

  return { user, session: { access_token: token } };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: Profile['role'],
  studentId?: string
) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, role, studentId })
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message = isRecord(data) ? (data.error as string | undefined) : undefined;
    throw new Error(message || '注册失败');
  }

  return data;
}

export async function signOut() {
  // 由于使用了JWT，前端清除token即可
  return { error: null };
}

export async function getProfile(token: string): Promise<Profile | null> {
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  if (!isRecord(data) || !data.user) return null;
  return data.user as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  // 在这里如果需要更新个人信息，你需要在Node后端实现更新接口
  // 由于本项目主要要求注册/登录，这里暂时返回mock或者抛出未实现
  console.warn('更新个人信息接口暂未在Node后端实现');
  return { ...updates, id: userId } as Profile;
}
