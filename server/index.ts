import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import authRoutes from './routes/auth';
import examRoutes from './routes/exams';
import questionRoutes from './routes/questions';
import questionBankRoutes from './routes/questionBank';
import examQuestionRoutes from './routes/examQuestions';
import tikuAdapterRoutes from './routes/tikuAdapter';
import uploadRoutes from './routes/uploads';
import attemptRoutes from './routes/attempts';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';
import { User } from './models/User';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/exam_system';

// 中间件
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/question-bank', questionBankRoutes); // 独立题库路由
app.use('/api/exam-questions', examQuestionRoutes); // 考试题目关联路由
app.use('/api/tiku-adapter', tikuAdapterRoutes); // tikuAdapter 代理路由
app.use('/api/uploads', uploadRoutes);

//app.use(/^\/api\/users(\/|$)/, userRoutes); 管理员无法删除人员
app.use('/api/users', userRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/dashboard', dashboardRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 连接成功!');

    try {
      const adminUsername = 'admin';
      const adminExists = await User.findOne({ email: adminUsername });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('TestAdmin123', salt);

        const adminUser = new User({
          email: adminUsername,
          password: hashedPassword,
          fullName: '系统管理员',
          role: 'admin',
          studentId: 'ADMIN001',
        });

        await adminUser.save();
        console.log('👨‍💻 默认管理员账号已创建 (账号: admin, 密码: TestAdmin123)');
      }
    } catch (err) {
      console.error('初始化管理员账号失败:', err);
    }

    app.listen(PORT, () => {
      console.log(`🚀 后端服务运行在: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
  }
};

void startServer();
