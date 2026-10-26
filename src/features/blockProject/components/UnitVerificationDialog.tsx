import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import { type ProjectType, isCondo } from '../types';
import type {
  ReappraisalAddedUnit,
  ReappraisalPreviewResult,
  ReappraisalPreviewUnit,
  ReappraisalUnitStatus,
} from '../api/projectUnit';

// ── Status badge ──────────────────────────────────────────────────────────────

const statusConfig: Record<ReappraisalUnitStatus, { dot: string; text: string; badge: string }> = {
  Sold: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  NewlySold: {
    dot: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
    badge: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  Available: {
    dot: 'bg-amber-500',
    text: 'text-(--palette-warn)',
    badge: 'bg-(--palette-warn-wash) text-(--palette-warn)',
  },
  MatchDifference: {
    dot: 'bg-red-500',
    text: 'text-(--palette-req)',
    badge: 'bg-(--palette-req-wash) text-(--palette-req)',
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
        <span className="text-xs text-(--palette-gray-500) whitespace-nowrap">{label}</span>
      </div>
      <span className="text-xl font-bold text-(--palette-ink)">{count.toLocaleString()}</span>
      <span className="text-[10px] text-(--palette-gray-400)">{unitLabel}</span>
    </div>
  );
}

// ── Cell with optional diff highlight ────────────────────────────────────────

function Cell({
  value,
  fieldName,
  diffFields,
  incomingValues,
  align = 'left',
}: {
  value: React.ReactNode;
  fieldName?: string;
  diffFields: string[];
  incomingValues?: Record<string, string | number | null>;
  align?: 'left' | 'right';
}) {
  const isDiff = fieldName !== undefined && diffFields.includes(fieldName);
  // What the workbook says. Showing the current value alone tells the user THAT something
  // differs but not what they are agreeing to, which is the one thing the confirm gate needs
  // them to know.
  const incoming = isDiff && fieldName ? incomingValues?.[fieldName] : undefined;

  return (
    <td
      className={clsx(
        'py-2 px-3 text-xs',
        align === 'right' && 'text-right',
        isDiff ? 'text-(--palette-danger) font-medium' : 'text-(--palette-ink)',
      )}
    >
      {isDiff && incoming !== undefined ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className="text-(--palette-gray-400) line-through">{value ?? '-'}</span>
          <span aria-hidden="true">&rarr;</span>
          <span>
            {typeof incoming === 'number' ? incoming.toLocaleString() : (incoming ?? '-')}
          </span>
        </span>
      ) : (
        (value ?? '-')
      )}
    </td>
  );
}

// ── Condo table ───────────────────────────────────────────────────────────────

function CondoTable({ units }: { units: ReappraisalPreviewUnit[] }) {
  const { t } = useTranslation('blockProject');
  return (
    <table className="w-full text-xs">
      <thead className="bg-(--palette-surface-2) sticky top-0">
        <tr>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.sqNo')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitVerification.cols.status')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.floor')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.towerName')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('condoUnitsPrice.cols.roomNumber')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('condoUnitsPrice.cols.unitNo')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.modelType')}
          </th>
          <th className="text-xs text-right py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.usableAreaSqm')}
          </th>
          <th className="text-xs text-right py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.sellingPriceBaht')}
          </th>
        </tr>
      </thead>
      <tbody>
        {units.map(unit => (
          <tr
            key={unit.id}
            className="border-b border-(--palette-line-soft) hover:bg-(--palette-surface-2)"
          >
            <td className="py-2 px-3 text-xs text-(--palette-gray-600)">{unit.sequenceNumber}</td>
            <td className="py-2 px-3">
              <StatusBadge status={unit.status} />
            </td>
            <Cell
              value={unit.floor}
              fieldName="floor"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.towerName}
              fieldName="towerName"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.condoRegistrationNumber}
              fieldName="condoRegistrationNumber"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.roomNumber}
              fieldName="roomNumber"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.modelType}
              fieldName="modelType"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.usableArea?.toLocaleString()}
              fieldName="usableArea"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
              align="right"
            />
            <Cell
              value={unit.sellingPrice?.toLocaleString()}
              fieldName="sellingPrice"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
              align="right"
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── LandAndBuilding / Land table ──────────────────────────────────────────────

