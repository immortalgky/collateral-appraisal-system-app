import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import { useDebounce } from '@shared/hooks/useDebounce';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';
import Input from '@shared/components/Input';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useParameterDescription, useParameterOptions } from '@shared/utils/parameterUtils';
import {
  usePendingExternal,
  useMonitoringExternalSummary,
  useMonitoringExternalGrouped,
  useTaskTypes,
} from '../../api/monitoringApi';
import type {
  PendingExternalTask,
  PendingExternalFilter,
  SortDir,
  GroupByField,
  SlaBucket,
  MonitoringGroupRow,
} from '../../api/types';
import Badge from '@shared/components/Badge';
import MonitoringDataTable, { type ColumnDef } from '../MonitoringDataTable';
import MovementBadge from '../MovementBadge';
import MonitoringKpiStrip from '../MonitoringKpiStrip';
import GroupByToggle from '../GroupByToggle';
import MonitoringGroupSidebar from '../MonitoringGroupSidebar';
import ActiveFilterChips, { type ActiveFilterChip } from '../ActiveFilterChips';
import {
  SlaDueCell,
  ElapsedCell,
  RemainingCell,
  SlaStatusBadge,
  bucketForSlaStatus,
} from '../SlaCells';
import { DateCell } from '../DateCell';
import PicAutocomplete from '../PicAutocomplete';
import CompanyAutocomplete from '@shared/components/inputs/CompanyAutocomplete';
import { useCompanyStore } from '@shared/store';

const SLA_OPTIONS = [
  { value: 'OnTime', label: 'On Time' },
  { value: 'AtRisk', label: 'At Risk' },
  { value: 'Breached', label: 'Breached' },
] as const;

function PurposeCell({ code }: { code: string | null }) {
  const desc = useParameterDescription('AppraisalPurpose', code);
  return <span className="text-xs">{desc || code || '—'}</span>;
}

function PropertyTypeCell({ code }: { code: string | null }) {
  const desc = useParameterDescription('PropertyType', code);
  return <span className="text-xs text-gray-600">{desc || code || '—'}</span>;
}

function PicCell({
  pic,
  assignedTo,
  assignedType,
}: {
  pic: string | null;
  assignedTo: string | null;
  assignedType: string | null;
}) {
  const { t } = useTranslation('monitoring');
  const noPic = pic == null || pic.trim() === '';
  const noAssignee = assignedTo == null || assignedTo.trim() === '';
  if (noPic && noAssignee) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        {t('common.unassigned')}
      </span>
    );
  }
  if (assignedType === '2') {
    const hasBoth = !noPic && !noAssignee && pic!.trim() !== assignedTo!.trim();
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-gray-700"
        title="Group / Pool task"
      >
        <Icon style="solid" name="users" className="size-3 text-gray-400" />
        {hasBoth ? `${assignedTo} - ${pic}` : (pic ?? assignedTo)}
      </span>
    );
  }
  const hasBoth = !noPic && !noAssignee && pic!.trim() !== assignedTo!.trim();
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-700" title="Person task">
      <Icon style="solid" name="user" className="size-3 text-gray-400" />
      {hasBoth ? `${assignedTo} - ${pic}` : (pic ?? assignedTo)}
    </span>
  );
}

