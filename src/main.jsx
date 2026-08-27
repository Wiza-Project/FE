import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';
import { ToastProvider } from '@/components/common';
import AuthBootstrap from '@/components/auth/AuthBootstrap';
import SessionEventsListener from '@/components/auth/SessionEventsListener';
import { queryClient } from '@/lib/queryClient';
import '@/styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider />
      <SessionEventsListener />
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
