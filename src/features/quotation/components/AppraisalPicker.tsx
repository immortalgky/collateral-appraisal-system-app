import { useEffect, useMemo, useRef, useState } from 'react';

import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import ProvinceAutocomplete from '@/shared/components/inputs/ProvinceAutocomplete';

import {
  useEligibleAppraisalsForQuotation,
  type EligibleAppraisalsParams,
} from '@/features/appraisal/api/eligibleAppraisalsForQuotation';
import { useGetRequestDocuments } from '@/features/request/api/documents';
import type { SharedDocumentSelectionDto } from '../schemas/quotation';
import { useParameterOptions } from '@/shared/utils/parameterUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedAppraisal {
  id: string;
  requestId: string | null;
  appraisalNumber: string;
  customerName: string | null;
  maxAppraisalDays: number | null;
}

/** Outer key = appraisalId, inner key = documentId, value = level */
export type DocSelections = Record<string, Record<string, SharedDocumentSelectionDto['level']>>;

// ─── Hardcoded status options (mirrors vw_AppraisalList status values) ────────

const APPRAISAL_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// ─── Filter state type ────────────────────────────────────────────────────────

export interface AppraisalFilters {
  customerName: string;
  appraisalNumber: string;
  purpose: string;
  status: string;
  // "more filters"
  requestedAt: string;
  channel: string;
  bankingSegment: string;
  subDistrict: string;
  district: string;
  province: string;
}

const EMPTY_FILTERS: AppraisalFilters = {
  customerName: '',
  appraisalNumber: '',
  purpose: '',
  status: '',
  requestedAt: '',
  channel: '',
  bankingSegment: '',
  subDistrict: '',
  district: '',
  province: '',
};

const STORAGE_KEY = 'quotation-picker-filters-v1';

interface StoredFilterState {
  filters: Partial<AppraisalFilters>;
  moreOpen: boolean;
}

function readStoredFilters(): StoredFilterState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredFilterState;
  } catch {
    return null;
  }
}

function writeStoredFilters(state: StoredFilterState): void {
  try {
    // Strip empty strings before persisting
    const stripped = Object.fromEntries(
      Object.entries(state.filters).filter(([, v]) => v !== ''),
    ) as Partial<AppraisalFilters>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters: stripped, moreOpen: state.moreOpen }));
  } catch {
    // ignore — private mode / storage full
  }
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── SelectedAppraisalRow ─────────────────────────────────────────────────────

export interface SelectedAppraisalRowProps {
  appraisal: SelectedAppraisal;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
  onUpdateMaxDays: (id: string, val: number | null) => void;
  docSelections: DocSelections;
  onToggleDoc: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
  /** If provided, this row is in "marked for removal" state */
  isMarkedForRemoval?: boolean;
  /** Called when user wants to undo the removal */
  onUndoRemoval?: (id: string) => void;
  /** Called when user explicitly removes the row */
  onRemove: (id: string) => void;
}

