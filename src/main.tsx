import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './index.css'; // Import global CSS which includes Tailwind
// Imported here rather than @import-ed from index.css: Tailwind v4's Vite plugin does
// not reliably watch partials pulled into the CSS entry, so edits were served stale.
import './styles/formLayout.css';
import App from '@app/App';
import { queryClient } from '@app/queryClient';
import { AuthInitializer, AuthProvider } from '@features/auth/components';
import PageLoader from '@shared/components/PageLoader';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Root Suspense catches i18n namespace loading (th/zh are fetched lazily)
        so any component that suspends on translations has a boundary. English
        is bundled inline, so en users never suspend here. */}
    <Suspense fallback={<PageLoader />}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AuthInitializer>
      </QueryClientProvider>
    </Suspense>
  </StrictMode>,
);
