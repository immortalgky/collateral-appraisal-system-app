import { RouterProvider } from 'react-router-dom';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { router } from './router';
import { MenuInitializer } from '@features/menuManagement/MenuInitializer';

/**
 * App root. Wrapped by AuthInitializer + AuthProvider in main.tsx.
 * MenuInitializer fetches /auth/me/menu once after authentication and
 * populates useMenuStore before the router renders layout/sidebar.
 */
function App() {
  return (
    <>
      <MenuInitializer>
        <RouterProvider router={router} />
      </MenuInitializer>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#fff', color: '#363636' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    aria-label="Dismiss"
                    className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </>
  );
}

export default App;