export function SelectedAppraisalRow({
  appraisal: a,
  isExpanded,
  onToggleExpanded,
  onUpdateMaxDays,
  docSelections,
  onToggleDoc,
  isMarkedForRemoval = false,
  onUndoRemoval,
  onRemove,
}: SelectedAppraisalRowProps) {
  const docCount = Object.keys(docSelections[a.id] ?? {}).length;

  if (isMarkedForRemoval) {
    return (
      <div className="px-3 py-2 flex items-center gap-2 bg-amber-50">
        <div className="size-7 rounded bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="file-chart-column" style="solid" className="size-3.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-400 line-through truncate">
            {a.appraisalNumber || a.id.slice(0, 8)}
          </p>
          {a.customerName && (
            <p className="text-xs text-gray-400 line-through truncate">{a.customerName}</p>
          )}
        </div>
        <span className="text-xs text-amber-600 italic whitespace-nowrap">Will be removed</span>
        {onUndoRemoval && (
          <button
            type="button"
            onClick={() => onUndoRemoval(a.id)}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded transition-colors"
          >
            <Icon name="arrow-rotate-left" style="solid" className="size-3" />
            Undo
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Compact row */}
      <div
        className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpanded(a.id)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpanded(a.id);
          }
        }}
      >
        <div className="size-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
          <Icon name="file-chart-column" style="solid" className="size-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {a.appraisalNumber || a.id.slice(0, 8)}
            {a.customerName && (
              <span className="text-gray-400 font-normal"> – {a.customerName}</span>
            )}
          </p>
        </div>
        {/* Max days chip */}
        {a.maxAppraisalDays != null && (
          <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs tabular-nums whitespace-nowrap">
            Max {a.maxAppraisalDays}d
          </span>
        )}
        {/* Doc count chip */}
        {docCount > 0 && (
          <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-xs tabular-nums whitespace-nowrap">
            {docCount} docs
          </span>
        )}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleExpanded(a.id);
          }}
          className="size-6 shrink-0 rounded-md hover:bg-gray-100 text-gray-400 transition-colors flex items-center justify-center"
          aria-label={isExpanded ? `Collapse ${a.appraisalNumber}` : `Expand ${a.appraisalNumber}`}
        >
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            style="solid"
            className="size-3"
          />
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemove(a.id);
          }}
          className="size-6 shrink-0 rounded-md hover:bg-rose-50 hover:text-rose-600 text-gray-400 transition-colors flex items-center justify-center"
          aria-label={`Remove appraisal ${a.appraisalNumber}`}
        >
          <Icon name="xmark" style="solid" className="size-3" />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 flex flex-col gap-2">
          {/* Max days input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Max days:</label>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={a.maxAppraisalDays ?? ''}
              onChange={e => {
                const v = e.target.value;
                onUpdateMaxDays(a.id, v === '' ? null : Math.max(1, Number(v)));
              }}
              placeholder="—"
              aria-label={`Max appraisal days for ${a.appraisalNumber}`}
              className="w-20 px-2 py-1 text-right text-sm tabular-nums border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              onClick={e => e.stopPropagation()}
            />
          </div>
          {/* Shared docs */}
          <AppraisalDocPicker
            appraisalId={a.id}
            requestId={a.requestId}
            apSelection={docSelections[a.id] ?? {}}
            onToggle={onToggleDoc}
          />
        </div>
      )}
    </div>
  );
}

// ─── SetMaxDaysBar (exported, used by create page and edit modal compact summary) ───

export interface SetMaxDaysBarProps {
  appraisals: SelectedAppraisal[];
  markedForRemovalIds?: Set<string>;
  onUpdateMaxDays: (id: string, val: number | null) => void;
}

export function SetMaxDaysBar({
  appraisals,
  markedForRemovalIds,
  onUpdateMaxDays,
}: SetMaxDaysBarProps) {
  const [bulkDays, setBulkDays] = useState('');

  const handleApplyAll = () => {
    const val = bulkDays === '' ? null : Math.max(1, Number(bulkDays));
    appraisals.forEach(a => {
      if (markedForRemovalIds?.has(a.id)) return;
      onUpdateMaxDays(a.id, val);
    });
  };

  const activeCount = appraisals.filter(a => !(markedForRemovalIds?.has(a.id) ?? false)).length;

  return (
    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 whitespace-nowrap">Set max days for all:</span>
      <input
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={bulkDays}
        onChange={e => setBulkDays(e.target.value)}
        placeholder="e.g. 7"
        disabled={activeCount === 0}
        className="w-20 px-2 py-1 text-sm tabular-nums border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white disabled:opacity-50"
      />
      <Button
        size="xs"
        variant="outline"
        onClick={handleApplyAll}
        disabled={activeCount === 0 || bulkDays === ''}
      >
        Apply to all
      </Button>
    </div>
  );
}

// ─── SelectedAppraisalList (header + rows + "set all" control) ────────────────

interface SelectedAppraisalListProps {
  selected: SelectedAppraisal[];
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  onUpdateMaxDays: (id: string, val: number | null) => void;
  docSelections: DocSelections;
  onToggleDoc: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
  markedForRemovalIds?: Set<string>;
  onUndoRemoval?: (id: string) => void;
  onRemove: (id: string) => void;
}

