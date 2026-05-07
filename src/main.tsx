// 1. 导入 React 18 核心渲染工具
import { createRoot } from 'react-dom/client';
// 2. 导入 React Query 工具（管理后端接口请求）
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
// 3. 导入项目的「根组件」App.tsx
import App from './App.tsx';
// 4. 导入全局提示框（Toast）
import { ToastContainer } from './components/common/Toast';
// 5. 导入全局 CSS 样式
import './index.css';

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    {/* 整个在线考试系统的所有页面全在这里 */}
    <App />
    {/* 全局提示框（任何页面都能弹） */}
    <ToastContainer />
    {/* 调试工具（开发用）右下角那个树 */}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
