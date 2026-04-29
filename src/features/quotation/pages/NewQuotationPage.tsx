import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import Pagination from '@/shared/components/Pagination';
import ProvinceAutocomplete from '@/shared/components/inputs/ProvinceAutocomplete';

import axios from '@shared/api/axiosInstance';
import { useAuthStore } from '@features/auth/store.ts';
import { useCreateQuotation, useGetLoanTypeMatchedCompanies } from '../api/quotation';
import {
  useEligibleAppraisalsForQuotation,
  type EligibleAppraisalsParams,
} from '@/features/appraisal/api/eligibleAppraisalsForQuotation';
import { useGetRequestDocuments } from '@/features/request/api/documents';
import type { SharedDocumentSelectionDto } from '../schemas/quotation';
import { useParameterOptions } from '@/shared/utils/parameterUtils';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const newQuotationSchema = z.object({
  dueDate: z.string().min(1, 'Due date is required'),
  appraisalIds: z.array(z.string()).min(1, 'Select at least one appraisal'),
  invitedCompanyIds: z.array(z.string()).min(1, 'Invite at least one company'),
});

type NewQuotationFormValues = z.infer<typeof newQuotationSchema>;

// ─── Internal types for selected items ───────────────────────────────────────

interface SelectedAppraisal {
  id: string;
  requestId: string | null;
  appraisalNumber: string;
  customerName: string | null;
  maxAppraisalDays: number | null;
}

/** Outer key = appraisalId, inner key = documentId, value = level */
type DocSelections = Record<string, Record<string, SharedDocumentSelectionDto['level']>>;

interface SelectedCompany {
  id: string;
  companyName: string;
}

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

interface AppraisalFilters {
  customerName: string;
  appraisalNumber: string;
  purpose: string;
  requestedAt: string; // single date — sent as both requestedAtFrom and requestedAtTo
  channel: string;
  status: string;
  bankingSegment: string;
  subDistrict: string;
  district: string;
  province: string;
}

const EMPTY_FILTERS: AppraisalFilters = {
  customerName: '',
  appraisalNumber: '',
  purpose: '',
  requestedAt: '',
  channel: '',
  status: '',
  bankingSegment: '',
  subDistrict: '',
  district: '',
  province: '',
};

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── AppraisalPicker ──────────────────────────────────────────────────────────

interface AppraisalPickerProps {
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
  error?: string;
}

