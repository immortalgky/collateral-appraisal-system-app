import { createBrowserRouter, Navigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from './Layout';
import AppraisalLayout from './AppraisalLayout';
import { lazy } from 'react';
// Eager — structural shell, route guards, read-only wrappers, and helpers that
// must be available immediately (no spinner on the critical path).
import LoginPage from '@features/auth/pages/LoginPage';
import CallbackPage from '@features/auth/pages/CallbackPage.tsx';
import ErrorPage from '@shared/pages/ErrorPage';
import NotFoundPage from '@shared/pages/NotFoundPage';
import { useAppraisalRequestId } from '@/features/appraisal/context/AppraisalContext';
import { ProtectedRoute } from '@features/auth/components';
import {
  AppraisalReadOnlyWrapper,
  ReadOnlyPageWrapper,
} from '@shared/contexts/PageReadOnlyContext';
import TaskLayout, { TaskIndexRedirect } from './TaskLayout';
import RoleProtectedRoute from '@shared/components/RoleProtectedRoute';

// Page components — lazy-loaded so each route ships as its own on-demand chunk.
// A <Suspense> boundary wraps the <Outlet/> in each layout (plus a top-level one
// around <RouterProvider/> in App.tsx) to catch these while their chunk loads.
const HomePage = lazy(() => import('../features/dashboard/pages/HomePage'));
const CalendarPage = lazy(() => import('../features/dashboard/pages/CalendarPage'));
const RequestListingPage = lazy(() => import('@/features/request/pages/RequestListingPage'));
const RequestPage = lazy(() => import('@/features/request/pages/RequestPage'));
const PropertyInformationPage = lazy(
  () => import('@/features/appraisal/pages/PropertyInformationPage')
);
const DocumentChecklistPage = lazy(
  () => import('@/features/appraisal/pages/DocumentChecklistPage')
);
const AdministrationPage = lazy(() => import('@/features/appraisal/pages/AdministrationPage'));
const AppointmentAndFeePage = lazy(
  () => import('@/features/appraisal/pages/AppointmentAndFeePage')
);
const TaskListingPage = lazy(() => import('@/features/task/pages/TaskListingPage'));
const ActivityTaskListPage = lazy(() => import('@/features/task/pages/ActivityTaskListPage'));
const NotificationPage = lazy(() => import('@/features/notification/pages/NotificationPage'));
const CreateMarketComparablePage = lazy(
  () => import('@/features/appraisal/pages/CreateMarketComparablePage')
);
const MarketComparableListingPage = lazy(
  () => import('@/features/appraisal/pages/MarketComparableListingPage')
);
const CreateLandPage = lazy(() => import('../features/appraisal/pages/CreateLandPage'));
const CreateBuildingPage = lazy(() => import('../features/appraisal/pages/CreateBuildingPage'));
const CreateCondoPage = lazy(() => import('@/features/appraisal/pages/CreateCondoPage'));
const CreateLandBuildingPage = lazy(
  () => import('@/features/appraisal/pages/CreateLandBuildingPage')
);
const CreateLawAndRegulationPage = lazy(
  () => import('@/features/appraisal/pages/CreateLawAndRegulationPage')
);
const LandBuildingPMAPage = lazy(() => import('@/features/appraisal/pages/LandBuildingPMAPage'));
const CondoPMAPage = lazy(() => import('@/features/appraisal/pages/CondoPMAPage'));
const PricingAnalysisPage = lazy(
  () => import('@features/pricingAnalysis/pages/PricingAnalysisPage')
);
const MarketComparableFactorListPage = lazy(
  () => import('@features/templateManagement/pages/MarketComparableFactorListPage')
);
const MarketComparableTemplateListPage = lazy(
  () => import('@features/templateManagement/pages/MarketComparableTemplateListPage')
);
const MarketComparableTemplateDetailPage = lazy(
  () => import('@features/templateManagement/pages/MarketComparableTemplateDetailPage')
);
const ComparativeTemplateListPage = lazy(
  () => import('@features/templateManagement/pages/ComparativeTemplateListPage')
);
const ComparativeTemplateDetailPage = lazy(
  () => import('@features/templateManagement/pages/ComparativeTemplateDetailPage')
);
const DecisionSummaryPage = lazy(() => import('@/features/appraisal/pages/DecisionSummaryPage'));
const ActivityTrackingPage = lazy(
  () => import('@/features/appraisal/pages/ActivityTrackingPage')
);
const CreateMachineryPage = lazy(() => import('@/features/appraisal/pages/CreateMachineryPage'));
const CreateLeaseAgreementLandPage = lazy(
  () => import('@/features/appraisal/pages/CreateLeaseAgreementLandPage')
);
const CreateLeaseAgreementBuildingPage = lazy(
  () => import('@/features/appraisal/pages/CreateLeaseAgreementBuildingPage')
);
const CreateLeaseAgreementLandBuildingPage = lazy(
  () => import('@/features/appraisal/pages/CreateLeaseAgreementLandBuildingPage')
);
const CreateLeaseAgreementCondoPage = lazy(
  () => import('@/features/appraisal/pages/CreateLeaseAgreementCondoPage')
);
const AppraisalSearchPage = lazy(() => import('@/features/appraisal/pages/AppraisalSearchPage'));
const AppraisalListPage = lazy(() => import('@/features/appraisal/pages/AppraisalListPage'));
const Appraisal360Page = lazy(() => import('@/features/appraisal/pages/Appraisal360Page'));
const WorkflowBuilderPage = lazy(
  () => import('@features/workflowBuilder/pages/WorkflowBuilderPage')
);
const ProvideDocumentsTaskPage = lazy(
  () => import('@/features/document-followup/pages/ProvideDocumentsTaskPage')
);
const FeeAppointmentApprovalTaskPage = lazy(
  () => import('@/features/feeAppointmentApproval/pages/FeeAppointmentApprovalTaskPage')
);
const FeeApprovalTierPage = lazy(
  () => import('@/features/feeApprovalConfig/pages/FeeApprovalTierPage')
);
const AppointmentApprovalRulePage = lazy(
  () => import('@/features/feeApprovalConfig/pages/AppointmentApprovalRulePage')
);
const PasswordPolicyConfigPage = lazy(
  () => import('@/features/userManagement/admin/pages/PasswordPolicyConfigPage')
);
const EvaluationConfigPage = lazy(
  () => import('@/features/serviceQualityEvaluation/admin/pages/EvaluationConfigPage')
);
const WorkflowListPage = lazy(() => import('@features/workflowBuilder/pages/WorkflowListPage'));
const MigrateInstancesPage = lazy(
  () => import('@features/workflowBuilder/pages/MigrateInstancesPage')
);
const PermissionListPage = lazy(() => import('@features/userManagement/pages/PermissionListPage'));
const RoleListPage = lazy(() => import('@features/userManagement/pages/RoleListPage'));
const GroupListPage = lazy(() => import('@features/userManagement/pages/GroupListPage'));
const UserProfilePage = lazy(() => import('@features/userManagement/pages/UserProfilePage'));
const TeamListPage = lazy(() => import('@features/userManagement/pages/TeamListPage'));
const AuditLogPage = lazy(() => import('@features/userManagement/pages/AuditLogPage'));
const CompanyListPage = lazy(() => import('@features/userManagement/pages/CompanyListPage'));
const AccessReportPage = lazy(() => import('@features/userManagement/pages/AccessReportPage'));
const OpeningTaskPage = lazy(() => import('@/features/task/pages/OpeningTaskPage'));
const BlockProjectPage = lazy(() => import('@/features/blockProject/pages/BlockProjectPage'));
const ModelDetailPage = lazy(() => import('@/features/blockProject/pages/ModelDetailPage'));
const TowerDetailPage = lazy(() => import('@/features/blockProject/pages/TowerDetailPage'));
const MeetingListPage = lazy(() => import('@/features/meeting/pages/MeetingListPage'));
const MeetingQueuePage = lazy(() => import('@/features/meeting/pages/MeetingQueuePage'));
const MeetingDetailPage = lazy(() => import('@/features/meeting/pages/MeetingDetailPage'));
const CommitteeAdminPage = lazy(() => import('@/features/committee/pages/CommitteeAdminPage'));
const MenuListPage = lazy(() => import('@features/menuManagement/pages/MenuListPage'));
const MenuEditPage = lazy(() => import('@features/menuManagement/pages/MenuEditPage'));
const CollateralCatalogPage = lazy(
  () => import('@/features/collateralMaster/pages/CollateralCatalogPage')
);
const CollateralMasterDetailPage = lazy(
  () => import('@/features/collateralMaster/pages/CollateralMasterDetailPage')
);
const BackfillReportPage = lazy(
  () => import('@/features/collateralMaster/pages/BackfillReportPage')
);
const QuotationSelectionPage = lazy(
  () => import('@/features/quotation/pages/QuotationSelectionPage')
);
const QuotationListingPage = lazy(() => import('@/features/quotation/pages/QuotationListingPage'));
const NewQuotationPage = lazy(() => import('@/features/quotation/pages/NewQuotationPage'));
const ExtCompanyInvitationListPage = lazy(
  () => import('@/features/quotation/pages/ExtCompanyInvitationListPage')
);
const ExtCompanySubmitQuotationPage = lazy(
  () => import('@/features/quotation/pages/ExtCompanySubmitQuotationPage')
);
const AdminQuotationTaskPage = lazy(
  () => import('@/features/quotation/pages/AdminQuotationTaskPage')
);
const AdminCompanyQuotationDetailPage = lazy(
  () => import('@/features/quotation/pages/AdminCompanyQuotationDetailPage')
);
const ServiceQualityEvaluationListPage = lazy(
  () => import('@/features/serviceQualityEvaluation/pages/ServiceQualityEvaluationListPage')
);
const ServiceQualityEvaluationDetailPage = lazy(
  () => import('@/features/serviceQualityEvaluation/pages/ServiceQualityEvaluationDetailPage')
);
const ExtInvoiceListPage = lazy(() => import('@/features/invoice/pages/ExtInvoiceListPage'));
const ExtCreateInvoicePage = lazy(() => import('@/features/invoice/pages/ExtCreateInvoicePage'));
const ExtInvoiceDetailPage = lazy(() => import('@/features/invoice/pages/ExtInvoiceDetailPage'));
const IntInvoiceListPage = lazy(() => import('@/features/invoice/pages/IntInvoiceListPage'));
const IntInvoiceDetailPage = lazy(() => import('@/features/invoice/pages/IntInvoiceDetailPage'));
const IntBulkPaymentPage = lazy(() => import('@/features/invoice/pages/IntBulkPaymentPage'));
const WebhookDeliveryListPage = lazy(
  () => import('@features/webhookAdmin/pages/WebhookDeliveryListPage')
);
const WebhookSubscriptionListPage = lazy(
  () => import('@features/webhookAdmin/pages/WebhookSubscriptionListPage')
);
const OAuthClientListPage = lazy(() => import('@features/oauthAdmin/pages/OAuthClientListPage'));
const OAuthScopeListPage = lazy(() => import('@features/oauthAdmin/pages/OAuthScopeListPage'));
const OAuthTokenListPage = lazy(() => import('@features/oauthAdmin/pages/OAuthTokenListPage'));
const LogViewerPage = lazy(() => import('@features/common/logViewer/pages/LogViewerPage'));
const SupportingDataMaintenanceDetailListPage = lazy(() =>
  import('@/features/supportingDataMaintenance/pages/SupportingDataMaintenanceDetailListPage').then(
    m => ({ default: m.SupportingDataMaintenanceDetailListPage })
  )
);
const ReappraisalListPage = lazy(() => import('@/features/reappraisal/pages/ReappraisalListPage'));
const ReappraisalDetailPage = lazy(
  () => import('@/features/reappraisal/pages/ReappraisalDetailPage')
);
const GenerateReappraisalTestPage = lazy(
  () => import('@/features/reappraisal/pages/GenerateReappraisalTestPage')
);
const TaskMonitorPage = lazy(() => import('@/features/taskMonitor/pages/TaskMonitorPage'));
const PersonTasksPage = lazy(() => import('@/features/taskMonitor/pages/PersonTasksPage'));
const MonitoringPage = lazy(() => import('@/features/common/monitoring/pages/MonitoringPage'));
const HistorySearchPage = lazy(
  () => import('@/features/common/historySearch/pages/HistorySearchPage')
);
const BlockUnitMaintenancePage = lazy(
  () => import('@/features/blockUnitMaintenance/pages/BlockUnitMaintenancePage')
);
const BlockUnitMaintenanceDetailPage = lazy(
  () => import('@/features/blockUnitMaintenance/pages/BlockUnitMaintenanceDetailPage')
);
const BlockReappraisalListPage = lazy(
  () => import('@/features/blockReappraisal/pages/BlockReappraisalListPage')
);
const BlockReappraisalDetailPage = lazy(
  () => import('@/features/blockReappraisal/pages/BlockReappraisalDetailPage')
);
const SupportingDataMaintenanceListPage = lazy(() =>
  import('@/features/supportingDataMaintenance/pages/SupportingDataMaintenanceListPage').then(m => ({
    default: m.SupportingDataMaintenanceListPage,
  }))
);
const CreateSupportingDataPage = lazy(() =>
  import('@/features/supportingDataMaintenance/pages/CreateSupportingDataPage').then(m => ({
    default: m.CreateSupportingDataPage,
  }))
);
const StepValidationRulesPage = lazy(
  () => import('@features/workflowAdmin/pages/StepValidationRulesPage')
);
const TaskAssignmentConfigPage = lazy(
  () => import('@features/workflowAssignmentConfig/pages/TaskAssignmentConfigPage')
);
const CompanyRoundRobinConfigPage = lazy(
  () => import('@features/companyRoundRobinConfig/pages/CompanyRoundRobinConfigPage')
);
const ReportTestPage = lazy(() => import('@features/reportGeneration/pages/ReportTestPage'));
const OperationalReportRoute = lazy(
  () => import('@features/common/operationalReports/pages/OperationalReportRoute')
);

/**
 * Thin wrappers that bind PricingAnalysisPage to a project-model subject.
 * modelId and pricingAnalysisId are read from route params inside PricingAnalysisPage.
 */
const CondoModelPricingAnalysisPage = () => {
  const { modelId } = useParams<{ modelId: string }>();
  return (
    <PricingAnalysisPage
      subject={{
        kind: 'projectModel',
        modelId: modelId ?? '',
        routePrefix: `block-condo/model/${modelId}`,
      }}
    />
  );
};

const VillageModelPricingAnalysisPage = () => {
  const { modelId } = useParams<{ modelId: string }>();
  return (
    <PricingAnalysisPage
      subject={{
        kind: 'projectModel',
        modelId: modelId ?? '',
        routePrefix: `block-village/model/${modelId}`,
      }}
    />
  );
};

function TaskPageDispatcher() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId');
  return activityId ? <ActivityTaskListPage /> : <TaskListingPage />;
}

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
      // Task Monitor — supervisor view for reassigning tasks across monitored groups
      {
        path: 'task-monitor',
        element: <TaskMonitorPage />,
      },
      {
        path: 'task-monitor/:username',
        element: <PersonTasksPage />,
      },
      // Monitoring — FSD §2.6.8 tabbed overview (single route, tab driven by ?tab= query param)
      {
        path: 'monitoring',
        element: <MonitoringPage />,
      },
      // ─── Operational Reports (RCAS001–012) ─────────────────────────────────
      // Menu items at /reports/operational/rcasNNN are server-seeded and gated
      // by REPORT_OP_VIEW. The :slug param is matched to a ReportConfig in
      // OperationalReportRoute, so a single route handles all 12 reports.
      {
        element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="REPORT_OP_VIEW" />,
        children: [
          {
            path: 'reports/operational/:slug',
            element: <OperationalReportRoute />,
          },
        ],
      },
      // History Search (Pin) — FSD §2.6.7 geo-filtered appraisal + MC map view
      {
        path: 'standalone/history-search',
        element: <HistorySearchPage />,
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
          {
            path: 'teams',
            element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="TEAM_MANAGE" />,
            children: [{ index: true, element: <TeamListPage /> }],
          },
          {
            path: 'audit-logs',
            element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="AUTH_AUDIT_VIEW" />,
            children: [{ index: true, element: <AuditLogPage /> }],
          },
          {
            path: 'companies',
            element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="COMPANY_MANAGE" />,
            children: [{ index: true, element: <CompanyListPage /> }],
          },
          {
            path: 'password-policy',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="PASSWORD_POLICY_MANAGE" />
            ),
            children: [{ index: true, element: <PasswordPolicyConfigPage /> }],
          },
          {
            path: 'access-report',
            element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="AUTH_AUDIT_VIEW" />,
            children: [{ index: true, element: <AccessReportPage /> }],
          },
          { path: 'committees', element: <CommitteeAdminPage /> },
          { path: 'reports/test', element: <ReportTestPage /> },
          { path: 'fee-approval-tiers', element: <FeeApprovalTierPage /> },
          { path: 'appointment-approval-rule', element: <AppointmentApprovalRulePage /> },
          { path: 'evaluation-config', element: <EvaluationConfigPage /> },
          { path: 'webhook-deliveries', element: <WebhookDeliveryListPage /> },
          {
            path: 'webhook-subscriptions',
            element: (
              <RoleProtectedRoute
                allowedRoles={[]}
                requiredPermission="WEBHOOK_SUBSCRIPTIONS_MANAGE"
              />
            ),
            children: [{ index: true, element: <WebhookSubscriptionListPage /> }],
          },
          {
            path: 'oauth-clients',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="OAUTH_CLIENTS_MANAGE" />
            ),
            children: [{ index: true, element: <OAuthClientListPage /> }],
          },
          {
            path: 'oauth-scopes',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="OAUTH_SCOPES_MANAGE" />
            ),
            children: [{ index: true, element: <OAuthScopeListPage /> }],
          },
          {
            path: 'oauth-tokens',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="OAUTH_TOKENS_REVOKE" />
            ),
            children: [{ index: true, element: <OAuthTokenListPage /> }],
          },
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
          // Log viewer — gated by LOGS_VIEW permission
          {
            path: 'logs',
            element: <RoleProtectedRoute allowedRoles={[]} requiredPermission="LOGS_VIEW" />,
            children: [{ index: true, element: <LogViewerPage /> }],
          },
          // Step validation rules — gated by WORKFLOW_ADMIN permission
          {
            path: 'workflow-step-validation',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="WORKFLOW_ADMIN" />
            ),
            children: [{ index: true, element: <StepValidationRulesPage /> }],
          },
          // Task assignment overrides — gated by WORKFLOW_ADMIN permission
          {
            path: 'workflow-assignment-config',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="WORKFLOW_ADMIN" />
            ),
            children: [{ index: true, element: <TaskAssignmentConfigPage /> }],
          },
          // External-company round-robin pools — gated by WORKFLOW_ADMIN permission
          {
            path: 'workflow-roundrobin-config',
            element: (
              <RoleProtectedRoute allowedRoles={[]} requiredPermission="WORKFLOW_ADMIN" />
            ),
            children: [{ index: true, element: <CompanyRoundRobinConfigPage /> }],
          },
          // Collateral master admin — gated by COLLATERAL_ADMIN permission
          {
            path: 'collateral-masters',
            element: <RoleProtectedRoute allowedRoles={['Admin', 'IntAdmin']} />,
            children: [
              { index: true, element: <CollateralCatalogPage /> },
              { path: 'backfill', element: <BackfillReportPage /> },
              { path: ':masterId', element: <CollateralMasterDetailPage /> },
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
        element: <RoleProtectedRoute allowedRoles={['RequestMaker', 'Admin', 'IntAdmin']} />,
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
      // ─── Invoice Routes ─────────────────────────────────────────────────────
      // ExtCompany invoice portal
      {
        path: 'ext/invoices',
        element: <RoleProtectedRoute allowedRoles={['ExtAdmin']} />,
        children: [
          { index: true, element: <ExtInvoiceListPage /> },
          { path: 'new', element: <ExtCreateInvoicePage /> },
          { path: ':id', element: <ExtInvoiceDetailPage /> },
          { path: ':id/edit', element: <ExtCreateInvoicePage /> },
        ],
      },
      // IntAdmin invoice management
      {
        path: 'admin/invoices',
        element: <RoleProtectedRoute allowedRoles={['IntAdmin', 'Admin']} />,
        children: [
          { index: true, element: <IntInvoiceListPage /> },
          { path: 'bulk-payment', element: <IntBulkPaymentPage /> },
          { path: ':id', element: <IntInvoiceDetailPage /> },
        ],
      },
      // ─── Block Unit Maintenance ─────────────────────────────────────────────
      {
        path: 'standalone/block-unit-maintenance',
        element: <BlockUnitMaintenancePage />,
      },
      {
        path: 'standalone/block-unit-maintenance/:collateralMasterId',
        element: <BlockUnitMaintenanceDetailPage />,
      },
      // ─── Service Quality Evaluation Routes ──────────────────────────────────
      {
        path: 'standalone/service-quality-evaluation',
        element: <ServiceQualityEvaluationListPage />,
      },
      {
        path: 'standalone/service-quality-evaluation/:appraisalId',
        element: <ServiceQualityEvaluationDetailPage />,
      },
      // support data maintenance
      {
        path: 'standalone/supporting-data-maintenance',
        element: <SupportingDataMaintenanceListPage />,
      },
      {
        path: 'standalone/supporting-data-maintenance/new',
        element: <SupportingDataMaintenanceDetailListPage />,
      },
      {
        path: 'standalone/supporting-data-maintenance/:supportingId',
        element: <SupportingDataMaintenanceDetailListPage />,
      },
      {
        path: 'standalone/supporting-data-maintenance/:supportingId/data/new',
        element: <CreateSupportingDataPage />,
      },
      {
        path: 'standalone/supporting-data-maintenance/:supportingId/data/:id',
        element: <CreateSupportingDataPage />,
      },
      // ─── Block Project Reappraisal ──────────────────────────────────────────
      {
        path: 'standalone/block-reappraisal',
        element: <BlockReappraisalListPage />,
      },
      {
        path: 'standalone/block-reappraisal/:collateralMasterId',
        element: <BlockReappraisalDetailPage />,
      },
      // ─── Periodical Reappraisal (AS400) ────────────────────────────────────
      {
        path: 'reappraisal',
        children: [
          { index: true, element: <ReappraisalListPage /> },
          { path: ':id', element: <ReappraisalDetailPage /> },
          { path: 'generate-test-file', element: <GenerateReappraisalTestPage /> },
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
            path: 'lease-condo/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementCondoPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-condo/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementCondoPage />
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
                <BlockProjectPage projectType="U" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="U" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="U" />
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
        ],
      },
      {
        path: 'block-village',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <BlockProjectPage projectType="LB" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LB" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LB" />
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
          <AppraisalReadOnlyWrapper pageName="Request Information">
            <RequestPage />
          </AppraisalReadOnlyWrapper>
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
            path: 'lease-condo/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementCondoPage />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'lease-condo/:propertyId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <CreateLeaseAgreementCondoPage />
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
                <BlockProjectPage projectType="U" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="U" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="U" />
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
        ],
      },
      {
        path: 'block-village',
        children: [
          {
            index: true,
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <BlockProjectPage projectType="LB" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/new',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LB" />
              </AppraisalReadOnlyWrapper>
            ),
          },
          {
            path: 'model/:modelId',
            element: (
              <AppraisalReadOnlyWrapper pageName="Property Information">
                <ModelDetailPage projectType="LB" />
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
      {
        path: 'fee-appointment-approval',
        element: <FeeAppointmentApprovalTaskPage />,
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