function SelectedAppraisalList({
  selected,
  expandedIds,
  onToggleExpanded,
  onUpdateMaxDays,
  docSelections,
  onToggleDoc,
  markedForRemovalIds,
  onUndoRemoval,
  onRemove,
}: SelectedAppraisalListProps) {
  const [bulkDays, setBulkDays] = useState('');

  const handleApplyAll = () => {
    const val = bulkDays === '' ? null : Math.max(1, Number(bulkDays));
    selected.forEach(a => {
      const isMarked = markedForRemovalIds?.has(a.id) ?? false;
      if (!isMarked) onUpdateMaxDays(a.id, val);
    });
  };

  const activeCount = selected.filter(a => !(markedForRemovalIds?.has(a.id) ?? false)).length;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* "Set max days for all" bar */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 whitespace-nowrap">Set max days for all:</span>
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={bulkDays}
          onChange={e => setBulkDays(e.target.value)}
          placeholder="e.g. 7"
          disabled={activeCount === 0}
          className="w-20 px-2 py-1 text-sm tabular-nums border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white disabled:opacity-50"
        />
        <Button
          size="xs"
          variant="outline"
          onClick={handleApplyAll}
          disabled={activeCount === 0 || bulkDays === ''}
        >
          Apply to all
        </Button>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {selected.map(a => (
          <SelectedAppraisalRow
            key={a.id}
            appraisal={a}
            isExpanded={expandedIds.has(a.id)}
            onToggleExpanded={onToggleExpanded}
            onUpdateMaxDays={onUpdateMaxDays}
            docSelections={docSelections}
            onToggleDoc={onToggleDoc}
            isMarkedForRemoval={markedForRemovalIds?.has(a.id) ?? false}
            onUndoRemoval={onUndoRemoval}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

// ─── AppraisalPicker ──────────────────────────────────────────────────────────

export interface AppraisalPickerProps {
  selected: SelectedAppraisal[];
  onAdd: (a: SelectedAppraisal) => void;
  onRemove: (id: string) => void;
  onUpdateMaxDays: (id: string, maxAppraisalDays: number | null) => void;
  docSelections: DocSelections;
  onToggleDoc: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
  /** IDs already on the quotation — hidden from the results grid to prevent duplicates. */
  excludeIds?: string[];
  /** Edit-mode: id of the quotation being edited so its own appraisals pass the backend's active-quotation filter. */
  excludeQuotationRequestId?: string;
  /** When provided, IDs in this set are shown as unchecked in the grid (visual "removed" state). */
  markedForRemovalIds?: Set<string>;
  /** Called to undo a marked-for-removal row from within the selected list. */
  onUndoRemoval?: (id: string) => void;
  /** When true, the picker omits its own selected-list panel — the caller renders one. */
  hideSelectedPanel?: boolean;
  error?: string;
}

export function AppraisalPicker({
  selected,
  onAdd,
  onRemove,
  onUpdateMaxDays,
  docSelections,
  onToggleDoc,
  excludeIds,
  excludeQuotationRequestId,
  markedForRemovalIds,
  onUndoRemoval,
  hideSelectedPanel = false,
  error,
}: AppraisalPickerProps) {
  // ── Expanded selected rows ──
  const [expandedSelectedIds, setExpandedSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleExpanded = (id: string) => {
    setExpandedSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Filter state + localStorage hydration ──
  const stored = useMemo(() => readStoredFilters(), []);
  const [filters, setFilters] = useState<AppraisalFilters>({
    ...EMPTY_FILTERS,
    ...(stored?.filters ?? {}),
  });
  const [moreFiltersOpen, setMoreFiltersOpen] = useState<boolean>(stored?.moreOpen ?? false);

  // Debounced write-back on filter/toggle changes
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      writeStoredFilters({ filters, moreOpen: moreFiltersOpen });
    }, 500);
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [filters, moreFiltersOpen]);

  const [pageNumber, setPageNumber] = useState(0);
  const PAGE_SIZE = 10;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const debouncedCustomerName = useDebounced(filters.customerName, 300).trim();
  const debouncedAppraisalNumber = useDebounced(filters.appraisalNumber, 300).trim();
  const debouncedSubDistrict = useDebounced(filters.subDistrict, 300).trim();
  const debouncedDistrict = useDebounced(filters.district, 300).trim();

  const queryParams: EligibleAppraisalsParams = {
    pageNumber,
    pageSize: PAGE_SIZE,
    ...(debouncedCustomerName && { customerName: debouncedCustomerName }),
    ...(debouncedAppraisalNumber && { appraisalNumber: debouncedAppraisalNumber }),
    ...(filters.purpose && { purpose: filters.purpose }),
    ...(filters.requestedAt && {
      requestedAtFrom: filters.requestedAt,
      requestedAtTo: filters.requestedAt,
    }),
    ...(filters.channel && { channel: filters.channel }),
    ...(filters.status && { status: filters.status }),
    ...(filters.bankingSegment && { bankingSegment: filters.bankingSegment }),
    ...(debouncedSubDistrict && { subDistrict: debouncedSubDistrict }),
    ...(debouncedDistrict && { district: debouncedDistrict }),
    ...(filters.province && { province: filters.province }),
    ...(excludeQuotationRequestId && { excludeQuotationRequestId }),
  };

  const { data, isFetching } = useEligibleAppraisalsForQuotation(queryParams);

  const purposeOptions = useParameterOptions('AppraisalPurpose');
  const channelOptions = useParameterOptions('Channel');
  const bankingSegmentOptions = useParameterOptions('BankingSegment');

  const channelLabels = useMemo(
    () => new Map(channelOptions.map(o => [o.value ?? '', o.label])),
    [channelOptions],
  );
  const bankingSegmentLabels = useMemo(
    () => new Map(bankingSegmentOptions.map(o => [o.value ?? '', o.label])),
    [bankingSegmentOptions],
  );

  const excludeSet = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  // Filter out already-on-quotation rows from results
  const rawItems = data?.items ?? [];
  const items = useMemo(
    () => rawItems.filter(r => !excludeSet.has(r.id)),
    [rawItems, excludeSet],
  );
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Grid selection: mask out marked-for-removal ids as unselected
  const selectedIds = new Set(selected.map(a => a.id));
  const effectiveSelectedIds = useMemo(() => {
    if (!markedForRemovalIds || markedForRemovalIds.size === 0) return selectedIds;
    const masked = new Set(selectedIds);
    markedForRemovalIds.forEach(id => masked.delete(id));
    return masked;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, markedForRemovalIds]);

  // Page-level checkbox state (based on effective selection)
  const pageIds = items.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => effectiveSelectedIds.has(id));
  const somePageSelected = pageIds.some(id => effectiveSelectedIds.has(id)) && !allPageSelected;

  // Sync indeterminate state on the header checkbox
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  const handleFilterChange = <K extends keyof AppraisalFilters>(
    key: K,
    value: AppraisalFilters[K],
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPageNumber(0);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setPageNumber(0);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const handleToggleRow = (r: (typeof items)[number]) => {
    if (effectiveSelectedIds.has(r.id)) {
      onRemove(r.id);
    } else {
      onAdd({
        id: r.id,
        requestId: r.requestId ?? null,
        appraisalNumber: r.appraisalNumber ?? r.id.slice(0, 8),
        customerName: r.customerName ?? null,
        maxAppraisalDays: null,
      });
    }
  };

  const handleTogglePageAll = () => {
    if (allPageSelected) {
      pageIds.forEach(id => onRemove(id));
    } else {
      items.forEach(r => {
        if (!effectiveSelectedIds.has(r.id)) {
          onAdd({
            id: r.id,
            requestId: r.requestId ?? null,
            appraisalNumber: r.appraisalNumber ?? r.id.slice(0, 8),
            customerName: r.customerName ?? null,
            maxAppraisalDays: null,
          });
        }
      });
    }
  };

  // More filters: are any "more" fields active?
  const moreFilterFields: (keyof AppraisalFilters)[] = [
    'requestedAt', 'channel', 'bankingSegment', 'subDistrict', 'district', 'province',
  ];
  const hasActiveMoreFilters = moreFilterFields.some(k => filters[k] !== '');

  return (
    <div className="flex flex-col gap-3">
      {/* ── Selected appraisal rows ── */}
      {!hideSelectedPanel && selected.length > 0 && (
        <SelectedAppraisalList
          selected={selected}
          expandedIds={expandedSelectedIds}
          onToggleExpanded={handleToggleExpanded}
          onUpdateMaxDays={onUpdateMaxDays}
          docSelections={docSelections}
          onToggleDoc={onToggleDoc}
          markedForRemovalIds={markedForRemovalIds}
          onUndoRemoval={onUndoRemoval}
          onRemove={onRemove}
        />
      )}

      {/* ── Search-By Panel ── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
        {/* Always-visible row: Customer Name, Appraisal No., Purpose, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Customer Name
            </label>
            <input
              type="text"
              value={filters.customerName}
              onChange={e => handleFilterChange('customerName', e.target.value)}
              placeholder="Search customer..."
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Appraisal Report No.
            </label>
            <input
              type="text"
              value={filters.appraisalNumber}
              onChange={e => handleFilterChange('appraisalNumber', e.target.value)}
              placeholder="e.g. APR-0001"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Purpose
            </label>
            <select
              value={filters.purpose}
              onChange={e => handleFilterChange('purpose', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">All purposes</option>
              {purposeOptions.map(opt => (
                <option key={opt.value ?? ''} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Status
            </label>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">All statuses</option>
              {APPRAISAL_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* More filters toggle */}
        <div>
          <button
            type="button"
            onClick={() => setMoreFiltersOpen(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Icon
              name={moreFiltersOpen ? 'chevron-up' : 'chevron-down'}
              style="solid"
              className="size-3"
            />
            {moreFiltersOpen ? 'Fewer filters' : 'More filters'}
            {hasActiveMoreFilters && !moreFiltersOpen && (
              <span className="ml-1 px-1 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                active
              </span>
            )}
          </button>
        </div>

        {/* Collapsible "more" filters */}
        {moreFiltersOpen && (
          <>
            {/* Row: Request Date, Channel, Banking Segment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Request Date
                </label>
                <input
                  type="date"
                  value={filters.requestedAt}
                  onChange={e => handleFilterChange('requestedAt', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Channel
                </label>
                <select
                  value={filters.channel}
                  onChange={e => handleFilterChange('channel', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="">All channels</option>
                  {channelOptions.map(opt => (
                    <option key={opt.value ?? ''} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Banking Segment
                </label>
                <select
                  value={filters.bankingSegment}
                  onChange={e => handleFilterChange('bankingSegment', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="">All segments</option>
                  {bankingSegmentOptions.map(opt => (
                    <option key={opt.value ?? ''} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div />
            </div>

            {/* Row: SubDistrict, District, Province + Clear */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Sub-District
                </label>
                <input
                  type="text"
                  value={filters.subDistrict}
                  onChange={e => handleFilterChange('subDistrict', e.target.value)}
                  placeholder="Sub-district..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  District
                </label>
                <input
                  type="text"
                  value={filters.district}
                  onChange={e => handleFilterChange('district', e.target.value)}
                  placeholder="District..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Province
                </label>
                <ProvinceAutocomplete
                  value={filters.province}
                  onChange={v => handleFilterChange('province', v)}
                  placeholder="All provinces"
                />
              </div>
              <div className="flex items-end">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Icon name="xmark" style="solid" className="size-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Clear button when more-filters is collapsed but has active values */}
        {!moreFiltersOpen && hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Icon name="xmark" style="solid" className="size-3.5" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Results Table ── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left w-8">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={handleTogglePageAll}
                    aria-label="Select all on this page"
                    className="size-3.5 accent-primary rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Appraisal No.
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Customer
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Purpose
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Channel
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Banking Segment
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Properties
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Requested At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Enhancement #6 — Select-all hint */}
              {allPageSelected && totalCount > PAGE_SIZE && (
                <tr>
                  <td colSpan={9} className="px-3 py-1.5 bg-gray-50">
                    <p className="text-xs text-gray-500">
                      Selected {PAGE_SIZE} on this page.{' '}
                      {totalCount} appraisals match your filters — refine filters or paginate to select more.
                    </p>
                  </td>
                </tr>
              )}
              {isFetching && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                      <span className="text-xs">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center">
                    <p className="text-xs text-gray-400 italic">No eligible appraisals found</p>
                  </td>
                </tr>
              ) : (
                items.map(r => {
                  const isSelected = effectiveSelectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleRow(r)}
                    >
                      <td
                        className="px-3 py-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(r)}
                          className="size-3.5 accent-primary rounded"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                        {r.appraisalNumber ?? r.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[180px]">
                        {r.customerName ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {r.purpose ?? '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.status ? (
                          <Badge type="status" value={r.status} size="sm" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {r.channel ? channelLabels.get(r.channel) ?? r.channel : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {r.bankingSegment
                          ? bankingSegmentLabels.get(r.bankingSegment) ?? r.bankingSegment
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {r.propertyCount}
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {r.requestedAt
                          ? new Date(r.requestedAt).toLocaleDateString('th-TH', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <Pagination
            currentPage={pageNumber}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPageNumber}
            showPageSizeSelector={false}
          />
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── AppraisalDocPicker ──────────────────────────────────────────────────────

interface AppraisalDocPickerProps {
  appraisalId: string;
  requestId: string | null;
  apSelection: Record<string, SharedDocumentSelectionDto['level']>;
  onToggle: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
}

export function AppraisalDocPicker({
  appraisalId,
  requestId,
  apSelection,
  onToggle,
}: AppraisalDocPickerProps) {
  const { data, isLoading } = useGetRequestDocuments(requestId ?? undefined);
  const sections = data?.sections ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 px-3 text-xs text-gray-400">
        <Icon name="spinner" style="solid" className="size-3.5 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (!requestId) {
    return (
      <div className="px-3 py-3 text-xs text-amber-600 flex items-center gap-1.5">
        <Icon name="triangle-exclamation" style="solid" className="size-3.5 shrink-0" />
        No request linked to this appraisal. Documents cannot be loaded.
      </div>
    );
  }

  const hasUploaded = sections.some(s => s.documents.some(d => d.documentId));
  if (!hasUploaded) {
    return (
      <div className="px-3 py-3 text-xs text-gray-400">
        No uploaded documents found for this request.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
      {sections.map((section, sIdx) => {
        const level: SharedDocumentSelectionDto['level'] =
          section.titleId == null ? 'RequestLevel' : 'TitleLevel';
        const uploadedDocs = section.documents.filter(d => d.documentId);
        if (uploadedDocs.length === 0) return null;

        const allSelected = uploadedDocs.every(d => !!apSelection[d.documentId!]);
        const handleSelectAll = (checked: boolean) => {
          uploadedDocs.forEach(d => onToggle(appraisalId, d.documentId!, level, checked));
        };

        return (
          <div key={sIdx} className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {section.sectionLabel}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="size-3 accent-primary rounded"
                />
                <span className="text-[10px] text-gray-500">Select all</span>
              </label>
            </div>
            <div className="flex flex-col gap-1">
              {uploadedDocs.map(doc => (
                <label
                  key={doc.documentId}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={!!apSelection[doc.documentId!]}
                    onChange={e => onToggle(appraisalId, doc.documentId!, level, e.target.checked)}
                    className="size-3.5 accent-primary rounded shrink-0"
                  />
                  <span className="text-xs text-gray-800 truncate group-hover:text-primary">
                    {doc.fileName ?? doc.documentId}
                    {doc.documentTypeName && (
                      <span className="text-gray-400"> ({doc.documentTypeName})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
