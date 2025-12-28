import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import Layout from './Layout';
import AppraisalLayout from './AppraisalLayout';
import HomePage from '../features/dashboard/pages/HomePage';
import LoginPage from '@features/auth/pages/LoginPage';
import CallbackPage from '@features/auth/pages/CallbackPage.tsx';
import CreateRequestPage from '@/features/request/pages/CreateRequestPage';
import RequestListingPage from '@/features/request/pages/RequestListingPage';
import RequestDetailPage from '@/features/request/pages/RequestDetailPage';
import ErrorPage from '@shared/pages/ErrorPage';
import NotFoundPage from '@shared/pages/NotFoundPage';
import PropertyInformationPage from '@/features/appraisal/pages/PropertyInformationPage';
import LandDetailPage from '@/features/appraisal/pages/LandDetailPage';
import AdministrationPage from '@/features/appraisal/pages/AdministrationPage';
import AppointmentAndFeePage from '@/features/appraisal/pages/AppointmentAndFeePage';
import TaskListingPage from '@/features/task/pages/TaskListingPage';
import CreateMarketSurveyPage from '@/features/appraisal/pages/CreateMarketSurveyPage';
import ListMarketSurveyPage from '@/features/appraisal/pages/ListMarketSurveyPage';
import { useAppraisalRequestId } from '@/features/appraisal/context/AppraisalContext';

/**
 * Redirect component that navigates to request page with requestId from context
 */
const AppraisalIndexRedirect = () => {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const requestId = useAppraisalRequestId();

  if (requestId) {
    return <Navigate to={`/appraisal/${appraisalId}/request/${requestId}`} replace />;
  }

  // Fallback if no requestId yet (shouldn't happen due to loading state in layout)
  return null;
};

// Placeholder component for pages not yet implemented
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
      <span className="text-2xl">🚧</span>
    </div>
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    <p className="text-gray-500">This page is coming soon</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'callback',
        element: <CallbackPage />,
      },
      // Request Routes
      {
        path: 'requests',
        children: [
          {
            index: true,
            element: <RequestListingPage />,
          },
          {
            path: ':requestId',
            element: <RequestDetailPage />,
          },
        ],
      },
      // Task Routes
      {
        path: 'tasks',
        element: <TaskListingPage />,
      },
      // Market Survey Routes
      {
        path: 'market-survey',
        element: <ListMarketSurveyPage />,
      },
      {
        path: 'market-survey/detail',
        element: <CreateMarketSurveyPage />,
      },
      // Development Routes
      {
        path: 'dev/request',
        element: <CreateRequestPage />,
      },
      {
        path: 'dev/property-information',
        element: <PropertyInformationPage />,
      },
      {
        path: 'dev/land-detail',
        element: <LandDetailPage />,
      },
      // Catch-all route for 404 pages
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  // Appraisal Application Routes (separate layout with application sidebar)
  {
    path: 'appraisal/:appraisalId',
    element: <AppraisalLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <AppraisalIndexRedirect />,
      },
      {
        path: 'request/:requestId',
        element: <RequestDetailPage readOnly />,
      },
      {
        path: 'administration',
        element: <AdministrationPage />,
      },
      {
        path: 'appointment',
        element: <AppointmentAndFeePage />,
      },
      {
        path: 'summary',
        element: <PlaceholderPage title="Summary & Decision" />,
      },
    ],
  },
]);
