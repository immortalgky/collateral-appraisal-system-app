import { Link, useLocation } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { useGetWorkflowProgress } from '@/features/appraisal/api/workflow';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import { useGetRequestById } from '@/features/request/api/requests';
import { useGetAssignment, useGetCompanyById } from '@/features/appraisal/api/administration';
import WorkflowProgressTrack from './WorkflowProgressTrack';
import ActivityLogTable from './ActivityLogTable';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ── Detail row ────────────────────────────────────────────────────────────────

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <tr className="border-b border-gray-100 last:border-0">
    <td className="py-2.5 pr-4 text-sm text-gray-500 whitespace-nowrap w-48 align-top">{label}</td>
    <td className="py-2.5 text-sm text-gray-900">{value ?? '—'}</td>
  </tr>
);

// ── Content ───────────────────────────────────────────────────────────────────

interface ActivityTrackingContentProps {
  appraisalId: string;
}

const ActivityTrackingContent = ({ appraisalId }: ActivityTrackingContentProps) => {
  const location = useLocation();
  const { data, isLoading, isError } = useGetWorkflowProgress(appraisalId);
  const { data: appraisal } = useGetAppraisalById(appraisalId);
  const { data: request } = useGetRequestById(appraisal?.requestId);
  const { data: assignments } = useGetAssignment(appraisalId);
  const assignment = assignments?.[0];
  const { data: company } = useGetCompanyById(assignment?.assigneeCompanyId ?? null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-500">Failed to load workflow progress</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="diagram-project" style="regular" className="w-10 h-10 text-gray-300" />
        <p className="text-sm text-gray-500">No workflow data available</p>
      </div>
    );
  }

  const customer = request?.customers?.[0];
  const loanDetail = request?.detail?.loanDetail;
  const appointment = request?.detail?.appointment;

  const appraiserParts = [
    company?.companyName,
    assignment?.externalAppraiserLicense && assignment?.externalAppraiserName
      ? `${assignment.externalAppraiserLicense} - ${assignment.externalAppraiserName}`
      : (assignment?.externalAppraiserName ?? null),
  ].filter(Boolean);
  const appraiserDisplay = appraiserParts.length > 0 ? appraiserParts.join(' : ') : null;

  const flowType = assignment?.assignmentType ?? data.routeType;

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Detail section */}
      <FormCard title="Appraisal Detail" icon="square-info" iconColor="emerald">
        <table className="w-full">
          <tbody>
            <DetailRow label="Appraisal Number" value={appraisal?.appraisalNumber} />
            <DetailRow label="Ref Appraisal Number" value={null} />
            <DetailRow label="Customer Name" value={customer?.name} />
            <DetailRow
              label="Loan Limit"
              value={loanDetail?.facilityLimit != null ? formatCurrency(loanDetail.facilityLimit) : null}
            />
            <DetailRow
              label="Appointment Date"
              value={formatDateTime(appointment?.appointmentDateTime)}
            />
            {appraiserDisplay && (
              <DetailRow label="Appraiser" value={appraiserDisplay} />
            )}
            <DetailRow label="Flow" value={flowType} />
            <DetailRow label="Status" value={appraisal?.status} />
          </tbody>
        </table>
        {/* View Full Detail link inside the appraisal detail card */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <Link
            to={`/appraisals/${appraisalId}`}
            state={{ returnPath: location.pathname + location.search }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Icon name="arrow-up-right-from-square" style="solid" className="w-3.5 h-3.5" />
            View Full Detail
          </Link>
        </div>
      </FormCard>

      {/* Phase Progress Track */}
      <FormCard title="Workflow Progress" icon="diagram-project" iconColor="blue">
        <WorkflowProgressTrack
          steps={data.steps}
          routeType={data.routeType}
          activityLog={data.activityLog}
        />
      </FormCard>

      {/* Activity Log */}
      <FormCard title="Activity Log" icon="clock-rotate-left" iconColor="teal">
        <ActivityLogTable activityLog={data.activityLog} />
      </FormCard>
    </div>
  );
};

export default ActivityTrackingContent;
