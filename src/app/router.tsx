import { createBrowserRouter, Navigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from './Layout';
import AppraisalLayout from './AppraisalLayout';
import HomePage from '../features/dashboard/pages/HomePage';
import CalendarPage from '../features/dashboard/pages/CalendarPage';
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

function TaskPageDispatcher() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId');
  return activityId ? <ActivityTaskListPage /> : <TaskListingPage />;
}
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
import ActivityTrackingPage from '@/features/appraisal/pages/ActivityTrackingPage';
import CreateMachineryPage from '@/features/appraisal/pages/CreateMachineryPage';
import CreateLeaseAgreementLandPage from '@/features/appraisal/pages/CreateLeaseAgreementLandPage';
import CreateLeaseAgreementBuildingPage from '@/features/appraisal/pages/CreateLeaseAgreementBuildingPage';
import CreateLeaseAgreementLandBuildingPage from '@/features/appraisal/pages/CreateLeaseAgreementLandBuildingPage';
import AppraisalSearchPage from '@/features/appraisal/pages/AppraisalSearchPage';
import AppraisalListPage from '@/features/appraisal/pages/AppraisalListPage';
import Appraisal360Page from '@/features/appraisal/pages/Appraisal360Page';
import {
  ReadOnlyPageWrapper,
  AppraisalReadOnlyWrapper,
} from '@shared/contexts/PageReadOnlyContext';
import WorkflowBuilderPage from '@features/workflowBuilder/pages/WorkflowBuilderPage';
import ProvideDocumentsTaskPage from '@/features/document-followup/pages/ProvideDocumentsTaskPage';
import WorkflowListPage from '@features/workflowBuilder/pages/WorkflowListPage';
import MigrateInstancesPage from '@features/workflowBuilder/pages/MigrateInstancesPage';
import PermissionListPage from '@features/userManagement/pages/PermissionListPage';
import RoleListPage from '@features/userManagement/pages/RoleListPage';
import GroupListPage from '@features/userManagement/pages/GroupListPage';
import UserProfilePage from '@features/userManagement/pages/UserProfilePage';
import TaskLayout, { TaskIndexRedirect } from './TaskLayout';
import OpeningTaskPage from '@/features/task/pages/OpeningTaskPage';
import BlockProjectPage from '@/features/blockProject/pages/BlockProjectPage';
import ModelDetailPage from '@/features/blockProject/pages/ModelDetailPage';
import TowerDetailPage from '@/features/blockProject/pages/TowerDetailPage';
import MeetingListPage from '@/features/meeting/pages/MeetingListPage';
import MeetingQueuePage from '@/features/meeting/pages/MeetingQueuePage';
import MeetingDetailPage from '@/features/meeting/pages/MeetingDetailPage';
import CommitteeAdminPage from '@/features/committee/pages/CommitteeAdminPage';
import RoleProtectedRoute from '@shared/components/RoleProtectedRoute';
import MenuListPage from '@features/menuManagement/pages/MenuListPage';
import MenuEditPage from '@features/menuManagement/pages/MenuEditPage';
import QuotationSelectionPage from '@/features/quotation/pages/QuotationSelectionPage';
import QuotationListingPage from '@/features/quotation/pages/QuotationListingPage';
import NewQuotationPage from '@/features/quotation/pages/NewQuotationPage';
import ExtCompanyInvitationListPage from '@/features/quotation/pages/ExtCompanyInvitationListPage';
import ExtCompanySubmitQuotationPage from '@/features/quotation/pages/ExtCompanySubmitQuotationPage';
import AdminQuotationTaskPage from '@/features/quotation/pages/AdminQuotationTaskPage';
import AdminCompanyQuotationDetailPage from '@/features/quotation/pages/AdminCompanyQuotationDetailPage';

/**
 * Thin wrappers that bind PricingAnalysisPage to a project-model subject.
 * modelId and pricingAnalysisId are read from route params inside PricingAnalysisPage.
 */
const CondoModelPricingAnalysisPage = () => {
  const { modelId } = useParams<{ modelId: string }>();
  return (
    <PricingAnalysisPage
      subject={{ kind: 'projectModel', modelId: modelId ?? '', routePrefix: `block-condo/model/${modelId}` }}
    />
  );
};

