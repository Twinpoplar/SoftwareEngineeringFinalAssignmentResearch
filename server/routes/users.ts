import express from 'express';
import bcrypt from 'bcryptjs';
import { auth, authorize, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = express.Router();

const normalizeUser = (u: Record<string, unknown>) => {
  return {
    id: String(u._id ?? ''),
    email: String(u.email ?? ''),
    full_name: String(u.fullName ?? ''),
    role: String(u.role ?? 'student'),
    student_id: String(u.studentId ?? ''),
    is_active: u.is_active !== false,
    created_at: u.createdAt,
  };
};

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

router.get(['/', ''], auth, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const role = String(req.query.role ?? '');
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
    res.json(users.map((u) => normalizeUser(u as unknown as Record<string, unknown>)));
  } catch {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.post(['/', ''], auth, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { email, fullName, role, studentId } = req.body as {
      email?: string;
      fullName?: string;
      role?: string;
      studentId?: string;
    };

    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const normalizedName = String(fullName ?? '').trim();
    const normalizedRole = String(role ?? '').trim();
    const normalizedStudentId = String(studentId ?? '').trim();

    if (!normalizedEmail || !normalizedName) {
      return res.status(400).json({ error: '请填写邮箱与姓名' });
    }
    if (!['student', 'teacher'].includes(normalizedRole)) {
      return res.status(400).json({ error: '仅支持创建学生或教师账号' });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ error: '该邮箱已被注册' });

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const created = new User({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: normalizedName,
      role: normalizedRole,
      studentId: normalizedStudentId,
      is_active: true,
    });

    await created.save();

    res.status(201).json({
      user: normalizeUser(created.toObject() as unknown as Record<string, unknown>),
      temp_password: tempPassword,
    });
  } catch {
    res.status(500).json({ error: '创建用户失败' });
  }
});

router.patch('/:id/student-id', auth, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.body as { studentId?: string };
    const nextStudentId = String(studentId ?? '').trim();
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ error: '不允许修改管理员' });
    user.studentId = nextStudentId;
    await user.save();
    res.json({ user: normalizeUser(user.toObject() as unknown as Record<string, unknown>) });
  } catch {
    res.status(500).json({ error: '更新学号失败' });
  }
});

router.delete('/:id', auth, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: '不允许删除当前登录账号' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ error: '不允许删除管理员' });
    (user as unknown as { is_active?: boolean }).is_active = false;
    await user.save();
    res.json({ message: '账号已移除（禁用）' });
  } catch {
    res.status(500).json({ error: '移除账号失败' });
  }
});

export default router;