function AppraisalPicker({
  selected,
  onAdd,
  onRemove,
  onUpdateMaxDays,
  docSelections,
  onToggleDoc,
  error,
}: AppraisalPickerProps) {
  const [expandedAppraisalId, setExpandedAppraisalId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AppraisalFilters>(EMPTY_FILTERS);
  const [pageNumber, setPageNumber] = useState(0);
  const PAGE_SIZE = 10;

  // Debounce text-only fields, then trim so leading/trailing whitespace doesn't fire a query
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

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const selectedIds = new Set(selected.map(a => a.id));

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

  return (
    <div className="flex flex-col gap-3">
      {/* ── Selected appraisal rows ── */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            <span>Appraisal</span>
            <span className="w-24 text-right">Max Days</span>
            <span className="w-24 text-right">Shared Docs</span>
            <span className="w-6" aria-hidden />
            <span className="w-6" aria-hidden />
          </div>
          <div className="divide-y divide-gray-100">
            {selected.map(a => {
              const isExpanded = expandedAppraisalId === a.id;
              const docCount = Object.keys(docSelections[a.id] ?? {}).length;
              return (
                <div key={a.id}>
                  <div className="px-3 py-2 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="size-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon
                          name="file-chart-column"
                          style="solid"
                          className="size-3.5 text-primary"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {a.appraisalNumber || a.id.slice(0, 8)}
                        </p>
                        {a.customerName && (
                          <p className="text-xs text-gray-500 truncate">{a.customerName}</p>
                        )}
                      </div>
                    </div>
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
                      className="w-24 px-2 py-1 text-right text-sm tabular-nums border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <span className="w-24 text-right text-xs text-gray-600 tabular-nums">
                      {docCount} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedAppraisalId(isExpanded ? null : a.id)}
                      className="size-6 rounded-md hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center"
                      aria-label={
                        isExpanded
                          ? `Hide documents for ${a.appraisalNumber}`
                          : `Show documents for ${a.appraisalNumber}`
                      }
                    >
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        style="solid"
                        className="size-3"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(a.id)}
                      className="size-6 rounded-md hover:bg-rose-50 hover:text-rose-600 text-gray-400 transition-colors flex items-center justify-center"
                      aria-label={`Remove appraisal ${a.appraisalNumber}`}
                    >
                      <Icon name="xmark" style="solid" className="size-3" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
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
            })}
          </div>
        </div>
      )}

      {/* ── Search-By Panel ── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
        {/* Row 1: Customer Name, Appraisal No., Purpose, Request Date */}
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
              Request Date
            </label>
            <input
              type="date"
              value={filters.requestedAt}
              onChange={e => handleFilterChange('requestedAt', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Row 2: Channel, Status, Banking Segment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
          {/* Placeholder column to align the 4-col grid */}
          <div />
        </div>

        {/* Row 3: SubDistrict, District, Province + Clear */}
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
      </div>

      {/* ── Results Table ── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 w-8" />
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
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-primary/5'
                          : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSelected) {
                          onAdd({
                            id: r.id,
                            requestId: r.requestId ?? null,
                            appraisalNumber: r.appraisalNumber ?? r.id.slice(0, 8),
                            customerName: r.customerName ?? null,
                            maxAppraisalDays: null,
                          });
                        }
                      }}
                    >
                      <td className="px-3 py-2">
                        {isSelected ? (
                          <Icon
                            name="check-circle"
                            style="solid"
                            className="size-4 text-primary"
                          />
                        ) : (
                          <Icon
                            name="plus-circle"
                            style="regular"
                            className="size-4 text-gray-400"
                          />
                        )}
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

        {/* Pagination */}
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

function AppraisalDocPicker({
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
                    onChange={e =>
                      onToggle(appraisalId, doc.documentId!, level, e.target.checked)
                    }
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

// ─── CompanyPicker ────────────────────────────────────────────────────────────

interface CompanyPickerProps {
  selected: SelectedCompany[];
  onToggle: (c: SelectedCompany) => void;
  error?: string;
}

function CompanyPicker({ selected, onToggle, error }: CompanyPickerProps) {
  const [query, setQuery] = useState('');
  const selectedIds = new Set(selected.map(c => c.id));

  // No loanType filter for standalone — fetch all eligible companies
  const { data: rawCompanies, isLoading } = useGetLoanTypeMatchedCompanies(undefined, true);

  const companies: SelectedCompany[] = useMemo(
    () => (rawCompanies ?? []).map(c => ({ id: c.id, companyName: c.name })),
    [rawCompanies],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return companies;
    const q = query.toLowerCase();
    return companies.filter(c => c.companyName.toLowerCase().includes(q));
  }, [companies, query]);

  return (
    <div className="flex flex-col gap-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(c => (
            <div
              key={c.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
            >
              <Icon name="building" style="solid" className="size-3" />
              <span>{c.companyName}</span>
              <button
                type="button"
                onClick={() => onToggle(c)}
                className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
                aria-label={`Remove ${c.companyName}`}
              >
                <Icon name="xmark" style="solid" className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search + list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="relative p-2 border-b border-gray-100">
          <Icon
            name="magnifying-glass"
            style="solid"
            className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search company name..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border-0 outline-none bg-transparent"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
              <Icon name="spinner" style="solid" className="size-4 animate-spin" />
              <span className="text-xs">Loading companies...</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 italic">No companies found</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(c => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onToggle(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <Icon name="check" style="solid" className="size-2.5 text-white" />
                      )}
                    </div>
                    <div className="size-7 rounded bg-purple-100 flex items-center justify-center shrink-0">
                      <Icon name="building" style="solid" className="size-3.5 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-900 flex-1 truncate">{c.companyName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── NewQuotationPage ─────────────────────────────────────────────────────────

function NewQuotationPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);

  const [selectedAppraisals, setSelectedAppraisals] = useState<SelectedAppraisal[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [docSelections, setDocSelections] = useState<DocSelections>({});

  const { mutateAsync: createQuotationAsync, isPending: isCreating } = useCreateQuotation();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<NewQuotationFormValues>({
    resolver: zodResolver(newQuotationSchema),
    defaultValues: {
      dueDate: '',
      appraisalIds: [],
      invitedCompanyIds: [],
    },
  });

  // Keep RHF arrays in sync with local state
  useEffect(() => {
    setValue(
      'appraisalIds',
      selectedAppraisals.map(a => a.id),
      { shouldValidate: true },
    );
  }, [selectedAppraisals, setValue]);

  useEffect(() => {
    setValue(
      'invitedCompanyIds',
      selectedCompanies.map(c => c.id),
      { shouldValidate: true },
    );
  }, [selectedCompanies, setValue]);

  const handleAddAppraisal = (a: SelectedAppraisal) => {
    setSelectedAppraisals(prev => (prev.some(x => x.id === a.id) ? prev : [...prev, a]));
  };

  const handleRemoveAppraisal = (id: string) => {
    setSelectedAppraisals(prev => prev.filter(a => a.id !== id));
    setDocSelections(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleToggleDoc = (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => {
    setDocSelections(prev => {
      const next = { ...prev };
      const apMap = { ...(next[appraisalId] ?? {}) };
      if (checked) apMap[documentId] = level;
      else delete apMap[documentId];
      next[appraisalId] = apMap;
      return next;
    });
  };

  const handleUpdateMaxDays = (id: string, maxAppraisalDays: number | null) => {
    setSelectedAppraisals(prev =>
      prev.map(a => (a.id === id ? { ...a, maxAppraisalDays } : a)),
    );
  };

  const handleToggleCompany = (c: SelectedCompany) => {
    setSelectedCompanies(prev =>
      prev.some(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c],
    );
  };

  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const isPending = isCreating || isSavingDocs;

  const onSubmit = async (values: NewQuotationFormValues) => {
    try {
      const { id } = await createQuotationAsync({
        dueDate: values.dueDate,
        requestedBy: currentUser?.username ?? '',
        appraisals: selectedAppraisals.map(a => ({
          appraisalId: a.id,
          maxAppraisalDays: a.maxAppraisalDays,
        })),
        invitedCompanyIds: values.invitedCompanyIds,
      });

      const docPayload: SharedDocumentSelectionDto[] = [];
      for (const [appraisalId, docs] of Object.entries(docSelections)) {
        for (const [documentId, level] of Object.entries(docs)) {
          docPayload.push({ appraisalId, documentId, level });
        }
      }

      if (docPayload.length > 0) {
        setIsSavingDocs(true);
        try {
          await axios.put(`/quotations/${id}/shared-documents`, { documents: docPayload });
        } finally {
          setIsSavingDocs(false);
        }
      }

      toast.success('Quotation draft created');
      navigate(`/quotations/${id}`);
    } catch (err: unknown) {
      const apiErr = err as { apiError?: { detail?: string } };
      toast.error(apiErr?.apiError?.detail ?? 'Failed to create quotation');
    }
  };

  return (
    <div className="w-full py-6 px-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          aria-label="Back to quotations"
        >
          <Icon name="arrow-left" style="solid" className="size-4" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-gray-900">New Quotation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create a standalone RFQ draft</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Appraisals */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium text-gray-800">
              Appraisals to include <span className="text-danger">*</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Search and add one or more appraisals to this RFQ
            </p>
          </div>
          <AppraisalPicker
            selected={selectedAppraisals}
            onAdd={handleAddAppraisal}
            onRemove={handleRemoveAppraisal}
            onUpdateMaxDays={handleUpdateMaxDays}
            docSelections={docSelections}
            onToggleDoc={handleToggleDoc}
            error={errors.appraisalIds?.message}
          />
        </div>

        {/* Companies */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium text-gray-800">
              Invited companies <span className="text-danger">*</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Select external companies to invite for this quotation
            </p>
          </div>
          <CompanyPicker
            selected={selectedCompanies}
            onToggle={handleToggleCompany}
            error={errors.invitedCompanyIds?.message}
          />
        </div>

        {/* Due Date */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DateTimePickerInput
                label="Cutoff (Due Date)"
                required
                helperText="Deadline for companies to submit their quotation responses"
                placeholder="dd/mm/yyyy hh:mm"
                disablePastDates
                value={field.value || null}
                onChange={v => field.onChange(v ?? '')}
                onBlur={field.onBlur}
                error={errors.dueDate?.message}
              />
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/quotations')}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} isLoading={isPending}>
            {!isPending && <Icon name="file-circle-plus" style="solid" className="size-4 mr-1.5" />}
            Create Draft
          </Button>
        </div>
      </form>
    </div>
  );
}

export default NewQuotationPage;
