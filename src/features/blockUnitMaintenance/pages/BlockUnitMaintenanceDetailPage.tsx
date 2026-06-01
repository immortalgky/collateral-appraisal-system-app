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
import type { ProjectType, ProjectUnitDetail, PurchaseMethod, UnitEditState } from '../types';

const LOAN_BANK_LIST_ID = 'block-unit-maint-loan-banks';

// ─── Project type pill class by code ──────────────────────────────────────────

function projectTypePillClass(code: ProjectType): string {
  if (code === 'U') return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
  return 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200';
}

// ─── Donut gauge ──────────────────────────────────────────────────────────────

const SoldDonut = ({ sold, total }: { sold: number; total: number }) => {
  const { t } = useTranslation('blockUnitMaintenance');
  const pct = total > 0 ? (sold / total) * 100 : 0;
  const size = 180;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const visibleLen = circumference * arcFraction;
  const filledLen = (pct / 100) * visibleLen;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${visibleLen} ${circumference}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filledLen} ${circumference}`}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-gray-500">{t('detail.donutSoldLabel')}</span>
        <span className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
          {pct.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500 tabular-nums mt-0.5">
          {sold} / {total}
        </span>
      </div>
    </div>
  );
};

// ─── Model breakdown panel ───────────────────────────────────────────────────

interface ModelStat {
  modelName: string;
  count: number;
}

const ModelBreakdown = ({
  heading,
  stats,
  emptyLabel,
}: {
  heading: string;
  stats: ModelStat[];
  emptyLabel: string;
}) => {
  const { t } = useTranslation('blockUnitMaintenance');
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{heading}</h4>
      <div className="border-t border-gray-200">
        {stats.length === 0 ? (
          <div className="py-3 text-xs text-gray-400">{emptyLabel}</div>
        ) : (
          stats.map(s => (
            <div
              key={s.modelName}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm text-gray-700">{s.modelName}</span>
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <span className="text-gray-700 font-medium">{s.count.toLocaleString('th-TH')}</span>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {t('detail.unitSuffix')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

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

const groupByModel = (
  units: ProjectUnitDetail[],
  predicate: (u: ProjectUnitDetail) => boolean,
): ModelStat[] => {
  const map = new Map<string, number>();
  for (const u of units) {
    if (!predicate(u)) continue;
    const key = u.modelType?.trim() || '—';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([modelName, count]) => ({ modelName, count }))
    .sort((a, b) => b.count - a.count);
};

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

// ─── Page ────────────────────────────────────────────────────────────────────

const BlockUnitMaintenanceDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('blockUnitMaintenance');

  const { data, isLoading, isError } = useGetProjectUnits(projectId ?? null);
  const { mutateAsync: updateUnits, isPending } = useUpdateUnitSaleStatus();

  const project = data?.project;
  const units = useMemo(() => data?.units ?? [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
    if (!projectId) return;
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
      await updateUnits({ projectId, payload: { items } });
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
  const soldStats = useMemo(() => groupByModel(liveUnits, u => u.isSold), [liveUnits]);
  const availableStats = useMemo(() => groupByModel(liveUnits, u => !u.isSold), [liveUnits]);

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
  }, [liveUnits, search, statusFilter]);

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
      <div className="shrink-0 flex items-center gap-3 pb-3 border-b border-gray-200">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <Icon style="solid" name="chevron-left" className="size-3.5" />
        </Button>
        <Icon style="solid" name="folder-open" className="size-4 text-cyan-500" />
        <h2 className="text-base font-semibold text-gray-900">{project?.projectName ?? '—'}</h2>
        {project?.appraisalReportNo && (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700 rounded">
            ID: {project.appraisalReportNo}
          </span>
        )}
        {project && projectTypeLabel && (
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded ${projectTypePillClass(project.projectType)}`}
          >
            {projectTypeLabel.toUpperCase()}
          </span>
        )}
      </div>

      {/* ─── Page title ───────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('detail.title')}</h3>
      </div>

      {/* ─── Stats hero ───────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6 items-center px-2">
        <ModelBreakdown
          heading={t('detail.sold')}
          stats={soldStats}
          emptyLabel={t('detail.noSold')}
        />
        <div className="flex justify-center">
          <SoldDonut sold={soldCount} total={totalUnits} />
        </div>
        <ModelBreakdown
          heading={t('detail.available')}
          stats={availableStats}
          emptyLabel={t('detail.noAvailable')}
        />
      </div>

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
        <StatusChips value={statusFilter} onChange={setStatusFilter} counts={chipCounts} t={t} />
        {(search || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
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
                  <th className="py-2.5 pl-3 pr-1 w-8">
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
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    #
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                    {t('detail.cols.floor')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.towerName')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.regNumber')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.roomNo')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.modelType')}
                  </th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.usableAreaSqm')}
                  </th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.sellingPriceBaht')}
                  </th>
                  <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.isSold')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.purchaseBy')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.loanBankName')}
                  </th>
                </tr>
              ) : (
                <tr>
                  <th className="py-2.5 pl-3 pr-1 w-8">
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
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    #
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.plotNo')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.houseNo')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.modelName')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.numFloors')}
                  </th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.landAreaSqWa')}
                  </th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.usableAreaSqm')}
                  </th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('detail.cols.sellingPriceBaht')}
                  </th>
                  <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.isSold')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.purchaseBy')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {t('units.col.loanBankName')}
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton
                  columns={Array.from({ length: 12 }, () => ({ width: 'w-16' }))}
                  rows={8}
                />
              ) : isError ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-red-500">
                    {t('errors.unitLoadFailed')}
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-sm text-gray-500">{t('units.empty')}</p>
                    </div>
                  </td>
                </tr>
              ) : project ? (
                filteredUnits.map(unit => {
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
