import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

// Error monitoring — dormant until VITE_SENTRY_DSN is set at build time.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function Crashed() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="font-display text-lg font-700">Something went wrong</p>
        <p className="mt-1 text-sm text-ink/50">Please refresh the page. Our team has been notified.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<Crashed />}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
