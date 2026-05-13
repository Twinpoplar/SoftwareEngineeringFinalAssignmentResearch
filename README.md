# 在线考试系统 (Online Examination System)

一个现代化的 Web 在线考试系统，支持学生、教师和管理员三种角色，提供完整的考试管理、题库管理、答题和成绩分析功能。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)

---

## 系统特性

### 核心功能

- **多角色支持**: 学生、教师、管理员三种角色，权限分离
- **完整考试流程**: 考试创建 → 题库管理 → 发布考试 → 在线答题 → 自动评分 → 成绩查询
- **实时防作弊**: 切屏检测、全屏锁定、快捷键禁用、自动保存
- **多种题型**: 单选题、多选题、判断题、简答题（支持富文本）
- **智能评分**: 选择题自动评分，简答题人工/半自动评分

### 技术亮点

- 现代化 UI 设计，响应式布局
- 实时倒计时悬浮窗（可拖拽/最小化）
- 答题卡快速跳转
- 知识点掌握雷达图分析
- 切屏警告机制

---

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.3.1 | UI 框架 |
| TypeScript | 5.5.3 | 类型安全 |
| Vite | 5.4.2 | 构建工具 |
| TailwindCSS | 3.4.1 | 样式方案 |
| React Router | 7.14.1 | 路由管理 |
| Zustand | 5.0.12 | 客户端状态管理 |
| TanStack Query | 5.99.0 | 服务端状态管理 |
| React Hook Form | 7.72.1 | 表单处理 |
| Zod | 4.3.6 | 表单验证 |
| Recharts | 3.8.1 | 数据可视化 |
| Socket.io-client | 4.8.3 | 实时通信 |
| React Quill | 2.0.0 | 富文本编辑器 |
| Lucide React | 0.344.0 | 图标库 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Express | 5.2.1 | Web 框架 |
| Mongoose | 9.4.1 | MongoDB ODM |
| bcryptjs | 3.0.3 | 密码加密 |
| jsonwebtoken | 9.0.3 | JWT 认证 |
| cors | 2.8.6 | 跨域支持 |
| uuid | 13.0.0 | 唯一 ID 生成 |

---

## 项目结构

```
.
├── src/                      # 前端源代码
│   ├── components/          # 组件库
│   │   ├── common/         # 通用组件 (Button, Modal, Toast)
│   │   ├── exam/           # 考试相关组件 (Timer, AnswerSheet, SubmitModal)
│   │   └── admin/          # 后台管理组件
│   ├── hooks/              # 自定义 Hooks
│   ├── queries/            # React Query 查询定义
│   ├── stores/             # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── views/              # 页面视图
│   │   ├── auth/          # 登录/注册
│   │   ├── exam/          # 考试列表/答题室
│   │   ├── result/        # 成绩查询
│   │   └── admin/         # 管理后台
│   └── lib/                # API 客户端
│
├── server/                  # 后端源代码
│   ├── models/             # 数据模型
│   ├── routes/             # API 路由
│   └── uploads/            # 文件上传目录
│
├── supabase/               # Supabase 迁移脚本
│   └── migrations/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x 或 yarn

### 安装依赖

```bash
# 安装前端依赖
npm install

# 或
yarn install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 或启动后端服务
npm run server
```

### 构建生产版本

```bash
npm run build
```

---

## 角色与权限

| 角色 | 权限说明 |
|------|----------|
| **学生** | 查看考试列表、在线答题、查看成绩、错题回顾 |
| **教师** | 创建考试、管理题库、查看成绩、评分管理 |
| **管理员** | 用户管理、系统配置、查看所有数据 |

### 默认管理员账号

```
邮箱：admin
密码：TestAdmin123
```

---

## 核心页面说明

### 1. 登录/注册

- 角色选择（学生/教师）
- 邮箱/账号密码登录
- 记住密码功能（管理员除外）

### 2. 考试列表（学生端）

- 考试状态标签（未开始/进行中/已完成）
- 倒计时显示
- 进入考试按钮状态控制

### 3. 在线答题室

**布局**: 左侧题目区 (70%) + 右侧答题卡 (30%)

**功能**:
- 四种题型支持：单选/多选/判断/简答
- 上一题/下一题/答题卡跳转
- 题目状态标记（未做/已做/待复查）
- 简答题富文本编辑 + 图片上传
- 实时倒计时（可拖拽悬浮窗）
- 防作弊：切屏检测、全屏锁定、快捷键禁用
- 快捷键：方向键切换、数字键跳转、Ctrl+S 保存

### 4. 提交确认

- 二次确认弹窗
- 未作答提示
- 提交中 Loading 状态
- 防误触设计

### 5. 成绩查询（学生端）

- 分数展示
- 排名显示
- 错题回顾
- 教师评语
- 知识点掌握雷达图

### 6. 题库管理（教师端）

- 题目检索（多条件筛选）
- 批量导入/导出
- 题目预览
- 审核状态管理

### 7. 考试管理（教师端）

- 发布考试（挑选试题 + 考试时间）
- 成绩评定（成绩分布、排名）

### 8. 管理后台

- 用户管理
- 考试管理
- 分数管理
- 仪表盘（统计数据）

---

## 状态管理规范

### Zustand Store

| Store | 说明 |
|-------|------|
| authStore | 用户信息、权限、Token |
| examStore | 当前考试状态、答题进度、倒计时 |
| uiStore | 全局 Loading、消息提示、模态框状态 |

### React Query

| 配置 | 值 |
|------|-----|
| staleTime | 考试列表 5min，题目数据 10min |
| cacheTime | 成绩数据 30min |
| refetchOnWindowFocus | false |

---

## API 接口规范

所有 API 调用通过 `src/lib/apiClient` 统一封装：

- 统一错误处理
- Token 自动刷新
- 请求拦截（Timestamp 签名防重放）
- 响应拦截（401/403/500 统一处理）

---

## 防作弊机制

1. **切屏检测**: Page Visibility API 监听，超过 3 次警告后自动交卷
2. **全屏锁定**: 考试期间自动进入全屏，禁止退出
3. **快捷键禁用**: F12、Ctrl+Shift+I/J、Ctrl+U 等开发者工具快捷键
4. **右键禁用**: 禁止右键菜单
5. **自动保存**: 防抖保存（30 秒）+ 离开页面提示
6. **强制交卷**: 超时自动提交

---

## 性能优化

- 代码分割：路由懒加载
- 资源优化：图片懒加载、富文本动态导入
- 渲染优化：React.memo、useMemo
- 网络优化：答题防抖保存、失败重试

---

## 浏览器兼容性

- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Edge 120+
- ❌ IE、Safari 15 以下

---

## 开发注意事项

### 数据库迁移

使用 Supabase 进行数据库迁移：

```bash
# 执行迁移脚本
npx supabase migration up
```

### 文件上传

支持图片上传至 `server/uploads/` 目录

### 环境变量

创建 `.env` 文件配置：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 许可证

MIT License

---

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
