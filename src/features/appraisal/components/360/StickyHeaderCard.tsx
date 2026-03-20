import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { GetDecisionSummaryResponse } from '../../api/decisionSummary';

// Appraisal data comes through .passthrough() so extra fields are untyped
type AppraisalData = Record<string, any> | undefined;

interface StickyHeaderCardProps {
  appraisal: AppraisalData;
  decisionSummary: GetDecisionSummaryResponse | undefined;
  customerName?: string;
  contactNumber?: string;
}

const StickyHeaderCard = ({ appraisal, decisionSummary, customerName, contactNumber }: StickyHeaderCardProps) => {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm rounded-2xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Customer & appraisal info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Icon name="user" style="solid" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {customerName || '-'}
              </h1>
              <div className="flex items-center gap-2 mt-3">
                {appraisal?.appraisalNumber && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                    <Icon name="hashtag" style="solid" className="w-2.5 h-2.5 text-gray-400" />
                    {String(appraisal.appraisalNumber)}
                  </span>
                )}
                {contactNumber && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-xs font-medium text-teal-700">
                    <Icon name="phone" style="solid" className="w-2.5 h-2.5" />
                    {contactNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Key prices */}
          <div className="flex items-center gap-5">
            <PriceDisplay
              label="Total Appraisal Price"
              value={decisionSummary?.totalAppraisalPrice}
              primary
            />
            <div className="h-10 w-px bg-gray-200" />
            <PriceDisplay
              label="Force Selling Price"
              value={decisionSummary?.forceSellingPrice}
            />
            <div className="h-10 w-px bg-gray-200" />
            <PriceDisplay
              label="Building Insurance"
              value={decisionSummary?.buildingInsurance}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const PriceDisplay = ({
  label,
  value,
  primary,
}: {
  label: string;
  value: number | null | undefined;
  primary?: boolean;
}) => (
  <div className="text-right">
    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
    <p
      className={
        primary
          ? 'text-lg font-bold text-teal-700'
          : 'text-sm font-semibold text-gray-900'
      }
    >
      {value != null ? formatNumber(value, 2) : '-'}
    </p>
  </div>
);

export default StickyHeaderCard;
