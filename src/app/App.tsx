import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#fff', color: '#363636' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </>
  );
}

export default App;
