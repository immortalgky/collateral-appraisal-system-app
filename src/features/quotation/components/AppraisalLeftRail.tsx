import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { AppraisalSummaryDto } from '../schemas/quotation';

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

interface AppraisalLeftRailProps {
  appraisals: AppraisalSummaryDto[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Gross fee amount per appraisal item — index-aligned with appraisals array. */
  feeAmounts: number[];
}

/**
 * Left rail showing the list of appraisals in the RFQ.
 * Clicking a row sets the active appraisal in the right pane.
 */
const AppraisalLeftRail = ({
  appraisals,
  selectedIndex,
  onSelect,
  feeAmounts,
}: AppraisalLeftRailProps) => {
  const { t } = useTranslation('quotation');
  return (
    <div className="w-full md:w-auto md:min-h-0 md:overflow-hidden flex flex-col border-b md:border-b-0 md:border-r border-(--palette-line) bg-(--palette-surface-2)">
      <div className="px-3 py-2.5 border-b border-(--palette-line) shrink-0 bg-(--palette-surface-2)">
        <p className="text-xs font-semibold text-(--palette-gray-500) uppercase tracking-wider">
          {t('appraisalPanel.title')} ({appraisals.length})
        </p>
      </div>
      <div className="divide-y divide-(--palette-line-soft) flex-1 min-h-0 overflow-y-auto">
        {appraisals.map((ap, idx) => {
          const isSelected = idx === selectedIndex;
          const fee = feeAmounts[idx];
          return (
            <button
              key={ap.appraisalId}
              type="button"
              onClick={() => onSelect(idx)}
              className={clsx(
                'w-full text-left px-3 py-3 transition-colors',
                isSelected
                  ? 'bg-primary/5 border-r-2 border-r-primary'
                  : 'hover:bg-(--palette-surface)',
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={clsx(
                    'size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-(--palette-surface-3) text-(--palette-gray-500)',
                  )}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={clsx(
                      'text-xs font-semibold truncate',
                      isSelected ? 'text-(--palette-primary-text)' : 'text-(--palette-ink)',
                    )}
                  >
                    {ap.appraisalNumber?.trim() || `Appraisal ${idx + 1}`}
                  </p>
                  {ap.customerName?.trim() && (
                    <p className="text-[11px] text-(--palette-gray-500) truncate">
                      {ap.customerName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 self-center">
                  {fee > 0 && (
                    <p className="text-xs font-medium text-(--palette-ink)">{THB.format(fee)}</p>
                  )}
                  {isSelected && (
                    <Icon
                      name="chevron-right"
                      style="solid"
                      className="size-3 text-(--palette-primary-text)"
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppraisalLeftRail;
