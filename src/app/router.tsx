import { createBrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import HomePage from '@features/dashboard/pages/HomePage';
import LoginPage from '@features/auth/pages/LoginPage';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute.tsx';
import CallbackPage from '@features/auth/pages/CallbackPage.tsx';
import CreateRequestPage from '@/features/request/pages/CreateRequestPage';
import ErrorPage from '@shared/pages/ErrorPage';
import NotFoundPage from '@shared/pages/NotFoundPage';
import CreateLandPage from '../features/appraisal/pages/CreateLandPage';
import CreateBuildingPage from '../features/appraisal/pages/CreateBuildingPage';
import CreateCondoPage from '@/features/appraisal/pages/CreateCondoPage';
import CreateLandBuildingPage from '@/features/appraisal/pages/CreateLandBuildingPage';

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
        path: 'land-detail',
        element: <CreateLandPage />,
      },
      {
        path: 'building-detail',
        element: <CreateBuildingPage />,
      },
      {
        path: 'condo-detail',
        element: <CreateCondoPage />,
      },
      {
        path: 'land-building-detail',
        element: <CreateLandBuildingPage />,
      },
      // Catch-all route for 404 pages
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
