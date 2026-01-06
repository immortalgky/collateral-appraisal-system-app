import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import Layout from './Layout';
import AppraisalLayout from './AppraisalLayout';
import HomePage from '../features/dashboard/pages/HomePage';
import LoginPage from '@features/auth/pages/LoginPage';
import CallbackPage from '@features/auth/pages/CallbackPage.tsx';
import RequestListingPage from '@/features/request/pages/RequestListingPage';
import RequestPage from '@/features/request/pages/RequestPage';
import ErrorPage from '@shared/pages/ErrorPage';
import NotFoundPage from '@shared/pages/NotFoundPage';
import PropertyInformationPage from '@/features/appraisal/pages/PropertyInformationPage';
import DocumentChecklistPage from '@/features/appraisal/pages/DocumentChecklistPage';
import LandDetailPage from '@/features/appraisal/pages/LandDetailPage';
import AdministrationPage from '@/features/appraisal/pages/AdministrationPage';
import AppointmentAndFeePage from '@/features/appraisal/pages/AppointmentAndFeePage';
import TaskListingPage from '@/features/task/pages/TaskListingPage';
import CreateMarketSurveyPage from '@/features/appraisal/pages/CreateMarketSurveyPage';
import ListMarketSurveyPage from '@/features/appraisal/pages/ListMarketSurveyPage';
import CreateLandPage from '../features/appraisal/pages/CreateLandPage';
import CreateBuildingPage from '../features/appraisal/pages/CreateBuildingPage';
import CreateCondoPage from '@/features/appraisal/pages/CreateCondoPage';
import CreateLandBuildingPage from '@/features/appraisal/pages/CreateLandBuildingPage';
import CollateralPhotoPage from '@/features/appraisal/pages/CollateralPhotoPage';
import { useAppraisalRequestId } from '@/features/appraisal/context/AppraisalContext';
import PriceAnalysisPage from '@/features/appraisal/pages/PriceAnalysisPage';

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
            path: 'new',
            element: <RequestPage key="new" />,
          },
          {
            path: ':requestId',
            element: <RequestPage key="detail" />,
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
      // Collateral Appraisal Routes
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
      {
        path: 'dev/property-information',
        element: <PropertyInformationPage />,
      },
      {
        path: 'dev/land-detail',
        element: <LandDetailPage />,
      },
      {
        path: 'dev/price-analysis',
        element: <PriceAnalysisPage />,
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
        element: <RequestPage readOnly />,
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
        path: 'property',
        children: [
          {
            index: true,
            element: <PropertyInformationPage />,
          },
          {
            path: 'land/new',
            element: <CreateLandPage />,
          },
          {
            path: 'land/:propertyId',
            element: <CreateLandPage />,
          },
          {
            path: 'land/:propertyId/photos',
            element: <CollateralPhotoPage />,
          },
          {
            path: 'building/new',
            element: <CreateBuildingPage />,
          },
          {
            path: 'building/:propertyId',
            element: <CreateBuildingPage />,
          },
          {
            path: 'building/:propertyId/photos',
            element: <CollateralPhotoPage />,
          },
          {
            path: 'condo/new',
            element: <CreateCondoPage />,
          },
          {
            path: 'condo/:propertyId',
            element: <CreateCondoPage />,
          },
          {
            path: 'condo/:propertyId/photos',
            element: <CollateralPhotoPage />,
          },
          {
            path: 'land-building/new',
            element: <CreateLandBuildingPage />,
          },
          {
            path: 'land-building/:propertyId',
            element: <CreateLandBuildingPage />,
          },
          {
            path: 'land-building/:propertyId/photos',
            element: <CollateralPhotoPage />,
          },
        ],
      },
      {
        path: 'documents',
        element: <DocumentChecklistPage />,
      },
      {
        path: 'summary',
        element: <PlaceholderPage title="Summary & Decision" />,
      },
    ],
  },
]);
