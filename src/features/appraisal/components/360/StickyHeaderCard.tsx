import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { GetDecisionSummaryResponse } from '../../api/decisionSummary';

// Appraisal data comes through .passthrough() so extra fields are untyped
type AppraisalData = Record<string, any> | undefined;

interface StickyHeaderCardProps {
  appraisal: AppraisalData;
  decisionSummary: GetDecisionSummaryResponse | undefined;
  customerName?: string | null;
  contactNumber?: string | null;
  /** Optional action buttons rendered as a divided row inside the header card */
  actions?: ReactNode;
  /** Shrinks the header (avatar, name, padding) once the content is scrolled */
  compact?: boolean;
}

const StickyHeaderCard = ({
  appraisal,
  decisionSummary,
  customerName,
  contactNumber,
  actions,
  compact = false,
}: StickyHeaderCardProps) => {
  const { t } = useTranslation('appraisal');
  return (
    <div className="sticky top-0 z-10 bg-white border border-gray-100 shadow-sm rounded-2xl transition-all duration-200">
      <div className={clsx('px-6 transition-all duration-200', compact ? 'py-2.5' : 'py-4')}>
        <div className="flex items-center justify-between">
          {/* Left: Customer & appraisal info */}
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 transition-all duration-200',
                compact ? 'h-9 w-9' : 'h-12 w-12',
              )}
            >
              <Icon
                name="user"
                style="solid"
                className={clsx('text-white transition-all duration-200', compact ? 'h-4 w-4' : 'h-5 w-5')}
              />
            </div>
            <div>
              <h1
                className={clsx(
                  'font-bold text-gray-900 tracking-tight transition-all duration-200',
                  compact ? 'text-lg' : 'text-xl',
                )}
              >
                {customerName || '-'}
              </h1>
              {/* Chips collapse away when compact to reclaim vertical space */}
              <div
                className={clsx(
                  'flex items-center gap-2 overflow-hidden transition-all duration-200',
                  compact ? 'mt-0 max-h-0 opacity-0' : 'mt-3 max-h-8 opacity-100',
                )}
              >
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
              label={t('view360.header.totalAppraisalPrice')}
              value={decisionSummary?.totalAppraisalPrice}
              primary
            />
            <div className="h-10 w-px bg-gray-200" />
            <PriceDisplay
              label={t('view360.header.forceSellingPrice')}
              value={decisionSummary?.forceSellingPrice}
            />
            <div className="h-10 w-px bg-gray-200" />
            <PriceDisplay
              label={t('view360.header.buildingInsurance')}
              value={decisionSummary?.buildingInsurance}
            />
          </div>
        </div>
      </div>

      {/* Action buttons — combined into the header card */}
      {actions && (
        <div
          className={clsx(
            'flex justify-end gap-2 border-t border-gray-100 px-3 transition-all duration-200',
            compact ? 'py-1.5' : 'py-2.5',
          )}
        >
          {actions}
        </div>
      )}
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
        primary ? 'text-lg font-bold text-teal-700' : 'text-sm font-semibold text-gray-900'
      }
    >
      {value != null ? formatNumber(value, 2) : '-'}
    </p>
  </div>
);

export default StickyHeaderCard;
