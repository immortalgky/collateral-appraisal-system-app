import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useGetProjectUnits, useUpdateUnitSaleStatus } from '../api/blockUnitMaintenance';
import { UnitRow } from '../components/UnitRow';
import { isCondo } from '@/features/blockProject/types';
import type { ProjectUnitDetail, PurchaseMethod, UnitEditState } from '../types';
import { NumberInput } from '@/shared/components';

const LOAN_BANK_LIST_ID = 'block-unit-maint-loan-banks';

// ─── Helper: filter + group ──────────────────────────────────────────────────

const matchUnit = (unit: ProjectUnitDetail, q: string): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    unit.modelType,
    unit.towerName,
    unit.roomNumber,
    unit.plotNumber,
    unit.houseNumber,
    unit.loanBankName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
};

// ─── Compact metrics-bar helpers ──────────────────────────────────────────────

// Colored dot + label + count, used for the Sold / Available tallies.
const MiniStat = ({ dotClass, label, value }: { dotClass: string; label: string; value: number }) => (
  <div className="flex items-center gap-1.5 whitespace-nowrap">
    <span className={`size-2 rounded-full ${dotClass}`} />
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
  </div>
);

// Accent icon chip + label + value, used for the estimate KPIs inline (value right-aligned).
const MiniMetric = ({
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
}) => (
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

// ─── Status filter chips ─────────────────────────────────────────────────────

type StatusFilter = 'all' | 'sold' | 'available' | 'soldLoan';

const StatusChips = ({
  value,
  onChange,
  counts,
  t,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  t: TFunction<'blockUnitMaintenance'>;
}) => {
  const chips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('detail.filter.all') },
    { key: 'sold', label: t('detail.filter.sold') },
    { key: 'available', label: t('detail.filter.available') },
    { key: 'soldLoan', label: t('detail.filter.soldLoan') },
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
};

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
  units: ProjectUnitDetail[],
  key: SortKey | null,
  dir: SortDir,
): ProjectUnitDetail[] {
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

const SortableTh = ({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  columnKey: SortKey;
  activeKey: SortKey | null;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right' | 'center';
}) => {
  const active = activeKey === columnKey;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
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
};

// ─── Page ────────────────────────────────────────────────────────────────────

const BlockUnitMaintenanceDetailPage = () => {
  const { collateralMasterId } = useParams<{ collateralMasterId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('blockUnitMaintenance');

  const { data, isLoading, isError } = useGetProjectUnits(collateralMasterId ?? null);
  const { mutateAsync: updateUnits, isPending } = useUpdateUnitSaleStatus();

  const project = data?.project;
  const units = useMemo(() => data?.units ?? [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkLoanBank, setBulkLoanBank] = useState('');
  const [edits, setEdits] = useState<Map<string, UnitEditState>>(() => new Map());
  const originalRef = useRef<Map<string, UnitEditState>>(new Map());

  useEffect(() => {
    if (units.length > 0) {
      const initial = new Map<string, UnitEditState>(
        units.map(u => [
          u.id,
          {
            isSold: u.isSold,
            purchaseBy: u.purchaseBy,
            loanBankName: u.loanBankName ?? '',
          } satisfies UnitEditState,
        ]),
      );
      setEdits(initial);
      originalRef.current = new Map(initial);
      setSelected(new Set());
    }
  }, [units]);

  const isDirty = useCallback(
    (unitId: string): boolean => {
      const orig = originalRef.current.get(unitId);
      const curr = edits.get(unitId);
      if (!orig || !curr) return false;
      return (
        orig.isSold !== curr.isSold ||
        orig.purchaseBy !== curr.purchaseBy ||
        orig.loanBankName !== curr.loanBankName
      );
    },
    [edits],
  );

  const dirtyIds = useMemo(() => units.filter(u => isDirty(u.id)).map(u => u.id), [units, isDirty]);
  const hasDirty = dirtyIds.length > 0;

  // ─── Unsaved-changes guard (router + tab close) ─────────────────────────
  // Blocks any in-app navigation while there are dirty rows; a ConfirmDialog
  // is rendered below to let the user proceed (discard edits) or cancel.
  const blocker = useBlocker(hasDirty);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDirty]);

  const handleChange = useCallback((unitId: string, patch: Partial<UnitEditState>) => {
    setEdits(prev => {
      const next = new Map(prev);
      const current = next.get(unitId);
      if (current) next.set(unitId, { ...current, ...patch });
      return next;
    });
  }, []);

  const applyBulk = (patch: Partial<UnitEditState>) => {
    if (selected.size === 0) return;
    setEdits(prev => {
      const next = new Map(prev);
      for (const id of selected) {
        const current = next.get(id);
        if (current) next.set(id, { ...current, ...patch });
      }
      return next;
    });
  };

  const handleBulkCash = () => applyBulk({ isSold: true, purchaseBy: 'Cash', loanBankName: '' });

  const handleBulkLoan = () =>
    applyBulk({
      isSold: true,
      purchaseBy: 'Loan',
      loanBankName: bulkLoanBank.trim(),
    });

  const handleBulkAvailable = () =>
    applyBulk({ isSold: false, purchaseBy: null, loanBankName: '' });

  const toggleSelect = (unitId: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });

  const validate = (): string | null => {
    for (const unitId of dirtyIds) {
      const state = edits.get(unitId);
      if (!state) continue;
      if (state.isSold && !state.purchaseBy) {
        return t('errors.validation.purchaseByRequired');
      }
      if (state.isSold && state.purchaseBy === 'Loan' && !state.loanBankName.trim()) {
        return t('errors.validation.loanBankRequired');
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!collateralMasterId) return;
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const items = dirtyIds.map(unitId => {
      const state = edits.get(unitId)!;
      return {
        unitId,
        isSold: state.isSold,
        purchaseBy: state.isSold ? state.purchaseBy : null,
        loanBankName:
          state.isSold && state.purchaseBy === 'Loan' ? state.loanBankName.trim() : null,
      };
    });
    try {
      await updateUnits({ collateralMasterId, payload: { items } });
      toast.success(t('success.saved'));
    } catch {
      toast.error(t('errors.saveFailed'));
    }
  };

  const handleBack = () => navigate('/standalone/block-unit-maintenance');

  // ─── Derived stats from edited state (so the donut reflects pending edits) ──
  const liveUnits = useMemo(() => {
    if (edits.size === 0) return units;
    return units.map(u => {
      const e = edits.get(u.id);
      if (!e) return u;
      return {
        ...u,
        isSold: e.isSold,
        purchaseBy: e.purchaseBy,
        loanBankName: e.loanBankName,
      } satisfies ProjectUnitDetail;
    });
  }, [units, edits]);

  const totalUnits = liveUnits.length;
  const soldCount = liveUnits.filter(u => u.isSold).length;
  const soldPct = totalUnits > 0 ? (soldCount / totalUnits) * 100 : 0;

  // Estimate KPIs (over the full live list).
  const valuedUnits = liveUnits.filter(u => (u.lastAppraisedValue ?? 0) > 0);
  const totalEstimate = valuedUnits.reduce((sum, u) => sum + (u.lastAppraisedValue ?? 0), 0);
  const avgEstimate = valuedUnits.length ? Math.round(totalEstimate / valuedUnits.length) : 0;

  // Distinct loan bank names from the live data — used for autocomplete.
  const loanBankSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const u of liveUnits) {
      const v = u.loanBankName?.trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [liveUnits]);

  // Status-filter counts (computed before list filter so chip badges are stable).
  const chipCounts: Record<StatusFilter, number> = {
    all: liveUnits.length,
    sold: liveUnits.filter(u => u.isSold).length,
    available: liveUnits.filter(u => !u.isSold).length,
    soldLoan: liveUnits.filter(u => u.isSold && u.purchaseBy === 'Loan').length,
  };

  const filteredUnits = useMemo(() => {
    return liveUnits.filter(u => {
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
        case 'soldLoan':
          return u.isSold && u.purchaseBy === 'Loan';
        case 'all':
        default:
          return true;
      }
    });
  }, [liveUnits, search, statusFilter, minValue, maxValue]);

  // Sorting (shared across both condo / land layouts)
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
  const sortedUnits = useMemo(
    () => sortUnits(filteredUnits, sortKey, sortDir),
    [filteredUnits, sortKey, sortDir],
  );
  const sortProps = { activeKey: sortKey, dir: sortDir, onSort: handleSort };

  // Master checkbox state for the currently-filtered list.
  const filteredIds = useMemo(() => filteredUnits.map(u => u.id), [filteredUnits]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const someFilteredSelected = filteredIds.some(id => selected.has(id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  };

  const projectTypeLabel = useParameterDescription('ProjectType', project?.projectType ?? null);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Unsaved-changes confirmation (driven by react-router blocker) */}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title={t('detail.unsavedTitle')}
        message={t('detail.unsavedConfirm')}
        confirmText={t('detail.unsavedLeave')}
        cancelText={t('detail.unsavedStay')}
        variant="warning"
      />

      {/* Datalist for Loan Bank autocomplete (shared across all rows) */}
      <datalist id={LOAN_BANK_LIST_ID}>
        {loanBankSuggestions.map(b => (
          <option key={b} value={b} />
        ))}
      </datalist>

      {/* ─── Hero header (project name + ID + type pill) ───────────────────── */}
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Icon style="solid" name="arrow-left" className="size-3.5" />
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">
              {project?.projectName ?? '—'}
            </h2>
            {project && projectTypeLabel && (
              <>
                <span className="text-gray-300">·</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                    isCondo(project.projectType)
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}
                >
                  {projectTypeLabel}
                </span>
              </>
            )}
            {project?.appraisalReportNo && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">ID: {project.appraisalReportNo}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Compact metrics bar ──────────────────────────────────────────── */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-x-6 gap-y-3 px-4 py-2.5 flex-wrap">
          {/* Sold progress gauge */}
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-gray-400">{t('detail.donutSoldLabel')}</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {soldPct.toFixed(1)}%
                <span className="ml-1 text-xs font-normal text-gray-400">
                  ({soldCount}/{totalUnits})
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
            <MiniStat dotClass="bg-violet-500" label={t('detail.sold')} value={chipCounts.sold} />
            <MiniStat
              dotClass="bg-green-500"
              label={t('detail.available')}
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

      {/* ─── Search bar + status chips ────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            placeholder={t('detail.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <NumberInput
            className="w-28"
            placeholder={t('detail.filter.appraisalMin')}
            value={minValue}
            onChange={e => setMinValue(e.target.value)}
          />
          <span className="text-gray-400">–</span>
          <NumberInput
            className="w-28"
            placeholder={t('detail.filter.appraisalMax')}
            value={maxValue}
            onChange={e => setMaxValue(e.target.value)}
          />
        </div>
        <StatusChips value={statusFilter} onChange={setStatusFilter} counts={chipCounts} t={t} />
        {(search || statusFilter !== 'all' || minValue != null || maxValue != null) && (
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
            {t('list.clearFilters')}
          </Button>
        )}
      </div>

      {/* ─── Bulk action bar (visible only when selection > 0) ────────────── */}
      {selected.size > 0 && (
        <div className="shrink-0 flex items-center gap-3 flex-wrap rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-primary">
            {t('detail.bulk.selectedCount', { count: selected.size })}
          </span>
          <span className="h-4 w-px bg-primary/20" aria-hidden />
          <Button size="sm" variant="secondary" onClick={handleBulkCash}>
            <Icon style="solid" name="money-bill" className="size-3.5 mr-1.5" />
            {t('detail.bulk.markCash')}
          </Button>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={handleBulkLoan}>
              <Icon style="solid" name="building-columns" className="size-3.5 mr-1.5" />
              {t('detail.bulk.markLoan')}
            </Button>
            <input
              type="text"
              list={LOAN_BANK_LIST_ID}
              value={bulkLoanBank}
              onChange={e => setBulkLoanBank(e.target.value)}
              placeholder={t('detail.bulk.bankPlaceholder')}
              className="text-xs border border-gray-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={handleBulkAvailable}>
            <Icon style="solid" name="rotate-left" className="size-3.5 mr-1.5" />
            {t('detail.bulk.markAvailable')}
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {t('detail.bulk.clear')}
          </Button>
        </div>
      )}

      {/* ─── Units table ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              {project && isCondo(project.projectType) ? (
                <tr>
                  <th className="py-2 pl-3 pr-1 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      aria-label={t('units.selectAll')}
                      className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                    />
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    #
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">
                    {t('detail.cols.floor')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.towerName')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.regNumber')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.roomNo')}
                  </th>
                  <SortableTh label={t('detail.cols.modelType')} columnKey="modelType" {...sortProps} />
                  <SortableTh
                    label={t('detail.cols.usableAreaSqm')}
                    columnKey="usableArea"
                    align="right"
                    {...sortProps}
                  />
                  <SortableTh
                    label={t('detail.cols.sellingPriceBaht')}
                    columnKey="sellingPrice"
                    align="right"
                    {...sortProps}
                  />
                  <SortableTh
                    label={t('detail.cols.appraisalValue')}
                    columnKey="lastAppraisedValue"
                    align="right"
                    {...sortProps}
                  />
                  <th className="text-center py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.isSold')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.purchaseBy')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.loanBankName')}
                  </th>
                  <SortableTh
                    label={t('detail.cols.lastUpdated')}
                    columnKey="updatedAt"
                    {...sortProps}
                  />
                </tr>
              ) : (
                <tr>
                  <th className="py-2 pl-3 pr-1 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      aria-label={t('units.selectAll')}
                      className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                    />
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    #
                  </th>
                  <SortableTh label={t('detail.cols.plotNo')} columnKey="plotNumber" {...sortProps} />
                  <SortableTh label={t('detail.cols.houseNo')} columnKey="houseNumber" {...sortProps} />
                  <SortableTh label={t('detail.cols.modelName')} columnKey="modelType" {...sortProps} />
                  <SortableTh
                    label={t('detail.cols.numFloors')}
                    columnKey="numberOfFloors"
                    align="center"
                    {...sortProps}
                  />
                  <SortableTh
                    label={t('detail.cols.landAreaSqWa')}
                    columnKey="landArea"
                    align="right"
                    {...sortProps}
                  />
                  <SortableTh
                    label={t('detail.cols.usableAreaSqm')}
                    columnKey="usableArea"
                    align="right"
                    {...sortProps}
                  />
                  <SortableTh
                    label={t('detail.cols.sellingPriceBaht')}
                    columnKey="sellingPrice"
                    align="right"
                    {...sortProps}
                  />
                  <SortableTh
                    label={t('detail.cols.appraisalValue')}
                    columnKey="lastAppraisedValue"
                    align="right"
                    {...sortProps}
                  />
                  <th className="text-center py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.isSold')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.purchaseBy')}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.loanBankName')}
                  </th>
                  <SortableTh
                    label={t('detail.cols.lastUpdated')}
                    columnKey="updatedAt"
                    {...sortProps}
                  />
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton
                  columns={Array.from({ length: 14 }, () => ({ width: 'w-16' }))}
                  rows={8}
                />
              ) : isError ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-red-500">
                    {t('errors.unitLoadFailed')}
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-sm text-gray-500">{t('units.empty')}</p>
                    </div>
                  </td>
                </tr>
              ) : project ? (
                sortedUnits.map(unit => {
                  const editState: UnitEditState = edits.get(unit.id) ?? {
                    isSold: unit.isSold,
                    purchaseBy: unit.purchaseBy as PurchaseMethod | null,
                    loanBankName: unit.loanBankName ?? '',
                  };
                  return (
                    <UnitRow
                      key={unit.id}
                      unit={unit}
                      projectType={project.projectType}
                      editState={editState}
                      isDirty={isDirty(unit.id)}
                      isSelected={selected.has(unit.id)}
                      onToggleSelect={toggleSelect}
                      onChange={handleChange}
                      loanBankListId={LOAN_BANK_LIST_ID}
                      t={t}
                    />
                  );
                })
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Save footer */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500 flex items-center gap-2">
            {hasDirty && (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t('detail.dirtyCount', { count: dirtyIds.length })}
              </span>
            )}
            {!hasDirty && <span>{t('units.noChanges')}</span>}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              {t('detail.backToList')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasDirty || isPending}>
              {isPending ? (
                <>
                  <Icon style="solid" name="spinner" className="size-3.5 mr-1.5 animate-spin" />
                  {t('units.saving')}
                </>
              ) : (
                <>
                  <Icon style="solid" name="floppy-disk" className="size-3.5 mr-1.5" />
                  {t('units.saveChanges')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockUnitMaintenanceDetailPage;
