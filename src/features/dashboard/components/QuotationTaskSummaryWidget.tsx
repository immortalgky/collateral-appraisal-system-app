import { useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import WidgetError from './WidgetError';
import { useQuotationTaskSummary } from '../api';

type KpiCardProps = {
  label: string;
  count: number;
  icon: string;
  iconColor: string;
  iconBg: string;
  cardBg: string;
  onClick: () => void;
};

function KpiCard({ label, count, icon, iconColor, iconBg, cardBg, onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${count}. Open list.`}
      className={`${cardBg} rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 text-left w-full transition hover:shadow-md hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
    >
      <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center`}>
        <Icon name={icon} style="solid" className={`size-5 ${iconColor}`} />
      </div>
      <div>
        <span className="text-4xl font-semibold text-gray-800 tabular-nums">{count}</span>
        <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
      </div>
      <span className="text-[11px] text-blue-600 inline-flex items-center gap-0.5 mt-auto">
        Open list
        <Icon name="arrow-right" style="solid" className="size-2.5" />
      </span>
    </button>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
      <Skeleton variant="rectangular" width={40} height={40} />
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={80} height={40} />
        <Skeleton variant="text" width={140} height={14} />
      </div>
      <Skeleton variant="text" width={60} height={12} />
    </div>
  );
}

function QuotationTaskSummaryWidget() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuotationTaskSummary();

  return (
    <WidgetWrapper id="quotation-task-summary">
      <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Quotation Task Summary</h3>
        </div>

        {isError ? (
          <WidgetError message="Unable to load quotation task summary" onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Pending Quotation Creation"
              count={data?.pendingQuotationCreation ?? 0}
              icon="file-circle-plus"
              iconColor="text-amber-500"
              iconBg="bg-amber-50"
              cardBg="bg-white"
              onClick={() => navigate('/appraisals/list?status=Pending')}
            />
            <KpiCard
              label="Waiting Company Submission"
              count={data?.waitingCompanySubmission ?? 0}
              icon="paper-plane"
              iconColor="text-blue-500"
              iconBg="bg-blue-50"
              cardBg="bg-white"
              onClick={() => navigate('/quotations?status=Sent')}
            />
            <KpiCard
              label="Waiting RM Selection"
              count={data?.waitingRmSelection ?? 0}
              icon="user-check"
              iconColor="text-purple-500"
              iconBg="bg-purple-50"
              cardBg="bg-white"
              onClick={() => navigate('/quotations?status=PendingRmSelection')}
            />
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

export default QuotationTaskSummaryWidget;
