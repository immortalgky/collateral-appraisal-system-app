import { createBrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import HomePage from '@features/dashboard/pages/HomePage';
import LoginPage from '@features/auth/pages/LoginPage';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute.tsx';
import CallbackPage from '@features/auth/pages/CallbackPage.tsx';
import CreateRequestPage from '@/features/request/pages/CreateRequestPage';
import ErrorPage from '@shared/pages/ErrorPage';
import NotFoundPage from '@shared/pages/NotFoundPage';
import CreateCollateralCondo from '../features/appraisal/pages/CreateCollateralCondo';
import CreateCollateralBuilding from '@/features/appraisal/pages/CreateCollateralBuilding';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <ProtectedRoute component={<HomePage />} />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'callback',
        element: <CallbackPage />,
      },
      {
        path: 'request',
        element: <CreateRequestPage />,
      },
      {
        path: 'dev/colCondo',
        element: <CreateCollateralCondo />,
      },
      {
        path: 'dev/colBuilding',
        element: <CreateCollateralBuilding />,
      },
      // Catch-all route for 404 pages
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
