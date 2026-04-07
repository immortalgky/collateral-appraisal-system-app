import { useEffect, useMemo } from 'react';
import { Button, Icon } from '@/shared/components';
import type { RentalScheduleRow } from '@/features/appraisal/api/property';
import { computeAppraisalSchedule, type AppraisalScheduleRow } from '../domain/calculateLeasehold';

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


export function LeaseholdRentalInfoModal({
  isOpen,
  onClose,
  contractSchedule,
  appraisalDate,
}: LeaseholdRentalInfoModalProps) {
  const { rows: appraisalRows, startIdx } = useMemo(
    () => (appraisalDate ? computeAppraisalSchedule(contractSchedule, appraisalDate) : { rows: [], startIdx: -1 }),
    [contractSchedule, appraisalDate],
  );

  const contractTotal = contractSchedule.reduce((sum, r) => sum + r.totalAmount, 0);
  const appraisalTotal = appraisalRows.reduce((sum, r) => sum + r.totalAmount, 0);

  // Build aligned rows: each row index maps to one visual row across both tables
  const totalVisualRows = Math.max(contractSchedule.length, (startIdx >= 0 ? startIdx : 0) + appraisalRows.length);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] p-6 space-y-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Rental Information</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="xmark" className="size-5" />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <div className="grid grid-cols-[auto_auto] gap-0">
            {/* Headers */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Rental schedule as per contract</h4>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 pl-6">Rental schedule starting from the appraisal date</h4>
            </div>

            {/* Tables side-by-side with aligned rows */}
            <table className="text-xs border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Year</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Contract Start Date</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Contract End Date</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Up Front (Baht/year)</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Contract rental fee (Baht/year)</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Total Amount (Baht)</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Contract rental fee growth rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalVisualRows }).map((_, idx) => {
                  const row = contractSchedule[idx];
                  if (!row) {
                    return (
                      <tr key={idx} className="border-t border-gray-100 h-8">
                        <td colSpan={7} />
                      </tr>
                    );
                  }
                  return (
                    <tr key={idx} className="border-t border-gray-100 h-8">
                      <td className="px-3 py-1.5 text-gray-700">{row.year}</td>
                      <td className="px-3 py-1.5 text-gray-700">{formatDate(row.contractStart)}</td>
                      <td className="px-3 py-1.5 text-gray-700">{formatDate(row.contractEnd)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{fmt(row.upFront)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{fmt(row.contractRentalFee)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{fmt(row.totalAmount)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{fmt(row.contractRentalFeeGrowthRatePercent)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-medium h-8">
                  <td className="px-3 py-1.5 text-gray-700">Total</td>
                  <td colSpan={4} />
                  <td className="px-3 py-1.5 text-right text-gray-900">{fmt(contractTotal)}</td>
                  <td />
                </tr>
              </tbody>
            </table>

            <table className="text-xs border border-gray-200 rounded-lg ml-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Year</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Contract Start Date</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">Contract End Date</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">Total Amount (Baht)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalVisualRows }).map((_, idx) => {
                  // Appraisal rows start at startIdx in the visual grid
                  const appraisalIdx = idx - (startIdx >= 0 ? startIdx : 0);
                  const row = appraisalIdx >= 0 ? appraisalRows[appraisalIdx] : undefined;
                  if (!row) {
                    return (
                      <tr key={idx} className="border-t border-gray-100 h-8">
                        <td colSpan={4} />
                      </tr>
                    );
                  }
                  return (
                    <tr key={idx} className="border-t border-gray-100 h-8">
                      <td className="px-3 py-1.5 text-gray-700">{row.year}</td>
                      <td className="px-3 py-1.5 text-gray-700">{formatDate(row.contractStart)}</td>
                      <td className="px-3 py-1.5 text-gray-700">{formatDate(row.contractEnd)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{fmt(row.totalAmount)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-medium h-8">
                  <td className="px-3 py-1.5 text-gray-700">Total</td>
                  <td colSpan={2} />
                  <td className="px-3 py-1.5 text-right text-gray-900">{fmt(appraisalTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
