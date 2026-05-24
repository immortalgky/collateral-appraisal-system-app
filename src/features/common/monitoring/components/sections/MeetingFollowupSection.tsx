import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import { useDebounce } from '@shared/hooks/useDebounce';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';
import Input from '@shared/components/Input';
import DatePickerInput from '@shared/components/inputs/DatePickerInput';

import { useMeetingFollowups } from '../../api/monitoringApi';
import type { MeetingFollowup, MeetingFollowupFilter, SortDir } from '../../api/types';
import MonitoringDataTable, { type ColumnDef } from '../MonitoringDataTable';
import ActiveFilterChips, { type ActiveFilterChip } from '../ActiveFilterChips';
import { DateCell } from '../DateCell';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
] as const;

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS: ColumnDef<MeetingFollowup>[] = [
  {
    key: 'appraisalNumber',
    label: 'Appraisal No.',
    sortKey: 'AppraisalNumber',
    render: row => (
      <span className="text-sm font-medium text-primary">{row.appraisalNumber}</span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer Name',
    sortKey: 'CustomerName',
    render: row => <span className="text-xs text-gray-500">{row.customerName ?? '—'}</span>,
    className: 'max-w-[160px] truncate',
  },
  {
    key: 'approvalTier',
    label: 'Group Type',
    sortKey: 'ApprovalTier',
    render: row => <span className="text-xs text-gray-700 tabular-nums">{row.approvalTier}</span>,
  },
  {
    key: 'votes',
    label: 'Votes',
    render: row => {
      const voted = row.totalApprovers - row.pendingCount;
      return (
        <span className="text-xs text-gray-700 tabular-nums">
          {voted} / {row.totalApprovers}
        </span>
      );
    },
  },
  {
    key: 'meetingNumber',
    label: 'Meeting No.',
    render: row =>
      row.approvalTier === 3 && row.meetingId ? (
        <span className="text-sm font-medium text-primary">{row.meetingNumber ?? '—'}</span>
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
  },
  {
    key: 'meetingDate',
    label: 'Meeting Date',
    sortKey: 'MeetingDate',
    render: row =>
      row.approvalTier === 3 ? (
        <DateCell value={row.meetingDate} />
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
  },
];

// ─── Section ──────────────────────────────────────────────────────────────────

interface MeetingFollowupSectionProps {
  onCountChange?: (count: number) => void;
}

function MeetingFollowupSection({ onCountChange }: MeetingFollowupSectionProps) {
  const { t } = useTranslation('monitoring');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir | undefined>();
  const [tierFilter, setTierFilter] = useState<string[]>([]);
  const [meetingNumberFilter, setMeetingNumberFilter] = useState('');
  const debouncedMeetingNumber = useDebounce(meetingNumberFilter, 400);
  const [meetingDateFrom, setMeetingDateFrom] = useState<string | null>(null);
  const [meetingDateTo, setMeetingDateTo] = useState<string | null>(null);

  const filter: MeetingFollowupFilter = {
    search: debouncedSearch || undefined,
    tier: tierFilter.length ? tierFilter.map(Number) : undefined,
    meetingNumber: debouncedMeetingNumber || undefined,
    meetingDateFrom: meetingDateFrom ? meetingDateFrom.slice(0, 10) : undefined,
    meetingDateTo: meetingDateTo ? meetingDateTo.slice(0, 10) : undefined,
    page,
    pageSize,
    sortBy,
    sortDir,
  };

  const { data, isLoading, isError, error } = useMeetingFollowups(filter);

  const rows = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hasFilters =
    !!search ||
    tierFilter.length > 0 ||
    !!meetingNumberFilter ||
    !!meetingDateFrom ||
    !!meetingDateTo;

  const handleClearFilters = () => {
    setSearch('');
    setTierFilter([]);
    setMeetingNumberFilter('');
    setMeetingDateFrom(null);
    setMeetingDateTo(null);
    setPage(0);
  };

  const handleView = (row: MeetingFollowup) => {
    navigate(`/appraisals/${row.appraisalId}`);
  };

  const tierOptions = TIER_OPTIONS.map(o => ({ value: o.value, label: o.label }));

  const activeChips: ActiveFilterChip[] = [
    ...(search
      ? [
          {
            key: 'search',
            label: `Search: ${search}`,
            onClear: () => {
              setSearch('');
              setPage(0);
            },
          },
        ]
      : []),
    ...tierFilter.map(v => ({
      key: `tier-${v}`,
      label: `Group Type: ${v}`,
      onClear: () => {
        setTierFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...(meetingNumberFilter
      ? [
          {
            key: 'meetingNumber',
            label: `Meeting No: ${meetingNumberFilter}`,
            onClear: () => {
              setMeetingNumberFilter('');
              setPage(0);
            },
          },
        ]
      : []),
    ...(meetingDateFrom
      ? [
          {
            key: 'meetingDateFrom',
            label: `Meeting From: ${meetingDateFrom.slice(0, 10)}`,
            onClear: () => {
              setMeetingDateFrom(null);
              setPage(0);
            },
          },
        ]
      : []),
    ...(meetingDateTo
      ? [
          {
            key: 'meetingDateTo',
            label: `Meeting To: ${meetingDateTo.slice(0, 10)}`,
            onClear: () => {
              setMeetingDateTo(null);
              setPage(0);
            },
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!isLoading && data != null) {
      onCountChange?.(totalCount);
    }
  }, [isLoading, data, totalCount, onCountChange]);

  return (
    <div className="flex flex-col min-w-0">
      <ActiveFilterChips
        chips={activeChips}
        onClearAll={hasFilters ? handleClearFilters : undefined}
      />

      {/* Inline filter bar */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('meetingFollowup.search')}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        <div className="shrink-0">
          <MultiSelectDropdown
            options={tierOptions}
            value={tierFilter}
            onChange={v => {
              setTierFilter(v);
              setPage(0);
            }}
            placeholder="Group Type"
            showValuePrefix={false}
          />
        </div>

        <div className="w-40">
          <Input
            value={meetingNumberFilter}
            onChange={e => {
              setMeetingNumberFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Meeting No."
          />
        </div>

        <div className="w-40">
          <DatePickerInput
            value={meetingDateFrom}
            onChange={v => {
              setMeetingDateFrom(v);
              setPage(0);
            }}
            placeholder="Meeting from"
          />
        </div>

        <div className="w-40">
          <DatePickerInput
            value={meetingDateTo}
            onChange={v => {
              setMeetingDateTo(v);
              setPage(0);
            }}
            placeholder="Meeting to"
            minDate={meetingDateFrom}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-all"
          >
            <Icon style="solid" name="xmark" className="size-3.5" />
            {t('common.clearAll')}
          </button>
        )}
      </div>

      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
            <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">{t('common.loadError')}</p>
          <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
        </div>
      )}

      {!isError && (
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <MonitoringDataTable
            columns={COLUMNS}
            rows={rows}
            isLoading={isLoading}
            onView={handleView}
            getRowKey={r => r.appraisalId}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
              setPage(0);
            }}
            emptyLabel={t('common.noRecords')}
            emptyDescription={t('common.noRecordsDesc')}
          />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default MeetingFollowupSection;
