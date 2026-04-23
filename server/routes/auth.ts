import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// 注册路由
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role, studentId } = req.body;

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = new User({
      email,
      password: hashedPassword,
      fullName,
      role: role || 'student',
      studentId: studentId || ''
    });

    await newUser.save();

    res.status(201).json({ message: '账号创建成功' });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录路由
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 特殊处理管理员账号登录 (如果不走数据库直接走硬编码可以放这里，但我们已经有了Admin seeding，所以直接查数据库)
    
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }
    if ((user as unknown as { is_active?: boolean }).is_active === false) {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    // 生成 JWT Token
    const payload = {
      aud: 'authenticated', // 必须设置为 authenticated，以便 Supabase RLS 识别
      role: 'authenticated',
      sub: user._id, // 因为我们在 Mongoose 中使用了 UUID，所以兼容 Supabase
      email: user.email,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { role: user.role },
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        
        // 返回用户信息和token (不包含密码)
        const userProfile = {
          id: user._id.toString(),
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          student_id: user.studentId,
          created_at: user.createdAt
        };
        
        res.json({
          token,
          user: userProfile
        });
      }
    );
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前登录用户信息
router.get('/me', async (req, res) => {
  try {
    // 从Header获取token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '未授权访问' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload | string;
    if (typeof decoded === 'string' || !decoded.user || typeof decoded.user !== 'object') {
      return res.status(401).json({ error: 'Token无效或已过期' });
    }

    const userId = (decoded.user as { id?: string }).id;
    if (!userId) {
      return res.status(401).json({ error: 'Token无效或已过期' });
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if ((user as unknown as { is_active?: boolean }).is_active === false) {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    const userProfile = {
      id: user._id.toString(),
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      student_id: user.studentId,
      is_active: (user as unknown as { is_active?: boolean }).is_active !== false,
      created_at: user.createdAt
    };

    res.json({ user: userProfile });
  } catch {
    res.status(401).json({ error: 'Token无效或已过期' });
  }
});

export default router;