const COLUMNS: ColumnDef<PendingExternalTask>[] = [
  {
    key: 'appraisalNumber',
    label: 'Appraisal Number',
    sortKey: 'AppraisalNumber',
    render: row => (
      <span className="text-sm font-medium text-primary">{row.appraisalNumber ?? '—'}</span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer Name',
    sortKey: 'CustomerName',
    render: row => <span className="text-xs text-gray-700">{row.customerName ?? '—'}</span>,
    className: 'max-w-[160px] truncate',
  },
  {
    key: 'appraisalCompanyName',
    label: 'Appraisal Company',
    sortKey: 'AppraisalCompanyName',
    render: row => <span className="text-xs text-gray-700">{row.appraisalCompanyName ?? '—'}</span>,
  },
  {
    key: 'taskType',
    label: 'Task Type',
    sortKey: 'TaskType',
    render: row => (
      <span className="text-xs text-gray-700">{row.taskDescription ?? row.taskType ?? '—'}</span>
    ),
    className: 'max-w-[180px] truncate',
  },
  {
    key: 'purpose',
    label: 'Purpose',
    sortKey: 'Purpose',
    render: row => <PurposeCell code={row.purpose} />,
  },
  {
    key: 'propertyType',
    label: 'Property Type',
    sortKey: 'PropertyType',
    render: row => <PropertyTypeCell code={row.propertyType} />,
  },
  {
    key: 'slaDue',
    label: 'SLA Due',
    sortKey: 'AssignedDate',
    render: row => (
      <SlaDueCell
        assignedDate={row.assignedDate}
        targetHours={row.olaTargetHours}
        slaStatus={row.slaStatus}
      />
    ),
  },
  {
    key: 'elapsed',
    label: 'Elapsed (hrs)',
    sortKey: 'OlaActualHours',
    className: 'text-right',
    render: row => <ElapsedCell actualHours={row.olaActualHours} slaStatus={row.slaStatus} />,
  },
  {
    key: 'remaining',
    label: 'Remaining (hrs)',
    sortKey: 'OlaVarianceHours',
    className: 'text-right',
    render: row => (
      <RemainingCell
        targetHours={row.olaTargetHours}
        actualHours={row.olaActualHours}
        slaStatus={row.slaStatus}
      />
    ),
  },
  {
    key: 'slaStatus',
    label: 'SLA Status',
    sortKey: 'SlaStatus',
    render: row => <SlaStatusBadge sla={row.slaStatus} />,
  },
  {
    key: 'assignedDate',
    label: 'Assigned Date',
    sortKey: 'AssignedDate',
    render: row => <DateCell value={row.assignedDate} withTime withAgo />,
  },
  {
    key: 'requestedDate',
    label: 'Requested Date',
    sortKey: 'RequestedDate',
    render: row => <DateCell value={row.requestedDate} withAgo />,
  },
  {
    key: 'pic',
    label: 'PIC',
    sortKey: 'PIC',
    render: row => (
      <PicCell pic={row.pic} assignedTo={row.assignedTo} assignedType={row.assignedType} />
    ),
  },
  {
    key: 'movement',
    label: 'Movement',
    sortKey: 'Movement',
    render: row => <MovementBadge value={row.movement} />,
  },
  {
    key: 'priority',
    label: 'Priority',
    sortKey: 'Priority',
    render: row => <Badge type="priority" value={row.priority} />,
  },
];

interface PendingExternalSectionProps {
  onCountChange?: (count: number) => void;
}

function PendingExternalSection({ onCountChange }: PendingExternalSectionProps) {
  const { t } = useTranslation('monitoring');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir | undefined>();
  const [slaStatusFilter, setSlaStatusFilter] = useState<string[]>([]);
  const [slaBucketFilter, setSlaBucketFilter] = useState<SlaBucket[]>([]);
  const [activityIdFilter, setActivityIdFilter] = useState<string[]>([]);
  const [picFilter, setPicFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string[]>([]);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string[]>([]);
  const [taskTypeFilter, setTaskTypeFilter] = useState<string[]>([]);
  const [appraisalCompanyFilter, setAppraisalCompanyFilter] = useState('');
  const [groupBy, setGroupByState] = useState<GroupByField | null>(null);
  const [drill, setDrill] = useState<{ field: GroupByField; key: string; label: string } | null>(
    null,
  );

  const setGroupBy = (next: GroupByField | null) => {
    setGroupByState(next);
    setDrill(null);
  };

  const baseFilter = {
    search: debouncedSearch || undefined,
    slaStatus: slaStatusFilter.length ? slaStatusFilter : undefined,
    slaBucket: slaBucketFilter.length ? slaBucketFilter : undefined,
    activityId: activityIdFilter.length ? activityIdFilter : undefined,
    pic: picFilter || undefined,
    purpose: purposeFilter.length ? purposeFilter : undefined,
    propertyType: propertyTypeFilter.length ? propertyTypeFilter : undefined,
    taskType: taskTypeFilter.length ? taskTypeFilter : undefined,
    appraisalCompanyId: appraisalCompanyFilter || undefined,
  };

  const filter: PendingExternalFilter = {
    ...baseFilter,
    ...(drill?.field === 'activity' ? { activityId: [drill.key] } : {}),
    ...(drill && drill.field !== 'activity' ? { search: drill.key } : {}),
    page,
    pageSize,
    sortBy,
    sortDir,
  };

  const { data, isLoading, isError, error } = usePendingExternal(filter);

  const { data: summary, isLoading: summaryLoading } = useMonitoringExternalSummary(baseFilter);

  const { data: groupedData, isLoading: groupedLoading } = useMonitoringExternalGrouped(
    groupBy,
    baseFilter,
  );

  const { data: taskTypesData } = useTaskTypes();

  const purposeOptions = useParameterOptions('AppraisalPurpose');
  const propertyTypeOptions = useParameterOptions('PropertyType');
  const companies = useCompanyStore(s => s.companies);

  const taskTypeOptions = useMemo(
    () => (taskTypesData ?? []).map(tt => ({ value: tt.value, label: tt.label })),
    [taskTypesData],
  );

  const rows = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hasFilters =
    !!search ||
    slaStatusFilter.length > 0 ||
    slaBucketFilter.length > 0 ||
    activityIdFilter.length > 0 ||
    !!picFilter ||
    purposeFilter.length > 0 ||
    propertyTypeFilter.length > 0 ||
    taskTypeFilter.length > 0 ||
    !!appraisalCompanyFilter;

  const handleClearFilters = () => {
    setSearch('');
    setSlaStatusFilter([]);
    setSlaBucketFilter([]);
    setActivityIdFilter([]);
    setPicFilter('');
    setPurposeFilter([]);
    setPropertyTypeFilter([]);
    setTaskTypeFilter([]);
    setAppraisalCompanyFilter('');
    setPage(0);
  };

  const secondaryActiveCount = [
    picFilter,
    ...purposeFilter,
    ...propertyTypeFilter,
    appraisalCompanyFilter,
  ].filter(Boolean).length;

  const renderSecondaryFilters = (layout: 'inline' | 'popover') => {
    const acWrap = layout === 'inline' ? 'w-44' : 'w-full'; // autocompletes keep width
    const msWrap = layout === 'inline' ? 'shrink-0' : 'w-full'; // multiselect hugs inline
    return (
      <>
        <div className={acWrap}>
          <PicAutocomplete
            value={picFilter}
            onChange={v => {
              setPicFilter(v);
              setPage(0);
            }}
            placeholder="All PIC"
            scope="Company"
          />
        </div>
        <div className={msWrap}>
          <MultiSelectDropdown
            options={purposeOptions}
            value={purposeFilter}
            onChange={v => {
              setPurposeFilter(v);
              setPage(0);
            }}
            placeholder={t('common.purpose')}
            showValuePrefix={false}
          />
        </div>
        <div className={msWrap}>
          <MultiSelectDropdown
            options={propertyTypeOptions}
            value={propertyTypeFilter}
            onChange={v => {
              setPropertyTypeFilter(v);
              setPage(0);
            }}
            placeholder={t('common.propertyType')}
            showValuePrefix={false}
          />
        </div>
        <div className={acWrap}>
          <CompanyAutocomplete
            value={appraisalCompanyFilter}
            onChange={(v: string) => {
              setAppraisalCompanyFilter(v);
              setPage(0);
            }}
            placeholder="All companies"
          />
        </div>
      </>
    );
  };

  const slaOptions = SLA_OPTIONS.map(o => ({ value: o.value, label: o.label }));

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
    ...slaStatusFilter.map(v => ({
      key: `slaStatus-${v}`,
      label: `SLA: ${slaOptions.find(o => o.value === v)?.label ?? v}`,
      onClear: () => {
        setSlaStatusFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...slaBucketFilter.map(v => ({
      key: `slaBucket-${v}`,
      label: `${t(`common.sla.${v}`)}`,
      onClear: () => {
        setSlaBucketFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...activityIdFilter.map(v => ({
      key: `activityId-${v}`,
      label: `Activity: ${v}`,
      onClear: () => {
        setActivityIdFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...(picFilter
      ? [
          {
            key: 'pic',
            label: `PIC: ${picFilter}`,
            onClear: () => {
              setPicFilter('');
              setPage(0);
            },
          },
        ]
      : []),
    ...purposeFilter.map(v => ({
      key: `purpose-${v}`,
      label: `Purpose: ${purposeOptions.find(o => o.value === v)?.label ?? v}`,
      onClear: () => {
        setPurposeFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...propertyTypeFilter.map(v => ({
      key: `propertyType-${v}`,
      label: `Type: ${propertyTypeOptions.find(o => o.value === v)?.label ?? v}`,
      onClear: () => {
        setPropertyTypeFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...taskTypeFilter.map(v => ({
      key: `taskType-${v}`,
      label: `Task: ${taskTypeOptions.find(o => o.value === v)?.label ?? v}`,
      onClear: () => {
        setTaskTypeFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...(appraisalCompanyFilter
      ? [
          {
            key: 'appraisalCompanyId',
            label: `Company: ${companies.find(c => c.id === appraisalCompanyFilter)?.companyName ?? appraisalCompanyFilter}`,
            onClear: () => {
              setAppraisalCompanyFilter('');
              setPage(0);
            },
          },
        ]
      : []),
  ];

  const handleView = (row: PendingExternalTask) => {
    if (row.appraisalId) navigate(`/appraisals/${row.appraisalId}`);
  };

  const handleBucketClick = (bucket: SlaBucket) => {
    setSlaBucketFilter(prev => (prev.includes(bucket) ? [] : [bucket]));
    setPage(0);
  };

  const handleGroupSelect = (group: MonitoringGroupRow | null) => {
    if (group == null || groupBy == null) {
      setDrill(null);
    } else {
      setDrill({ field: groupBy, key: group.key, label: group.label || group.key });
    }
    setPage(0);
  };

  useEffect(() => {
    if (!isLoading && data != null) {
      onCountChange?.(totalCount);
    }
  }, [isLoading, data, totalCount, onCountChange]);

  return (
    <div className="flex flex-col min-w-0">
      <MonitoringKpiStrip
        summary={summary}
        isLoading={summaryLoading}
        onBucketClick={handleBucketClick}
        activeBuckets={slaBucketFilter}
      />

      <ActiveFilterChips
        chips={activeChips}
        onClearAll={hasFilters ? handleClearFilters : undefined}
      />

      {/* Inline filter bar */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('pendingExternal.search')}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        {/* SLA Status */}
        <div className="shrink-0">
          <MultiSelectDropdown
            options={slaOptions}
            value={slaStatusFilter}
            onChange={v => {
              setSlaStatusFilter(v);
              setPage(0);
            }}
            placeholder={t('common.slaLabel')}
            showValuePrefix={false}
          />
        </div>

        {/* Task Type */}
        <div className="shrink-0">
          <MultiSelectDropdown
            options={taskTypeOptions}
            value={taskTypeFilter}
            onChange={v => {
              setTaskTypeFilter(v);
              setPage(0);
            }}
            placeholder={t('common.taskType')}
            showValuePrefix={false}
          />
        </div>

        {/* Secondary filters — inline at lg+, behind 'More Filters' below lg */}
        <div className="hidden lg:contents">{renderSecondaryFilters('inline')}</div>
        <div className="lg:hidden">
          <Popover className="relative">
            <PopoverButton className="relative inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white hover:border-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              <Icon style="solid" name="sliders" className="size-3.5" />
              <span>More Filters</span>
              {secondaryActiveCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-primary text-white tabular-nums">
                  {secondaryActiveCount}
                </span>
              )}
            </PopoverButton>
            <PopoverPanel
              anchor="bottom start"
              className="z-30 mt-1 w-72 p-3 rounded-md border border-gray-200 bg-white shadow-lg flex flex-col gap-3 [--anchor-gap:4px] focus:outline-none"
            >
              {renderSecondaryFilters('popover')}
            </PopoverPanel>
          </Popover>
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

        <div className="ml-auto">
          <GroupByToggle value={groupBy} onChange={setGroupBy} />
        </div>
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
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex">
          {groupBy != null && (
            <MonitoringGroupSidebar
              groups={groupedData?.groups ?? []}
              isLoading={groupedLoading}
              groupBy={groupBy}
              activeKey={drill?.key ?? null}
              onSelect={handleGroupSelect}
            />
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <MonitoringDataTable
              columns={COLUMNS}
              rows={rows}
              isLoading={isLoading}
              onView={handleView}
              getRowKey={r => r.pendingTaskId}
              getRowVariant={r => bucketForSlaStatus(r.slaStatus)}
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
        </div>
      )}
    </div>
  );
}

export default PendingExternalSection;
