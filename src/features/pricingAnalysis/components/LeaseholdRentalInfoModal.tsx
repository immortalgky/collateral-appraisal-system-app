import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@/shared/components';
import type { RentalScheduleRow } from '@/features/appraisal/api/property';
import { computeAppraisalSchedule } from '../domain/calculateLeasehold';

interface LeaseholdRentalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractSchedule: RentalScheduleRow[];
  appraisalDate?: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mirrors the mock's `.g` table rules (--surface/--surface-2, --line/--line-soft tokens).
const tableCls = 'text-[12px] border-separate border-spacing-0 [font-variant-numeric:tabular-nums]';
const cellCls =
  'px-2 py-0 leading-[25px] whitespace-nowrap border-b border-r border-b-[#eef2f2] border-r-[#eef2f2] bg-white text-left text-gray-700';
const headCls =
  'px-2 border-b border-r border-b-[#e3e9e8] border-r-[#eef2f2] bg-[#f8fafa] font-medium text-[#55636f] leading-[26px] whitespace-nowrap text-left';
const totalCls = `${cellCls} font-semibold bg-[#f8fafa]`;
const numCls = 'text-right';

export function LeaseholdRentalInfoModal({
  isOpen,
  onClose,
  contractSchedule,
  appraisalDate,
}: LeaseholdRentalInfoModalProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { rows: appraisalRows, startIdx } = useMemo(
    () =>
      appraisalDate
        ? computeAppraisalSchedule(contractSchedule, appraisalDate)
        : { rows: [], startIdx: -1 },
    [contractSchedule, appraisalDate],
  );

  const contractTotal = contractSchedule.reduce((sum, r) => sum + r.totalAmount, 0);
  const appraisalTotal = appraisalRows.reduce((sum, r) => sum + r.totalAmount, 0);

  // Build aligned rows: each row index maps to one visual row across both tables
  const totalVisualRows = Math.max(
    contractSchedule.length,
    (startIdx >= 0 ? startIdx : 0) + appraisalRows.length,
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] p-6 space-y-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('leasehold.rentalModal.title')}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="xmark" className="size-5" />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <div className="grid grid-cols-[auto_auto] gap-0">
            {/* Headers */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t('leasehold.rentalModal.contractScheduleTitle')}
              </h4>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 pl-6">
                {t('leasehold.rentalModal.appraisalScheduleTitle')}
              </h4>
            </div>

            {/* Tables side-by-side with aligned rows */}
            <table className={tableCls}>
              <thead>
                <tr>
                  <th className={headCls}>{t('leasehold.table.year')}</th>
                  <th className={headCls}>{t('leasehold.rentalModal.contractStartDate')}</th>
                  <th className={headCls}>{t('leasehold.rentalModal.contractEndDate')}</th>
                  <th className={`${headCls} ${numCls}`}>
                    {t('leasehold.rentalModal.upFrontPerYear')}
                  </th>
                  <th className={`${headCls} ${numCls}`}>
                    {t('leasehold.rentalModal.contractRentalFeePerYear')}
                  </th>
                  <th className={`${headCls} ${numCls}`}>
                    {t('leasehold.rentalModal.totalAmountBaht')}
                  </th>
                  <th className={`${headCls} ${numCls}`}>
                    {t('leasehold.rentalModal.contractRentalFeeGrowthRate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalVisualRows }).map((_, idx) => {
                  const row = contractSchedule[idx];
                  if (!row) {
                    return (
                      <tr key={idx}>
                        {/* NBSP keeps the spacer row at the same height as a data row: an
                            empty cell creates no line box, so line-height alone collapses it. */}
                        <td className={cellCls} colSpan={7}>
                          &nbsp;
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={idx}>
                      <td className={cellCls}>{row.year}</td>
                      <td className={cellCls}>{formatDate(row.contractStart)}</td>
                      <td className={cellCls}>{formatDate(row.contractEnd)}</td>
                      <td className={`${cellCls} ${numCls}`}>{fmt(row.upFront)}</td>
                      <td className={`${cellCls} ${numCls}`}>{fmt(row.contractRentalFee)}</td>
                      <td className={`${cellCls} ${numCls}`}>{fmt(row.totalAmount)}</td>
                      <td className={`${cellCls} ${numCls}`}>
                        {fmt(row.contractRentalFeeGrowthRatePercent)}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className={totalCls}>{t('leasehold.rentalModal.total')}</td>
                  <td className={totalCls} colSpan={4} />
                  <td className={`${totalCls} ${numCls}`}>{fmt(contractTotal)}</td>
                  <td className={totalCls} />
                </tr>
              </tbody>
            </table>

            <table className={`${tableCls} ml-6`}>
              <thead>
                <tr>
                  <th className={headCls}>{t('leasehold.table.year')}</th>
                  <th className={headCls}>{t('leasehold.rentalModal.contractStartDate')}</th>
                  <th className={headCls}>{t('leasehold.rentalModal.contractEndDate')}</th>
                  <th className={`${headCls} ${numCls}`}>
                    {t('leasehold.rentalModal.totalAmountBaht')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalVisualRows }).map((_, idx) => {
                  // Appraisal rows start at startIdx in the visual grid
                  const appraisalIdx = idx - (startIdx >= 0 ? startIdx : 0);
                  const row = appraisalIdx >= 0 ? appraisalRows[appraisalIdx] : undefined;
                  if (!row) {
                    return (
                      <tr key={idx}>
                        <td className={cellCls} colSpan={4}>
                          &nbsp;
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={idx}>
                      <td className={cellCls}>{row.year}</td>
                      <td className={cellCls}>{formatDate(row.contractStart)}</td>
                      <td className={cellCls}>{formatDate(row.contractEnd)}</td>
                      <td className={`${cellCls} ${numCls}`}>{fmt(row.totalAmount)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className={totalCls}>{t('leasehold.rentalModal.total')}</td>
                  <td className={totalCls} colSpan={2} />
                  <td className={`${totalCls} ${numCls}`}>{fmt(appraisalTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('leasehold.rentalModal.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
