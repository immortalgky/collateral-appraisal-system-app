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
import AdministrationPage from '@/features/appraisal/pages/AdministrationPage';
import AppointmentAndFeePage from '@/features/appraisal/pages/AppointmentAndFeePage';
import TaskListingPage from '@/features/task/pages/TaskListingPage';
import ActivityTaskListPage from '@/features/task/pages/ActivityTaskListPage';
import NotificationPage from '@/features/notification/pages/NotificationPage';
import CreateMarketComparablePage from '@/features/appraisal/pages/CreateMarketComparablePage';
import MarketComparableListingPage from '@/features/appraisal/pages/MarketComparableListingPage';
import CreateLandPage from '../features/appraisal/pages/CreateLandPage';
import CreateBuildingPage from '../features/appraisal/pages/CreateBuildingPage';
import CreateCondoPage from '@/features/appraisal/pages/CreateCondoPage';
import CreateLandBuildingPage from '@/features/appraisal/pages/CreateLandBuildingPage';
import CreateLawAndRegulationPage from '@/features/appraisal/pages/CreateLawAndRegulationPage';
import { useAppraisalRequestId } from '@/features/appraisal/context/AppraisalContext';
import { ProtectedRoute } from '@features/auth/components';
import LandBuildingPMAPage from '@/features/appraisal/pages/LandBuildingPMAPage';
import CondoPMAPage from '@/features/appraisal/pages/CondoPMAPage';
import PricingAnalysisPage from '@features/pricingAnalysis/pages/PricingAnalysisPage';
import MarketComparableFactorListPage from '@features/templateManagement/pages/MarketComparableFactorListPage';
import MarketComparableTemplateListPage from '@features/templateManagement/pages/MarketComparableTemplateListPage';
import MarketComparableTemplateDetailPage from '@features/templateManagement/pages/MarketComparableTemplateDetailPage';
import ComparativeTemplateListPage from '@features/templateManagement/pages/ComparativeTemplateListPage';
import ComparativeTemplateDetailPage from '@features/templateManagement/pages/ComparativeTemplateDetailPage';
import DecisionSummaryPage from '@/features/appraisal/pages/DecisionSummaryPage';
import CreateMachineryPage from '@/features/appraisal/pages/CreateMachineryPage';
import CreateLeaseAgreementLandPage from '@/features/appraisal/pages/CreateLeaseAgreementLandPage';
import CreateLeaseAgreementBuildingPage from '@/features/appraisal/pages/CreateLeaseAgreementBuildingPage';
import CreateLeaseAgreementLandBuildingPage from '@/features/appraisal/pages/CreateLeaseAgreementLandBuildingPage';
import AppraisalSearchPage from '@/features/appraisal/pages/AppraisalSearchPage';
import Appraisal360Page from '@/features/appraisal/pages/Appraisal360Page';
import { ReadOnlyPageWrapper, AppraisalReadOnlyWrapper } from '@shared/contexts/PageReadOnlyContext';
import WorkflowBuilderPage from '@features/workflowBuilder/pages/WorkflowBuilderPage';
import WorkflowListPage from '@features/workflowBuilder/pages/WorkflowListPage';
import MigrateInstancesPage from '@features/workflowBuilder/pages/MigrateInstancesPage';
import PermissionListPage from '@features/userManagement/pages/PermissionListPage';
import RoleListPage from '@features/userManagement/pages/RoleListPage';
import GroupListPage from '@features/userManagement/pages/GroupListPage';
import UserProfilePage from '@features/userManagement/pages/UserProfilePage';
import TaskLayout, { TaskIndexRedirect } from './TaskLayout';
import BlockCondoPage from '@/features/blockCondo/pages/BlockCondoPage';
import ModelDetailPage from '@/features/blockCondo/pages/ModelDetailPage';
import TowerDetailPage from '@/features/blockCondo/pages/TowerDetailPage';
import BlockVillagePage from '@/features/blockVillage/pages/BlockVillagePage';
import VillageModelDetailPage from '@/features/blockVillage/pages/ModelDetailPage';

/**
 * Redirect component that navigates to request page with requestId from context
 */
const AppraisalIndexRedirect = () => {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const requestId = useAppraisalRequestId();

  if (requestId) {
    return <Navigate to={`/appraisals/${appraisalId}/request/${requestId}`} replace />;
  }

  // Fallback if no requestId yet (shouldn't happen due to loading state in layout)
  return null;
};