// Land and Building (Construction) (L) is appraised as land only: the plot, its land and its price,
// with no model, building floors or usable area. The server flags a row on those fields all the
// same (it compares every non-condo unit alike), so a hidden column appears as soon as any row
// differs in it; otherwise a "ข้อมูลไม่ตรง" row would show nothing that differs.
function LandAndBuildingTable({
  units,
  landOnly,
}: {
  units: ReappraisalPreviewUnit[];
  landOnly: boolean;
}) {
  const { t } = useTranslation('blockProject');
  const shows = (field: string) => !landOnly || units.some(u => u.diffFields.includes(field));
  const showModel = shows('modelType');
  const showFloors = shows('numberOfFloors');
  const showUsable = shows('usableArea');
  return (
    <table className="w-full text-xs">
      <thead className="bg-(--palette-surface-2) sticky top-0">
        <tr>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.sqNo')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitVerification.cols.status')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.plotNo')}
          </th>
          <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.houseNo')}
          </th>
          {showModel && (
            <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
              {t('unitListing.cols.modelName')}
            </th>
          )}
          {showFloors && (
            <th className="text-xs text-left py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
              {t('unitListing.cols.numFloors')}
            </th>
          )}
          <th className="text-xs text-right py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.landAreaSqWa')}
          </th>
          {showUsable && (
            <th className="text-xs text-right py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
              {t('unitListing.cols.usableAreaSqm')}
            </th>
          )}
          <th className="text-xs text-right py-2.5 px-3 text-(--palette-gray-500) font-semibold whitespace-nowrap">
            {t('unitListing.cols.sellingPriceBaht')}
          </th>
        </tr>
      </thead>
      <tbody>
        {units.map(unit => (
          <tr
            key={unit.id}
            className="border-b border-(--palette-line-soft) hover:bg-(--palette-surface-2)"
          >
            <td className="py-2 px-3 text-xs text-(--palette-gray-600)">{unit.sequenceNumber}</td>
            <td className="py-2 px-3">
              <StatusBadge status={unit.status} />
            </td>
            <Cell
              value={unit.plotNumber}
              fieldName="plotNumber"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.houseNumber}
              fieldName="houseNumber"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            {showModel && (
              <Cell
                value={unit.modelType}
                fieldName="modelType"
                diffFields={unit.diffFields}
                incomingValues={unit.incomingValues}
              />
            )}
            {showFloors && (
              <Cell
                value={unit.numberOfFloors}
                fieldName="numberOfFloors"
                diffFields={unit.diffFields}
                incomingValues={unit.incomingValues}
              />
            )}
            <Cell
              value={unit.landArea?.toLocaleString()}
              fieldName="landArea"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
              align="right"
            />
            {showUsable && (
              <Cell
                value={unit.usableArea?.toLocaleString()}
                fieldName="usableArea"
                diffFields={unit.diffFields}
                incomingValues={unit.incomingValues}
                align="right"
              />
            )}
            <Cell
              value={unit.sellingPrice?.toLocaleString()}
              fieldName="sellingPrice"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
              align="right"
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Added units table ─────────────────────────────────────────────────────────

/**
 * Rows the workbook would ADD. Deliberately a separate table rather than extra rows in the
 * one above: these units have no sequence number and no status yet, and faking either would
 * make invented data look like data the project already holds.
 */
function AddedUnitsTable({
  units,
  projectType,
}: {
  units: ReappraisalAddedUnit[];
  projectType: ProjectType;
}) {
  const { t } = useTranslation('blockProject');
  const condo = isCondo(projectType);

  type Column = {
    key: string;
    label: string;
    align: 'left' | 'right';
    value: (u: ReappraisalAddedUnit) => React.ReactNode;
  };
  const price: Column = {
    key: 'sellingPrice',
    label: t('unitListing.cols.sellingPriceBaht'),
    align: 'right',
    value: u => u.sellingPrice?.toLocaleString(),
  };
  const usableArea: Column = {
    key: 'usableArea',
    label: t('unitListing.cols.usableAreaSqm'),
    align: 'right',
    value: u => u.usableArea?.toLocaleString(),
  };
  const plot: Column[] = [
    { key: 'plotNo', label: t('unitListing.cols.plotNo'), align: 'left', value: u => u.plotNumber },
    {
      key: 'houseNo',
      label: t('unitListing.cols.houseNo'),
      align: 'left',
      value: u => u.houseNumber,
    },
  ];
  const landArea: Column = {
    key: 'landArea',
    label: t('unitListing.cols.landAreaSqWa'),
    align: 'right',
    value: u => u.landArea?.toLocaleString(),
  };

  // L (Land and Building (Construction)): the plot, its land and its price. No model, building
  // floors or usable area.
  const columns: Column[] = condo
    ? [
        { key: 'floor', label: t('unitListing.cols.floor'), align: 'left', value: u => u.floor },
        {
          key: 'towerName',
          label: t('unitListing.cols.towerName'),
          align: 'left',
          value: u => u.towerName,
        },
        {
          key: 'regNumber',
          label: t('condoUnitsPrice.cols.roomNumber'),
          align: 'left',
          value: u => u.condoRegistrationNumber,
        },
        {
          key: 'roomNo',
          label: t('condoUnitsPrice.cols.unitNo'),
          align: 'left',
          value: u => u.roomNumber,
        },
        {
          key: 'modelType',
          label: t('unitListing.cols.modelType'),
          align: 'left',
          value: u => u.modelType,
        },
        usableArea,
        price,
      ]
    : projectType === 'L'
      ? [...plot, landArea, price]
      : [
          ...plot,
          {
            key: 'modelName',
            label: t('unitListing.cols.modelName'),
            align: 'left',
            value: u => u.modelType,
          },
          {
            key: 'numFloors',
            label: t('unitListing.cols.numFloors'),
            align: 'left',
            value: u => u.numberOfFloors,
          },
          landArea,
          usableArea,
          price,
        ];

  return (
    <table className="w-full text-xs">
      <thead className="bg-emerald-50 dark:bg-emerald-500/10 sticky top-0">
        <tr>
          {columns.map(c => (
            <th
              key={c.key}
              className={clsx(
                'py-2.5 px-3 text-emerald-800 dark:text-emerald-300 font-medium whitespace-nowrap',
                c.align === 'right' ? 'text-right' : 'text-left',
              )}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {units.map((unit, i) => (
          <tr
            key={`${unit.roomNumber ?? unit.plotNumber ?? 'added'}-${i}`}
            className="border-b border-(--palette-line-soft) hover:bg-(--palette-surface-2)"
          >
            {columns.map(c => (
              <td
                key={c.key}
                className={clsx(
                  'py-2 px-3 text-xs text-(--palette-ink)',
                  c.align === 'right' && 'text-right',
                )}
              >
                {c.value(unit) ?? '-'}
              </td>
            ))}
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
  /** confirmUpdates is passed straight through to the API; the server refuses without it. */
  onApply: (confirmUpdates: boolean) => void;
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
  const addedUnits = result.addedUnits ?? [];

  // Both buckets rewrite data the workbook has no way to know is right — a stale file can
  // overwrite prices the appraiser set, or add units that do not exist, with nothing to undo
  // it. The server refuses either without confirmUpdates, so the checkbox is the gate, not a
  // formality: leaving additions out of this condition would send a file the server rejects.
  const needsConfirm = summary.matchDifference > 0 || addedUnits.length > 0;
  const [confirmed, setConfirmed] = useState(false);
  const canApply = (!needsConfirm || confirmed) && !isApplying;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('unitVerification.title')} size="3xl">
      {/* Summary row */}
      <div className="rounded-lg border border-(--palette-line) bg-(--palette-surface-2) mb-4">
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs font-semibold text-(--palette-gray-500) uppercase tracking-wide">
            {t('unitVerification.resultLabel')}
          </span>
        </div>
        <div className="flex divide-x divide-(--palette-line)">
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
          <SummaryCard
            label={t('unitVerification.summary.added')}
            count={summary.added}
            dotColor="bg-emerald-500"
            unitLabel={t('unitVerification.unitSuffix')}
          />
        </div>
      </div>

      {/* Units table */}
      <div className="overflow-auto max-h-[50vh] rounded-lg border border-(--palette-line)">
        {isCondo(projectType) ? (
          <CondoTable units={units} />
        ) : (
          <LandAndBuildingTable units={units} landOnly={projectType === 'L'} />
        )}
      </div>

      {/* Units the file would add */}
      {addedUnits.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-(--palette-ink)">
              {t('unitVerification.addedSectionLabel', { count: addedUnits.length })}
            </span>
          </div>
          <div className="overflow-auto max-h-[30vh] rounded-lg border border-emerald-200 dark:border-emerald-500/30">
            <AddedUnitsTable units={addedUnits} projectType={projectType} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-(--palette-line)">
        <div>
          {needsConfirm && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-(--palette-line-strong) text-(--palette-primary-text) focus:ring-primary"
              />
              <span className="text-xs text-(--palette-ink)">
                {t('unitVerification.confirmChanges', {
                  changed: summary.matchDifference,
                  added: addedUnits.length,
                })}
              </span>
            </label>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-(--palette-ink) bg-(--palette-surface) border border-(--palette-line-strong) rounded-lg hover:bg-(--palette-surface-2) transition-colors"
          >
            {t('unitVerification.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onApply(needsConfirm)}
            disabled={!canApply}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
              !canApply
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
