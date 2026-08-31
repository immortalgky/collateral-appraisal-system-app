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
        isDiff ? 'text-red-600 font-medium' : 'text-gray-800',
      )}
    >
      {isDiff && incoming !== undefined ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className="text-gray-400 line-through">{value ?? '-'}</span>
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
            <Cell
              value={unit.modelType}
              fieldName="modelType"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.numberOfFloors}
              fieldName="numberOfFloors"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
            />
            <Cell
              value={unit.landArea?.toLocaleString()}
              fieldName="landArea"
              diffFields={unit.diffFields}
              incomingValues={unit.incomingValues}
              align="right"
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

  const headers = condo
    ? [
        { key: 'floor', label: t('unitListing.cols.floor'), align: 'left' as const },
        { key: 'towerName', label: t('unitListing.cols.towerName'), align: 'left' as const },
        { key: 'regNumber', label: t('unitListing.cols.regNumber'), align: 'left' as const },
        { key: 'roomNo', label: t('unitListing.cols.roomNo'), align: 'left' as const },
        { key: 'modelType', label: t('unitListing.cols.modelType'), align: 'left' as const },
        { key: 'usableArea', label: t('unitListing.cols.usableAreaSqm'), align: 'right' as const },
        {
          key: 'sellingPrice',
          label: t('unitListing.cols.sellingPriceBaht'),
          align: 'right' as const,
        },
      ]
    : [
        { key: 'plotNo', label: t('unitListing.cols.plotNo'), align: 'left' as const },
        { key: 'houseNo', label: t('unitListing.cols.houseNo'), align: 'left' as const },
        { key: 'modelName', label: t('unitListing.cols.modelName'), align: 'left' as const },
        { key: 'numFloors', label: t('unitListing.cols.numFloors'), align: 'left' as const },
        { key: 'landArea', label: t('unitListing.cols.landAreaSqWa'), align: 'right' as const },
        { key: 'usableArea', label: t('unitListing.cols.usableAreaSqm'), align: 'right' as const },
        {
          key: 'sellingPrice',
          label: t('unitListing.cols.sellingPriceBaht'),
          align: 'right' as const,
        },
      ];

  const cellsFor = (u: ReappraisalAddedUnit): React.ReactNode[] =>
    condo
      ? [
          u.floor,
          u.towerName,
          u.condoRegistrationNumber,
          u.roomNumber,
          u.modelType,
          u.usableArea?.toLocaleString(),
          u.sellingPrice?.toLocaleString(),
        ]
      : [
          u.plotNumber,
          u.houseNumber,
          u.modelType,
          u.numberOfFloors,
          u.landArea?.toLocaleString(),
          u.usableArea?.toLocaleString(),
          u.sellingPrice?.toLocaleString(),
        ];

  return (
    <table className="w-full text-xs">
      <thead className="bg-emerald-50 sticky top-0">
        <tr>
          {headers.map(h => (
            <th
              key={h.key}
              className={clsx(
                'py-2.5 px-3 text-emerald-800 font-medium whitespace-nowrap',
                h.align === 'right' ? 'text-right' : 'text-left',
              )}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {units.map((unit, i) => (
          <tr
            key={`${unit.roomNumber ?? unit.plotNumber ?? 'added'}-${i}`}
            className="border-b border-gray-100 hover:bg-gray-50"
          >
            {cellsFor(unit).map((value, ci) => (
              <td
                key={headers[ci].key}
                className={clsx(
                  'py-2 px-3 text-xs text-gray-800',
                  headers[ci].align === 'right' && 'text-right',
                )}
              >
                {value ?? '-'}
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
          <SummaryCard
            label={t('unitVerification.summary.added')}
            count={summary.added}
            dotColor="bg-emerald-500"
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

      {/* Units the file would add */}
      {addedUnits.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-700">
              {t('unitVerification.addedSectionLabel', { count: addedUnits.length })}
            </span>
          </div>
          <div className="overflow-auto max-h-[30vh] rounded-lg border border-emerald-200">
            <AddedUnitsTable units={addedUnits} projectType={projectType} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
        <div>
          {needsConfirm && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-700">
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