export const router = createBrowserRouter([
  // Auth routes — outside Layout (no sidebar/navbar)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/callback',
    element: <CallbackPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute component={<Layout />} />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      // Appraisal Search
      {
        path: 'appraisals/search',
        element: <AppraisalSearchPage />,
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
        children: [
          { index: true, element: <TaskListingPage /> },
          { path: 'activity/:activityId', element: <ActivityTaskListPage /> },
        ],
      },
      // Notification Routes
      {
        path: 'notifications',
        element: <NotificationPage />,
      },
      // Market Comparable Routes
      {
        path: 'market-comparables',
        element: <MarketComparableListingPage />,
      },
      {
        path: 'market-comparable/detail',
        element: <CreateMarketComparablePage />,
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
        path: 'land-building-pma',
        element: <LandBuildingPMAPage />,
      },
      {
        path: 'condo-pma',
        element: <CondoPMAPage />,
      },
      // Workflow Builder Routes
      {
        path: 'workflow-builder',
        children: [
          { index: true, element: <WorkflowListPage /> },
          { path: 'new', element: <WorkflowBuilderPage /> },
          { path: ':workflowId', element: <WorkflowBuilderPage /> },
          {
            path: ':workflowId/versions/:targetVersionId/migrate',
            element: <MigrateInstancesPage />,
          },
        ],
      },
      // Admin Routes
      {
        path: 'admin',
        children: [
          { path: 'permissions', element: <PermissionListPage /> },
          { path: 'roles', element: <RoleListPage /> },
          { path: 'groups', element: <GroupListPage /> },
          { path: 'users', element: <UserProfilePage /> },
        ],
      },
      // Template Management Routes
      {
        path: 'market-comparable-factors',
        element: <MarketComparableFactorListPage />,
      },
      {
        path: 'market-comparable-templates',
        children: [
          { index: true, element: <MarketComparableTemplateListPage /> },
          { path: 'new', element: <MarketComparableTemplateDetailPage /> },
          { path: ':templateId', element: <MarketComparableTemplateDetailPage /> },
        ],
      },
      {
        path: 'comparative-templates',
        children: [
          { index: true, element: <ComparativeTemplateListPage /> },
          { path: 'new', element: <ComparativeTemplateDetailPage /> },
          { path: ':templateId', element: <ComparativeTemplateDetailPage /> },
        ],
      },
      {
        path: 'dev/property-information',
        element: <PropertyInformationPage />,
      },
      // {
      //   path: 'dev/land-detail',
      //   element: <LandDetailPage />,
      // },
      // Catch-all route for 404 pages
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  // Appraisal Application Routes (separate layout with application sidebar)
  {
    path: 'appraisals/:appraisalId',
    element: <ProtectedRoute component={<AppraisalLayout />} />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <AppraisalIndexRedirect />,
      },
      {
        path: 'request/:requestId',
        element: <ReadOnlyPageWrapper><RequestPage /></ReadOnlyPageWrapper>,
      },
      {
        path: 'administration',
        element: <AppraisalReadOnlyWrapper pageName="Administration"><AdministrationPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'appointment',
        element: <AppraisalReadOnlyWrapper pageName="Appointment & Fee"><AppointmentAndFeePage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'property-pma',
        children: [
          {
            index: true,
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><PropertyInformationPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'condo/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CondoPMAPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'land-building/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><LandBuildingPMAPage /></AppraisalReadOnlyWrapper>,
          },
        ],
      },
      {
        path: 'property',
        children: [
          {
            index: true,
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><PropertyInformationPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'land/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'land/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'building/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'building/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'condo/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateCondoPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'condo/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateCondoPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'condo/:propertyId/pma',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CondoPMAPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'land-building/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'land-building/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'land-building/:propertyId/pma',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><LandBuildingPMAPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'machinery/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMachineryPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'machinery/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMachineryPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'lease-land/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'lease-land/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'lease-building/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'lease-building/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'lease-land-building/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'lease-land-building/:propertyId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandBuildingPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'law-and-regulation/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLawAndRegulationPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'law-and-regulation/:itemId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLawAndRegulationPage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'market-comparable/new',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMarketComparablePage /></AppraisalReadOnlyWrapper>,
          },
          {
            path: 'market-comparable/:marketComparableId',
            element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMarketComparablePage /></AppraisalReadOnlyWrapper>,
          },
        ],
      },
      {
        path: 'block-condo',
        children: [
          { index: true, element: <AppraisalReadOnlyWrapper pageName="Property Information"><BlockCondoPage /></AppraisalReadOnlyWrapper> },
          { path: 'model/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><ModelDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'model/:modelId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><ModelDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'tower/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><TowerDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'tower/:towerId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><TowerDetailPage /></AppraisalReadOnlyWrapper> },
        ],
      },
      {
        path: 'block-village',
        children: [
          { index: true, element: <AppraisalReadOnlyWrapper pageName="Property Information"><BlockVillagePage /></AppraisalReadOnlyWrapper> },
          { path: 'model/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><VillageModelDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'model/:modelId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><VillageModelDetailPage /></AppraisalReadOnlyWrapper> },
        ],
      },
      {
        path: 'documents',
        element: <AppraisalReadOnlyWrapper pageName="Document Checklist"><DocumentChecklistPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'summary',
        element: <AppraisalReadOnlyWrapper pageName="Summary & Decision"><DecisionSummaryPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'groups/:groupId/pricing-analysis',
        element: <AppraisalReadOnlyWrapper pageName="Property Information"><PricingAnalysisPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'groups/:groupId/pricing-analysis/:pricingAnalysisId',
        element: <AppraisalReadOnlyWrapper pageName="Property Information"><PricingAnalysisPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: '360',
        element: <Appraisal360Page />,
      },
    ],
  },
  // Task Routes (separate layout with ownership validation)
  {
    path: 'tasks/:taskId',
    element: <ProtectedRoute component={<TaskLayout />} />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <TaskIndexRedirect />,
      },
      {
        path: 'request/:requestId',
        element: <ReadOnlyPageWrapper><RequestPage /></ReadOnlyPageWrapper>,
      },
      {
        path: 'administration',
        element: <AppraisalReadOnlyWrapper pageName="Administration"><AdministrationPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'appointment',
        element: <AppraisalReadOnlyWrapper pageName="Appointment & Fee"><AppointmentAndFeePage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'property-pma',
        children: [
          { index: true, element: <AppraisalReadOnlyWrapper pageName="Property Information"><PropertyInformationPage /></AppraisalReadOnlyWrapper> },
          { path: 'condo/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CondoPMAPage /></AppraisalReadOnlyWrapper> },
          { path: 'land-building/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><LandBuildingPMAPage /></AppraisalReadOnlyWrapper> },
        ],
      },
      {
        path: 'property',
        children: [
          { index: true, element: <AppraisalReadOnlyWrapper pageName="Property Information"><PropertyInformationPage /></AppraisalReadOnlyWrapper> },
          { path: 'land/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandPage /></AppraisalReadOnlyWrapper> },
          { path: 'land/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandPage /></AppraisalReadOnlyWrapper> },
          { path: 'building/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'building/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'condo/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateCondoPage /></AppraisalReadOnlyWrapper> },
          { path: 'condo/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateCondoPage /></AppraisalReadOnlyWrapper> },
          { path: 'condo/:propertyId/pma', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CondoPMAPage /></AppraisalReadOnlyWrapper> },
          { path: 'land-building/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'land-building/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLandBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'land-building/:propertyId/pma', element: <AppraisalReadOnlyWrapper pageName="Property Information"><LandBuildingPMAPage /></AppraisalReadOnlyWrapper> },
          { path: 'machinery/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMachineryPage /></AppraisalReadOnlyWrapper> },
          { path: 'machinery/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMachineryPage /></AppraisalReadOnlyWrapper> },
          { path: 'lease-land/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandPage /></AppraisalReadOnlyWrapper> },
          { path: 'lease-land/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandPage /></AppraisalReadOnlyWrapper> },
          { path: 'lease-building/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'lease-building/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'lease-land-building/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'lease-land-building/:propertyId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLeaseAgreementLandBuildingPage /></AppraisalReadOnlyWrapper> },
          { path: 'law-and-regulation/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLawAndRegulationPage /></AppraisalReadOnlyWrapper> },
          { path: 'law-and-regulation/:itemId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateLawAndRegulationPage /></AppraisalReadOnlyWrapper> },
          { path: 'market-comparable/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMarketComparablePage /></AppraisalReadOnlyWrapper> },
          { path: 'market-comparable/:marketComparableId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><CreateMarketComparablePage /></AppraisalReadOnlyWrapper> },
        ],
      },
      {
        path: 'block-condo',
        children: [
          { index: true, element: <AppraisalReadOnlyWrapper pageName="Property Information"><BlockCondoPage /></AppraisalReadOnlyWrapper> },
          { path: 'model/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><ModelDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'model/:modelId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><ModelDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'tower/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><TowerDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'tower/:towerId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><TowerDetailPage /></AppraisalReadOnlyWrapper> },
        ],
      },
      {
        path: 'block-village',
        children: [
          { index: true, element: <AppraisalReadOnlyWrapper pageName="Property Information"><BlockVillagePage /></AppraisalReadOnlyWrapper> },
          { path: 'model/new', element: <AppraisalReadOnlyWrapper pageName="Property Information"><VillageModelDetailPage /></AppraisalReadOnlyWrapper> },
          { path: 'model/:modelId', element: <AppraisalReadOnlyWrapper pageName="Property Information"><VillageModelDetailPage /></AppraisalReadOnlyWrapper> },
        ],
      },
      {
        path: 'documents',
        element: <AppraisalReadOnlyWrapper pageName="Document Checklist"><DocumentChecklistPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'summary',
        element: <AppraisalReadOnlyWrapper pageName="Summary & Decision"><DecisionSummaryPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'groups/:groupId/pricing-analysis',
        element: <AppraisalReadOnlyWrapper pageName="Property Information"><PricingAnalysisPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: 'groups/:groupId/pricing-analysis/:pricingAnalysisId',
        element: <AppraisalReadOnlyWrapper pageName="Property Information"><PricingAnalysisPage /></AppraisalReadOnlyWrapper>,
      },
      {
        path: '360',
        element: <Appraisal360Page />,
      },
    ],
  },
]);
