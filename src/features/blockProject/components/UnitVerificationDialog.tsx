import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import { type ProjectType, isCondo } from '../types';
import type {
  ReappraisalPreviewResult,
  ReappraisalPreviewUnit,
  ReappraisalUnitStatus,
} from '../api/projectUnit';

// ── Status badge ──────────────────────────────────────────────────────────────

const statusConfig: Record<
  ReappraisalUnitStatus,
  { dot: string; text: string; badge: string }
> = {
  Sold: {
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700',
  },
  NewlySold: {
    dot: 'bg-cyan-500',
    text: 'text-cyan-700',
    badge: 'bg-cyan-50 text-cyan-700',
  },
  Available: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700',
  },
  MatchDifference: {
    dot: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700',
  },
};

function StatusBadge({ status }: { status: ReappraisalUnitStatus }) {
  const { t } = useTranslation('blockProject');
  const cfg = statusConfig[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        cfg.badge,
      )}
    >
      <span className={clsx('size-1.5 rounded-full shrink-0', cfg.dot)} />
      {t(`unitVerification.status.${status}`)}
    </span>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  count: number;
  dotColor: string;
  unitLabel: string;
}

function SummaryCard({ label, count, dotColor, unitLabel }: SummaryCardProps) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 px-3 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={clsx('size-2 rounded-full shrink-0', dotColor)} />
        <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
      </div>
      <span className="text-xl font-bold text-gray-900">{count.toLocaleString()}</span>
      <span className="text-[10px] text-gray-400">{unitLabel}</span>
    </div>
  );
}

// ── Cell with optional diff highlight ────────────────────────────────────────

function Cell({
  value,
  fieldName,
  diffFields,
  align = 'left',
}: {
  value: React.ReactNode;
  fieldName?: string;
  diffFields: string[];
  align?: 'left' | 'right';
}) {
  const isDiff = fieldName !== undefined && diffFields.includes(fieldName);
  return (
    <td
      className={clsx(
        'py-2 px-3 text-xs',
        align === 'right' && 'text-right',
        isDiff ? 'text-red-600 font-medium' : 'text-gray-800',
      )}
    >
      {value ?? '-'}
    </td>
  );
}

// ── Condo table ───────────────────────────────────────────────────────────────

function CondoTable({ units }: { units: ReappraisalPreviewUnit[] }) {
  const { t } = useTranslation('blockProject');
  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.sqNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitVerification.cols.status')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.floor')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.towerName')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.regNumber')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.roomNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.modelType')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.usableAreaSqm')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.sellingPriceBaht')}
          </th>
        </tr>
      </thead>
      <tbody>
        {units.map(unit => (
          <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-2 px-3 text-xs text-gray-600">{unit.sequenceNumber}</td>
            <td className="py-2 px-3">
              <StatusBadge status={unit.status} />
            </td>
            <Cell value={unit.floor} fieldName="floor" diffFields={unit.diffFields} />
            <Cell value={unit.towerName} fieldName="towerName" diffFields={unit.diffFields} />
            <Cell
              value={unit.condoRegistrationNumber}
              fieldName="condoRegistrationNumber"
              diffFields={unit.diffFields}
            />
            <Cell value={unit.roomNumber} fieldName="roomNumber" diffFields={unit.diffFields} />
            <Cell value={unit.modelType} fieldName="modelType" diffFields={unit.diffFields} />
            <Cell
              value={unit.usableArea?.toLocaleString()}
              fieldName="usableArea"
              diffFields={unit.diffFields}
              align="right"
            />
            <Cell
              value={unit.sellingPrice?.toLocaleString()}
              fieldName="sellingPrice"
              diffFields={unit.diffFields}
              align="right"
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── LandAndBuilding table ─────────────────────────────────────────────────────

function LandAndBuildingTable({ units }: { units: ReappraisalPreviewUnit[] }) {
  const { t } = useTranslation('blockProject');
  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.sqNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitVerification.cols.status')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.plotNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.houseNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.modelName')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.numFloors')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.landAreaSqWa')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.usableAreaSqm')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('unitListing.cols.sellingPriceBaht')}
          </th>
        </tr>
      </thead>
      <tbody>
        {units.map(unit => (
          <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-2 px-3 text-xs text-gray-600">{unit.sequenceNumber}</td>
            <td className="py-2 px-3">
              <StatusBadge status={unit.status} />
            </td>
            <Cell value={unit.plotNumber} fieldName="plotNumber" diffFields={unit.diffFields} />
            <Cell value={unit.houseNumber} fieldName="houseNumber" diffFields={unit.diffFields} />
            <Cell value={unit.modelType} fieldName="modelType" diffFields={unit.diffFields} />
            <Cell
              value={unit.numberOfFloors}
              fieldName="numberOfFloors"
              diffFields={unit.diffFields}
            />
            <Cell
              value={unit.landArea?.toLocaleString()}
              fieldName="landArea"
              diffFields={unit.diffFields}
              align="right"
            />
            <Cell
              value={unit.usableArea?.toLocaleString()}
              fieldName="usableArea"
              diffFields={unit.diffFields}
              align="right"
            />
            <Cell
              value={unit.sellingPrice?.toLocaleString()}
              fieldName="sellingPrice"
              diffFields={unit.diffFields}
              align="right"
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface UnitVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  result: ReappraisalPreviewResult;
  projectType: ProjectType;
  isApplying: boolean;
}

export default function UnitVerificationDialog({
  isOpen,
  onClose,
  onApply,
  result,
  projectType,
  isApplying,
}: UnitVerificationDialogProps) {
  const { t } = useTranslation('blockProject');
  const { summary, units } = result;
  const hasConflicts = summary.matchDifference > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('unitVerification.title')} size="3xl">
      {/* Summary row */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 mb-4">
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('unitVerification.resultLabel')}
          </span>
        </div>
        <div className="flex divide-x divide-gray-200">
          <SummaryCard
            label={t('unitVerification.summary.total')}
            count={summary.total}
            dotColor="bg-gray-400"
            unitLabel={t('unitVerification.unitSuffix')}
          />
          <SummaryCard
            label={t('unitVerification.summary.sold')}
            count={summary.sold}
            dotColor="bg-blue-500"
            unitLabel={t('unitVerification.unitSuffix')}
          />
          <SummaryCard
            label={t('unitVerification.summary.newlySold')}
            count={summary.newlySold}
            dotColor="bg-cyan-500"
            unitLabel={t('unitVerification.unitSuffix')}
          />
          <SummaryCard
            label={t('unitVerification.summary.available')}
            count={summary.available}
            dotColor="bg-amber-500"
            unitLabel={t('unitVerification.unitSuffix')}
          />
          <SummaryCard
            label={t('unitVerification.summary.matchDifference')}
            count={summary.matchDifference}
            dotColor="bg-red-500"
            unitLabel={t('unitVerification.unitSuffix')}
          />
        </div>
      </div>

      {/* Units table */}
      <div className="overflow-auto max-h-[50vh] rounded-lg border border-gray-200">
        {isCondo(projectType) ? (
          <CondoTable units={units} />
        ) : (
          <LandAndBuildingTable units={units} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div>
          {hasConflicts && (
            <p className="text-xs text-red-600">
              {t('unitVerification.matchDifferenceHint', { count: summary.matchDifference })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('unitVerification.cancel')}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={hasConflicts || isApplying}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              hasConflicts || isApplying
                ? 'bg-primary/40 text-white cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90',
            )}
          >
            {isApplying ? t('unitVerification.applying') : t('unitVerification.apply')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
