import { signIn } from './auth';

// 检查是否是管理员账号登录
export function isAdminLogin(email: string, password: string): boolean {
  return email === 'admin' && password === 'TestAdmin123';
}

// 创建或更新管理员账号 
// (由于已经在后端初始化时自动创建了 admin，这里直接返回空或不处理即可)
export async function setupAdminAccount() {
  return null;
}

// 管理员登录
export async function adminSignIn() {
  // 直接调用后端的登录接口，后端已经有admin数据
  return await signIn('admin', 'TestAdmin123');
}