const VillageModelPricingAnalysisPage = () => {
  const { modelId } = useParams<{ modelId: string }>();
  return (
    <PricingAnalysisPage
      subject={{ kind: 'projectModel', modelId: modelId ?? '', routePrefix: `block-village/model/${modelId}` }}
    />
  );
};

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
      // Appraisal List (enhanced search with filters, smart views, export)
      {
        path: 'appraisals/list',
        element: <AppraisalListPage />,
      },
      // Full calendar view (month grid + agenda)
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      // Appraisal Search (global cross-entity search)
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
        children: [{ index: true, element: <TaskPageDispatcher /> }],
      },
      // Meeting Routes (tier-3 approval gate)
      {
        path: 'meetings',
        element: (
          <RoleProtectedRoute
            allowedRoles={['Admin', 'IntAdmin', 'MeetingSecretary', 'AppraisalCommittee']}
            requiredPermission="MEETING_MANAGE"
          />
        ),
        children: [
          { index: true, element: <MeetingListPage /> },
          { path: 'queue', element: <MeetingQueuePage /> },
          { path: ':meetingId', element: <MeetingDetailPage /> },
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
          { path: 'committees', element: <CommitteeAdminPage /> },
          // Menu management — gated by MENU_MANAGE permission
          {
            path: 'menus',
            element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="MENU_MANAGE" />,
            children: [
              { index: true, element: <MenuListPage /> },
              { path: 'new', element: <MenuEditPage /> },
              { path: ':menuId', element: <MenuEditPage /> },
            ],
          },
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
      // ─── Quotation Routes ────────────────────────────────────────────────
      // RequestMaker / Admin selection page
      {
        path: 'quotations',
        element: <RoleProtectedRoute allowedRoles={['RequestMaker', 'Admin']} />,
        children: [
          { index: true, element: <QuotationListingPage /> },
          { path: 'new', element: <NewQuotationPage /> },
          { path: ':id', element: <QuotationSelectionPage /> },
          {
            path: ':quotationRequestId/companies/:companyQuotationId',
            element: <AdminCompanyQuotationDetailPage />,
          },
        ],
      },
      // ExtCompany portal
      {
        path: 'ext/quotations',
        element: <RoleProtectedRoute allowedRoles={['ExtAdmin', 'ExtAppraisalChecker']} />,
        children: [
          { index: true, element: <ExtCompanyInvitationListPage /> },
          { path: ':id', element: <ExtCompanySubmitQuotationPage /> },
        ],
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
        element: (
          <ReadOnlyPageWrapper>
            <RequestPage />
          </ReadOnlyPageWrapper>
        ),
      },
      {
        path: 'administration',
        element: (
          <AppraisalReadOnlyWrapper pageName="Administration">
            <AdministrationPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'appointment',
        element: (
          <AppraisalReadOnlyWrapper pageName="Appointment & Fee">
            <AppointmentAndFeePage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'property-pma',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <PropertyInformationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <LandBuildingPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'property',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <PropertyInformationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateCondoPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateCondoPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/:propertyId/pma',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/:propertyId/pma',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <LandBuildingPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'machinery/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMachineryPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'machinery/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMachineryPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land-building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'law-and-regulation/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLawAndRegulationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'law-and-regulation/:itemId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLawAndRegulationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'market-comparable/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMarketComparablePage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'market-comparable/:marketComparableId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMarketComparablePage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'block-condo',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <BlockProjectPage projectType="Condo" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="Condo" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="Condo" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis/:pricingAnalysisId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'tower/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <TowerDetailPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'tower/:towerId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <TowerDetailPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'block-village',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <BlockProjectPage projectType="LandAndBuilding" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LandAndBuilding" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LandAndBuilding" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <VillageModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis/:pricingAnalysisId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <VillageModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'documents',
        element: (
          <AppraisalReadOnlyWrapper pageName="Document Checklist">
            <DocumentChecklistPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'summary',
        element: (
          <AppraisalReadOnlyWrapper pageName="Summary & Decision">
            <DecisionSummaryPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'activity-tracking',
        element: <ActivityTrackingPage />,
      },
      {
        path: 'groups/:groupId/pricing-analysis',
        element: (
          <AppraisalReadOnlyWrapper pageName="Property Information">
            <PricingAnalysisPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'groups/:groupId/pricing-analysis/:pricingAnalysisId',
        element: (
          <AppraisalReadOnlyWrapper pageName="Property Information">
            <PricingAnalysisPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: '360',
        element: <Appraisal360Page />,
      },
    ],
  },
  // Task Opening Gate — runs before TaskLayout, no sidebar
  {
    path: 'tasks/:taskId/opening',
    element: <ProtectedRoute component={<OpeningTaskPage />} />,
    errorElement: <ErrorPage />,
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
        element: (
          <ReadOnlyPageWrapper>
            <RequestPage />
          </ReadOnlyPageWrapper>
        ),
      },
      {
        path: 'administration',
        element: (
          <AppraisalReadOnlyWrapper pageName="Administration">
            <AdministrationPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'appointment',
        element: (
          <AppraisalReadOnlyWrapper pageName="Appointment & Fee">
            <AppointmentAndFeePage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'property-pma',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <PropertyInformationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <LandBuildingPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'property',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <PropertyInformationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateCondoPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateCondoPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'condo/:propertyId/pma',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'land-building/:propertyId/pma',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <LandBuildingPMAPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'machinery/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMachineryPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'machinery/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMachineryPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land-building/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-land-building/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementLandBuildingPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'law-and-regulation/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLawAndRegulationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'law-and-regulation/:itemId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLawAndRegulationPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'market-comparable/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMarketComparablePage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'market-comparable/:marketComparableId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateMarketComparablePage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'block-condo',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <BlockProjectPage projectType="Condo" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="Condo" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="Condo" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis/:pricingAnalysisId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CondoModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'tower/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <TowerDetailPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'tower/:towerId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <TowerDetailPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'block-village',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <BlockProjectPage projectType="LandAndBuilding" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LandAndBuilding" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LandAndBuilding" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <VillageModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId/pricing-analysis/:pricingAnalysisId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <VillageModelPricingAnalysisPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
        ],
      },
      {
        path: 'documents',
        element: (
          <AppraisalReadOnlyWrapper pageName="Document Checklist">
            <DocumentChecklistPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'summary',
        element: (
          <AppraisalReadOnlyWrapper pageName="Summary & Decision">
            <DecisionSummaryPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'activity-tracking',
        element: <ActivityTrackingPage />,
      },
      {
        path: 'groups/:groupId/pricing-analysis',
        element: (
          <AppraisalReadOnlyWrapper pageName="Property Information">
            <PricingAnalysisPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: 'groups/:groupId/pricing-analysis/:pricingAnalysisId',
        element: (
          <AppraisalReadOnlyWrapper pageName="Property Information">
            <PricingAnalysisPage />
          </AppraisalReadOnlyWrapper>
        ),
      },
      {
        path: '360',
        element: <Appraisal360Page />,
      },
      {
        path: 'provide-documents',
        element: <ProvideDocumentsTaskPage />,
      },
      // ─── Quotation task sub-routes ────────────────────────────────────────
      // ext-collect-submissions: ExtCompany submits their bid
      { path: 'quotation/submit', element: <ExtCompanySubmitQuotationPage /> },
      // ext-respond-negotiation: ExtCompany responds to a negotiation round
      { path: 'quotation/respond-negotiation', element: <ExtCompanySubmitQuotationPage /> },
      // rm-pick-winner: RM selects the tentative winner from the shortlist
      { path: 'quotation/pick-winner', element: <QuotationSelectionPage /> },
      // admin-review-submissions: Admin reviews bids and builds shortlist
      { path: 'quotation/review', element: <AdminQuotationTaskPage /> },
      // admin-finalize: Admin finalizes the quotation with the winner
      { path: 'quotation/finalize', element: <AdminQuotationTaskPage /> },
    ],
  },
]);
