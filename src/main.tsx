import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App.tsx';
import { ToastContainer } from './components/common/Toast';
import { queryClient } from './lib/queryClient';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ToastContainer />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
