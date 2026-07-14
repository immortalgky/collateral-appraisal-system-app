import { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import { NumberInput } from '@/shared/components';
import Modal from '@/shared/components/Modal';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import {
  useBlockReappraisalDetail,
  useCreateBlockReappraisal,
  useMarkBlockReappraisalNotRequired,
} from '../api/blockReappraisal';
import type { BlockReappraisalUnitDetail, BlockReappraisalCreateResult } from '../types';
import { isCondo } from '@/features/blockProject/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n?: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

// Case-insensitive substring match across the unit's identifying fields
// (covers both Condo and Land & Building layouts).
function matchUnit(unit: BlockReappraisalUnitDetail, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    unit.modelType,
    unit.plotNumber,
    unit.houseNumber,
    unit.towerName,
    unit.roomNumber,
    unit.condoRegistrationNumber,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

// ─── Sold-status filter chips ─────────────────────────────────────────────────

type StatusFilter = 'all' | 'sold' | 'available';

function StatusChips({
  value,
  onChange,
  counts,
  t,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  t: TFunction<readonly ['blockReappraisal', 'common']>;
}) {
  const chips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('detail.filter.all') },
    { key: 'sold', label: t('detail.filter.sold') },
    { key: 'available', label: t('detail.filter.available') },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map(c => {
        const active = c.key === value;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{c.label}</span>
            <span
              className={`tabular-nums px-1.5 py-px rounded-full text-[10px] ${
                active ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {counts[c.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Column sorting ───────────────────────────────────────────────────────────

type SortKey =
  | 'plotNumber'
  | 'houseNumber'
  | 'modelType'
  | 'numberOfFloors'
  | 'landArea'
  | 'usableArea'
  | 'sellingPrice'
  | 'lastAppraisedValue'
  | 'updatedAt';
type SortDir = 'asc' | 'desc';

function sortUnits(
  units: BlockReappraisalUnitDetail[],
  key: SortKey | null,
  dir: SortDir,
): BlockReappraisalUnitDetail[] {
  if (!key) return units;
  const factor = dir === 'asc' ? 1 : -1;
  return [...units].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    // Nulls always sort last, regardless of direction.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * factor;
    }
    return (Number(av) - Number(bv)) * factor;
  });
}

interface SortableThProps {
  label: string;
  columnKey: SortKey;
  activeKey: SortKey | null;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right' | 'center';
}

function SortableTh({ label, columnKey, activeKey, dir, onSort, align = 'left' }: SortableThProps) {
  const active = activeKey === columnKey;
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justifyClass =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={`py-2 px-3 text-gray-500 font-medium whitespace-nowrap ${alignClass}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex w-full items-center gap-1 hover:text-gray-700 transition-colors ${justifyClass} ${
          active ? 'text-gray-700' : ''
        }`}
      >
        <span>{label}</span>
        <Icon
          style="solid"
          name={active ? (dir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={`size-2.5 ${active ? 'text-primary' : 'text-gray-300'}`}
        />
      </button>
    </th>
  );
}

// Estimate Price cell — sold / not-yet-valued units carry no estimate, so render a
// muted dash instead of "0" to avoid a zero being read as a real valuation.
function EstimateCell({ value }: { value: number | null }) {
  const empty = value == null || value === 0;
  return (
    <td className={`py-1.5 px-3 tabular-nums text-right ${empty ? 'text-gray-300' : 'text-gray-700'}`}>
      {empty ? '–' : value.toLocaleString()}
    </td>
  );
}

// ─── Due-date urgency badge ───────────────────────────────────────────────────

// Whole-day difference between the due date and today (negative = overdue).
function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function DueBadge({
  days,
  t,
}: {
  days: number;
  t: TFunction<readonly ['blockReappraisal', 'common']>;
}) {
  const overdue = days < 0;
  const soon = days >= 0 && days <= 30;
  const tone = overdue
    ? 'bg-red-50 text-red-700 border-red-100'
    : soon
      ? 'bg-amber-50 text-amber-700 border-amber-100'
      : 'bg-green-50 text-green-700 border-green-100';
  const label = overdue
    ? t('detail.dueBadge.overdue', { days: Math.abs(days) })
    : days === 0
      ? t('detail.dueBadge.today')
      : t('detail.dueBadge.inDays', { days });
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${tone}`}
    >
      <Icon style="solid" name={overdue ? 'triangle-exclamation' : 'clock'} className="size-2.5" />
      {label}
    </span>
  );
}

// ─── Compact metrics-bar helpers ──────────────────────────────────────────────

// Colored dot + label + count, used for the Sold / Available tallies.
function MiniStat({ dotClass, label, value }: { dotClass: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`size-2 rounded-full ${dotClass}`} />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

// Accent icon chip + label + value, used for the estimate KPIs inline.
function MiniMetric({
  icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className={`size-7 shrink-0 rounded-md flex items-center justify-center ${iconBg}`}>
        <Icon style="solid" name={icon} className={`size-3.5 ${iconColor}`} />
      </div>
      <div className="flex flex-col leading-tight items-end text-right">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
      </div>
    </div>
  );
}

// ─── Create confirm modal ─────────────────────────────────────────────────────

// ─── Create success modal ─────────────────────────────────────────────────────

interface CreateSuccessModalProps {
  open: boolean;
  result: BlockReappraisalCreateResult;
  onClose: () => void;
}

function CreateSuccessModal({ open, result, onClose }: CreateSuccessModalProps) {
  const { t } = useTranslation(['blockReappraisal', 'common']);
  return (
    <Modal isOpen={open} onClose={onClose} title={t('detail.successModal.title')} size="sm">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="size-12 rounded-full bg-green-50 flex items-center justify-center">
            <Icon style="solid" name="check" className="size-5 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {t('detail.successModal.heading')}
            </p>
            {result.requestNumber && (
              <p className="text-xs text-gray-500 mt-1">
                {t('detail.successModal.requestNumber')}{' '}
                <strong className="text-gray-800">{result.requestNumber}</strong>
              </p>
            )}
            <p className="text-xs text-gray-500">
              {t('detail.successModal.groupNumber')}{' '}
              <strong className="text-gray-800">{result.groupNumber}</strong>
            </p>
          </div>
        </div>

        {result.skipped && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-xs font-medium text-amber-800">
              {t('detail.successModal.alreadyInProgress')}
            </p>
            {result.skipReason && (
              <p className="text-xs text-amber-700 mt-0.5">{result.skipReason}</p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t('common:actions.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Field display pair ───────────────────────────────────────────────────────

function Field({
  label,
  value,
  align,
}: {
  label: string;
  value?: string | number | null;
  align?: 'right';
}) {
  return (
    <div className={`flex flex-col leading-tight ${align === 'right' ? 'items-end text-right' : ''}`}>
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800 tabular-nums mt-0.5">{value ?? '-'}</span>
    </div>
  );
}

// Neutral pill + colored dot. The "Sold" dot uses the same violet as the overview
// donut's sold arc so the two visualizations read as one; "Available" stays green.
function UnitStatusBadge({ isSold }: { isSold: boolean }) {
  const { t } = useTranslation('blockReappraisal');
  return (
    <span
      title={isSold ? t('units.soldHint') : t('units.availableHint')}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${
        isSold
          ? 'bg-violet-50 text-violet-700 border-violet-100'
          : 'bg-green-50 text-green-700 border-green-100'
      }`}
    >
      <span className={`size-1.5 rounded-full ${isSold ? 'bg-violet-500' : 'bg-green-500'}`} />
      {isSold ? t('units.sold') : t('units.available')}
    </span>
  );
}

// ─── Read-only Condo units table ──────────────────────────────────────────────

interface UnitsTableProps {
  units: BlockReappraisalUnitDetail[];
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function CondoUnitsTable({ units, sortKey, sortDir, onSort }: UnitsTableProps) {
  const { t, i18n } = useTranslation('blockReappraisal');
  const sortProps = { activeKey: sortKey, dir: sortDir, onSort };
  return (
    <table className="w-full min-w-max text-xs">
      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">#</th>
          <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.floor')}
          </th>
          <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.towerName')}
          </th>
          <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.regNumber')}
          </th>
          <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.roomNo')}
          </th>
          <SortableTh label={t('units.cols.modelType')} columnKey="modelType" {...sortProps} />
          <SortableTh
            label={t('units.cols.usableArea')}
            columnKey="usableArea"
            align="right"
            {...sortProps}
          />
          <SortableTh
            label={t('units.cols.sellingPrice')}
            columnKey="sellingPrice"
            align="right"
            {...sortProps}
          />
          <SortableTh
            label={t('units.cols.appraisalValue')}
            columnKey="lastAppraisedValue"
            align="right"
            {...sortProps}
          />
          <th className="text-center py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.isSold')}
          </th>
          <SortableTh label={t('units.cols.lastUpdated')} columnKey="updatedAt" {...sortProps} />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {units.map(u => (
          <tr
            key={u.sequenceNumber}
            className={u.isSold ? 'bg-violet-50/40 hover:bg-violet-50' : 'hover:bg-gray-50'}
          >
            <td className="py-1.5 px-3 text-gray-500 tabular-nums">{u.sequenceNumber}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.floor ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.towerName ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.condoRegistrationNumber ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.roomNumber ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.modelType ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.usableArea)}
            </td>
            <td className="py-1.5 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.sellingPrice)}
            </td>
            <EstimateCell value={u.lastAppraisedValue} />
            <td className="py-1.5 px-3 text-center">
              <UnitStatusBadge isSold={u.isSold} />
            </td>
            <td className="py-1.5 px-3 text-gray-700 whitespace-nowrap leading-tight">
              <div>{formatLocaleDateTime(u.updatedAt, i18n.language)}</div>
              {u.updatedBy && (
                <div className="text-[10px] text-gray-400">
                  {t('units.updatedByLine', { name: u.updatedBy })}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Read-only Land & Building units table ────────────────────────────────────

function LandBuildingUnitsTable({ units, sortKey, sortDir, onSort }: UnitsTableProps) {
  const { t, i18n } = useTranslation('blockReappraisal');
  const sortProps = { activeKey: sortKey, dir: sortDir, onSort };
  return (
    <table className="w-full min-w-max text-xs">
      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">#</th>
          <SortableTh label={t('units.cols.plotNo')} columnKey="plotNumber" {...sortProps} />
          <SortableTh label={t('units.cols.houseNo')} columnKey="houseNumber" {...sortProps} />
          <SortableTh label={t('units.cols.modelType')} columnKey="modelType" {...sortProps} />
          <SortableTh
            label={t('units.cols.numFloors')}
            columnKey="numberOfFloors"
            align="center"
            {...sortProps}
          />
          <SortableTh
            label={t('units.cols.landArea')}
            columnKey="landArea"
            align="right"
            {...sortProps}
          />
          <SortableTh
            label={t('units.cols.usableArea')}
            columnKey="usableArea"
            align="right"
            {...sortProps}
          />
          <SortableTh
            label={t('units.cols.sellingPrice')}
            columnKey="sellingPrice"
            align="right"
            {...sortProps}
          />
          <SortableTh
            label={t('units.cols.appraisalValue')}
            columnKey="lastAppraisedValue"
            align="right"
            {...sortProps}
          />
          <th className="text-center py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.isSold')}
          </th>
          <SortableTh label={t('units.cols.lastUpdated')} columnKey="updatedAt" {...sortProps} />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {units.map(u => (
          <tr
            key={u.sequenceNumber}
            className={u.isSold ? 'bg-violet-50/40 hover:bg-violet-50' : 'hover:bg-gray-50'}
          >
            <td className="py-1.5 px-3 text-gray-500 tabular-nums">{u.sequenceNumber}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.plotNumber ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.houseNumber ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700">{u.modelType ?? '-'}</td>
            <td className="py-1.5 px-3 text-gray-700 tabular-nums text-center">
              {u.numberOfFloors ?? '-'}
            </td>
            <td className="py-1.5 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.landArea)}
            </td>
            <td className="py-1.5 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.usableArea)}
            </td>
            <td className="py-1.5 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.sellingPrice)}
            </td>
            <EstimateCell value={u.lastAppraisedValue} />
            <td className="py-1.5 px-3 text-center">
              <UnitStatusBadge isSold={u.isSold} />
            </td>
            <td className="py-1.5 px-3 text-gray-700 whitespace-nowrap leading-tight">
              <div>{formatLocaleDateTime(u.updatedAt, i18n.language)}</div>
              {u.updatedBy && (
                <div className="text-[10px] text-gray-400">
                  {t('units.updatedByLine', { name: u.updatedBy })}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function BlockReappraisalDetailPage() {
  const { collateralMasterId } = useParams<{ collateralMasterId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['blockReappraisal', 'common']);

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useBlockReappraisalDetail(collateralMasterId ?? '');

  const createMutation = useCreateBlockReappraisal();
  const optOutMutation = useMarkBlockReappraisalNotRequired();

  // Modal states
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<BlockReappraisalCreateResult | null>(null);
  const [optOutConfirmOpen, setOptOutConfirmOpen] = useState(false);

  // Filter state (client-side, over the already-fetched unit list)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);

  const units = detail?.structure.units ?? [];

  // Chip counts computed over the full (unfiltered) list so badges stay stable.
  const chipCounts: Record<StatusFilter, number> = {
    all: units.length,
    sold: units.filter(u => u.isSold).length,
    available: units.filter(u => !u.isSold).length,
  };

  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      if (!matchUnit(u, search.trim())) return false;
      if (minValue != null && (u.lastAppraisedValue == null || u.lastAppraisedValue < minValue)) {
        return false;
      }
      if (maxValue != null && (u.lastAppraisedValue == null || u.lastAppraisedValue > maxValue)) {
        return false;
      }
      switch (statusFilter) {
        case 'sold':
          return u.isSold;
        case 'available':
          return !u.isSold;
        case 'all':
        default:
          return true;
      }
    });
  }, [units, search, statusFilter, minValue, maxValue]);

  const filtersActive =
    search !== '' || statusFilter !== 'all' || minValue != null || maxValue != null;

  // Sorting (shared across both table layouts)
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      // 3rd stage: clear the sort (back to natural order).
      setSortKey(null);
      setSortDir('asc');
    }
  };
  const displayUnits = useMemo(
    () => sortUnits(filteredUnits, sortKey, sortDir),
    [filteredUnits, sortKey, sortDir],
  );

  // KPI strip — portfolio value at a glance (over the full, unfiltered unit list).
  const valuedUnits = units.filter(u => (u.lastAppraisedValue ?? 0) > 0);
  const totalEstimate = valuedUnits.reduce((sum, u) => sum + (u.lastAppraisedValue ?? 0), 0);
  const avgEstimate = valuedUnits.length ? Math.round(totalEstimate / valuedUnits.length) : 0;

  // Days until the reappraisal due date (negative = overdue).
  const dueDays = detail ? daysUntil(detail.dueDate) : 0;

  const handleCreateConfirm = () => {
    if (!collateralMasterId) return;
    createMutation.mutate(collateralMasterId, {
      onSuccess: result => {
        setCreateConfirmOpen(false);
        setSuccessResult(result);
        setSuccessModalOpen(true);
      },
      onError: () => {
        toast.error(t('error.createFailed'));
      },
    });
  };

  const handleOptOutConfirm = () => {
    if (!collateralMasterId) return;
    optOutMutation.mutate(collateralMasterId, {
      onSuccess: () => {
        toast.success(t('success.optOut'));
        navigate('/standalone/block-reappraisal');
      },
      onError: () => {
        toast.error(t('error.optOutFailed'));
      },
    });
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error / not found ──
  if (isError || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">
            {isError ? t('detail.error.loadFailed') : t('detail.error.notFound')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/standalone/block-reappraisal')}
        >
          {t('detail.backToList')}
        </Button>
      </div>
    );
  }

  const condo = isCondo(detail.projectType);
  const soldPct = detail.totalUnits > 0 ? (detail.soldUnits / detail.totalUnits) * 100 : 0;

  return (
    <div className="flex flex-col min-h-full min-w-0 gap-4">
      {/* ── Page header ── */}
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/standalone/block-reappraisal')}
            className="flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Icon style="solid" name="arrow-left" className="size-3.5" />
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">
              {detail.projectName ?? t('detail.unnamedProject')}
            </h2>
            <span className="text-gray-300">·</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                condo
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}
            >
              {condo ? t('projectType.condo') : t('projectType.landAndBuilding')}
            </span>
            {detail.oldAppraisalNumber && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">
                  {t('detail.oldAppraisalLabel')} {detail.oldAppraisalNumber}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="!text-danger !border-danger/30 hover:!bg-danger/5"
            onClick={() => setOptOutConfirmOpen(true)}
            leftIcon={<Icon style="solid" name="ban" className="size-3" />}
          >
            {t('actions.notRequired')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateConfirmOpen(true)}
            leftIcon={<Icon style="solid" name="play" className="size-3" />}
          >
            {t('actions.createRequest')}
          </Button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-x-6 gap-y-2 flex-wrap">
          <Field
            label={t('columns.lastAppraisedDate')}
            value={formatLocaleDate(detail.lastAppraisedDate, i18n.language)}
          />
          <div className="hidden sm:block h-8 w-px bg-gray-200" />
          {/* Due date + urgency badge */}
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] text-gray-400">{t('detail.fields.dueDate')}</span>
            <span className="text-sm font-medium text-gray-800 tabular-nums mt-0.5 flex items-center gap-2">
              {formatLocaleDate(detail.dueDate, i18n.language)}
              <DueBadge days={dueDays} t={t} />
            </span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-gray-200" />
          <Field
            label={t('columns.projectSellingPrice')}
            value={formatNumber(detail.projectSellingPrice)}
            align="right"
          />
        </div>
      </section>

      {/* ── Compact metrics bar (rich overview is collapsible) ── */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-x-6 gap-y-3 px-4 py-2.5 flex-wrap">
          {/* Sold progress gauge */}
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-gray-400">{t('detail.overview.donutSoldLabel')}</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {soldPct.toFixed(1)}%
                <span className="ml-1 text-xs font-normal text-gray-400">
                  ({detail.soldUnits}/{detail.totalUnits})
                </span>
              </span>
            </div>
            <div className="flex-1 min-w-[64px] h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${soldPct}%` }} />
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-gray-200" />

          {/* Sold / Available tallies */}
          <div className="flex items-center gap-5">
            <MiniStat dotClass="bg-violet-500" label={t('detail.overview.sold')} value={chipCounts.sold} />
            <MiniStat
              dotClass="bg-green-500"
              label={t('detail.overview.available')}
              value={chipCounts.available}
            />
          </div>

          <div className="hidden sm:block h-8 w-px bg-gray-200" />

          {/* Estimate KPIs */}
          <div className="flex items-center gap-6">
            <MiniMetric
              icon="money-bill"
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              label={t('detail.kpi.totalEstimate')}
              value={totalEstimate > 0 ? totalEstimate.toLocaleString() : '–'}
            />
            <MiniMetric
              icon="chart-line"
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              label={t('detail.kpi.avgEstimate')}
              value={avgEstimate > 0 ? avgEstimate.toLocaleString() : '–'}
            />
          </div>
        </div>
      </section>

      {/* ── Units table (read-only) ── */}
      <section className="flex-1 min-h-[24rem] bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700">{t('detail.units.title')}</h3>
          <span className="text-xs text-gray-400 tabular-nums">
            {filtersActive
              ? `${filteredUnits.length} / ${units.length}`
              : units.length}{' '}
            {t('detail.units.count')}
          </span>
        </div>

        {/* ── Filter bar ── */}
        {units.length > 0 && (
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px] max-w-md">
              <Input
                placeholder={t('detail.filter.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <NumberInput
                className="w-28"
                placeholder={t('detail.filter.estimateMin')}
                value={minValue}
                onChange={e => setMinValue(e.target.value)}
              />
              <span className="text-gray-400">–</span>
              <NumberInput
                className="w-28"
                placeholder={t('detail.filter.estimateMax')}
                value={maxValue}
                onChange={e => setMaxValue(e.target.value)}
              />
            </div>
            <StatusChips value={statusFilter} onChange={setStatusFilter} counts={chipCounts} t={t} />
            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setMinValue(null);
                  setMaxValue(null);
                }}
              >
                <Icon style="regular" name="xmark" className="size-3.5 mr-1" />
                {t('detail.filter.clear')}
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto">
          {units.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Icon style="regular" name="folder-open" className="size-8 text-gray-300" />
              <p className="text-xs text-gray-400">{t('detail.units.empty')}</p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Icon style="regular" name="magnifying-glass" className="size-8 text-gray-300" />
              <p className="text-xs text-gray-400">{t('detail.filter.noMatch')}</p>
            </div>
          ) : condo ? (
            <CondoUnitsTable
              units={displayUnits}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          ) : (
            <LandBuildingUnitsTable
              units={displayUnits}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </div>
      </section>

      {/* ── Modals ── */}
      <ConfirmDialog
        isOpen={createConfirmOpen}
        onClose={() => setCreateConfirmOpen(false)}
        onConfirm={handleCreateConfirm}
        title={t('detail.createModal.title')}
        message={t('detail.createModal.body')}
        confirmText={t('common:actions.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="primary"
        isLoading={createMutation.isPending}
      />

      {successResult && (
        <CreateSuccessModal
          open={successModalOpen}
          result={successResult}
          onClose={() => {
            setSuccessModalOpen(false);
            navigate('/standalone/block-reappraisal');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={optOutConfirmOpen}
        onClose={() => setOptOutConfirmOpen(false)}
        onConfirm={handleOptOutConfirm}
        title={t('detail.optOutModal.title')}
        message={t('detail.optOutModal.body')}
        confirmText={t('detail.optOutModal.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
        isLoading={optOutMutation.isPending}
      />
    </div>
  );
}

export default BlockReappraisalDetailPage;
