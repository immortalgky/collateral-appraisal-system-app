import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import DataErrorState from '@/shared/components/DataErrorState';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useHasPermission } from '@/shared/hooks/useHasPermission';
import { DateInput, Dropdown, TextInput } from '@/shared/components/inputs';
import {
  CANCEL_ELIGIBLE,
  CUT_OFF_ELIGIBLE,
  END_ELIGIBLE,
  MEETING_PERMISSIONS,
  MEETING_STATUS_OPTIONS,
  RESEND_INVITATION_ELIGIBLE,
} from '../constants';

import { useGetMeetings } from '../api/meetings';
import type { MeetingListItemDto, MeetingStatus } from '../api/types';
import BulkCreateMeetingsDialog from '../components/BulkCreateMeetingsDialog';
import CancelMeetingDialog from '../components/CancelMeetingDialog';
import CutOffReviewDialog from '../components/CutOffReviewDialog';
import EndMeetingDialog from '../components/EndMeetingDialog';
import MeetingDocumentsDialog from '../components/MeetingDocumentsDialog';
import MeetingNoBadge from '../components/MeetingNoBadge';
import MeetingStatusBadge from '../components/MeetingStatusBadge';
import SendInvitationDialog from '../components/SendInvitationDialog';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Compact 24-hour timestamp: dd/MM/yyyy HH:mm. */
const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ── Row action menu ───────────────────────────────────────────────────────────

type ActionTone = 'blue' | 'amber' | 'green' | 'violet' | 'red' | 'gray';

interface RowAction {
  label: string;
  icon: string;
  onClick: () => void;
  tone?: ActionTone;
}

const ACTION_TONE: Record<ActionTone, string> = {
  blue: 'text-blue-600 hover:bg-blue-50',
  amber: 'text-amber-600 hover:bg-amber-50',
  green: 'text-emerald-600 hover:bg-emerald-50',
  violet: 'text-violet-600 hover:bg-violet-50',
  red: 'text-red-600 hover:bg-red-50',
  gray: 'text-gray-700 hover:bg-gray-50',
};

const MENU_PANEL_CLASS =
  'bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[168px]';

interface ActionMenuItemsProps {
  actions: RowAction[];
  onClose: () => void;
}

const ActionMenuItems = ({ actions, onClose }: ActionMenuItemsProps) => (
  <>
    {actions.map((action, i) => (
      <button
        key={action.label}
        type="button"
        onClick={e => {
          e.stopPropagation();
          onClose();
          action.onClick();
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors ${
          ACTION_TONE[action.tone ?? 'gray']
        }${action.tone === 'red' && i > 0 ? ' mt-1 border-t border-gray-100 pt-2.5' : ''}`}
      >
        <Icon name={action.icon} style="solid" className="size-3.5 shrink-0" />
        {action.label}
      </button>
    ))}
  </>
);

interface RowActionsMenuProps {
  actions: RowAction[];
}

const RowActionsMenu = ({ actions }: RowActionsMenuProps) => {
  const { t } = useTranslation('meeting');
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={t('aria.rowActions')}
      >
        <Icon name="ellipsis-vertical" style="solid" className="size-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className={`absolute right-0 top-full mt-1 z-30 ${MENU_PANEL_CLASS}`}>
            <ActionMenuItems actions={actions} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
};

// ── Meeting row actions logic ─────────────────────────────────────────────────

interface MeetingRowProps {
  meeting: MeetingListItemDto;
  isAdmin: boolean;
  onNavigate: (id: string) => void;
  onCutOff: (meeting: MeetingListItemDto) => void;
  onSendInvitation: (meeting: MeetingListItemDto) => void;
  onResendInvitation: (meeting: MeetingListItemDto) => void;
  onEndMeeting: (meeting: MeetingListItemDto) => void;
  onDocuments: (meeting: MeetingListItemDto) => void;
  onCancel: (meeting: MeetingListItemDto) => void;
}

const MeetingRow = ({
  meeting,
  isAdmin,
  onNavigate,
  onCutOff,
  onSendInvitation,
  onResendInvitation,
  onEndMeeting,
  onDocuments,
  onCancel,
}: MeetingRowProps) => {
  const { t } = useTranslation('meeting');
  const { status } = meeting;
  const isNew = status === 'New';
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const actions: RowAction[] = [];

  actions.push({
    label: t('buttons.documents'),
    icon: 'folder-open',
    onClick: () => onDocuments(meeting),
    tone: 'blue',
  });

  if (isAdmin && CUT_OFF_ELIGIBLE.has(status)) {
    actions.push({
      label: t('actions.cutOff'),
      icon: 'scissors',
      onClick: () => onCutOff(meeting),
      tone: 'amber',
    });
  }

  if (isAdmin && isNew && meeting.itemCount > 0) {
    actions.push({
      label: t('actions.sendInvitation'),
      icon: 'envelope',
      onClick: () => onSendInvitation(meeting),
      tone: 'green',
    });
  }

  if (isAdmin && RESEND_INVITATION_ELIGIBLE.has(status)) {
    actions.push({
      label: t('actions.resendInvitation'),
      icon: 'paper-plane',
      onClick: () => onResendInvitation(meeting),
      tone: 'green',
    });
  }

  if (isAdmin && END_ELIGIBLE.has(status)) {
    actions.push({
      label: t('actions.endMeeting'),
      icon: 'flag-checkered',
      onClick: () => onEndMeeting(meeting),
      tone: 'violet',
    });
  }

  if (isAdmin && CANCEL_ELIGIBLE.has(status)) {
    actions.push({
      label: t('actions.cancel'),
      icon: 'xmark',
      onClick: () => onCancel(meeting),
      tone: 'red',
    });
  }

  return (
    <tr
      key={meeting.id}
      onClick={() => onNavigate(meeting.id)}
      onContextMenu={e => {
        if (actions.length === 0) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-4 py-3">
        <MeetingNoBadge meetingNo={meeting.meetingNo} />
      </td>
      <td className="px-4 py-3 text-gray-900 font-medium">{meeting.title}</td>
      <td className="px-4 py-3">
        <MeetingStatusBadge status={meeting.status} />
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
        {formatDateTime(meeting.startAt)} - {formatDateTime(meeting.endAt)}
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
        {formatDateTime(meeting.cutOffAt)}
      </td>
      <td className="px-4 py-3 text-right text-gray-600">{meeting.itemCount}</td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
        <div>{formatDateTime(meeting.updatedAt)}</div>
        <div className="text-xs text-gray-400">
          {meeting.updatedBy ? `${t('columns.by')} ${meeting.updatedBy}` : '—'}
        </div>
      </td>
      <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
        {ctxMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setCtxMenu(null)}
              onContextMenu={e => {
                e.preventDefault();
                setCtxMenu(null);
              }}
            />
            <div
              className={`fixed z-50 ${MENU_PANEL_CLASS}`}
              style={{ top: ctxMenu.y, left: ctxMenu.x }}
            >
              <ActionMenuItems actions={actions} onClose={() => setCtxMenu(null)} />
            </div>
          </>
        )}
        <RowActionsMenu actions={actions} />
      </td>
    </tr>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

type MeetingTab = 'active' | 'history';

type SortField = 'meetingNo' | 'startAt' | 'itemCount';

const HISTORY_STATUSES: MeetingStatus[] = ['Ended', 'Cancelled'];
const ACTIVE_STATUSES: MeetingStatus[] = MEETING_STATUS_OPTIONS.filter(
  s => !HISTORY_STATUSES.includes(s),
);

const MeetingListPage = () => {
  const { t } = useTranslation(['meeting', 'common']);
  const navigate = useNavigate();
  const hasAdmin = useHasPermission(MEETING_PERMISSIONS.ADMIN);
  const [tab, setTab] = useState<MeetingTab>('active');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | ''>('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const bulkCreateDialog = useDisclosure();
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingListItemDto | null>(null);
  const [isResend, setIsResend] = useState(false);
  const cutOffDialog = useDisclosure();
  const sendInvitationDialog = useDisclosure();
  const endDialog = useDisclosure();
  const cancelDialog = useDisclosure();
  const documentsDialog = useDisclosure();

  const statusOptions = tab === 'history' ? HISTORY_STATUSES : ACTIVE_STATUSES;

  // Reset page when any filter or sort input changes.
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, fromDate, toDate, statusFilter, tab, sortField, sortDir]);

  const { data, isLoading, isError, refetch } = useGetMeetings({
    status: statusFilter || undefined,
    isHistory: tab === 'history',
    search: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy: sortField ?? undefined,
    sortDir: sortField ? sortDir : undefined,
    pageNumber,
    pageSize,
  });

  // Click a sortable header: same field toggles asc → desc → unsorted; new field starts asc.
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? (
      <Icon style="solid" name="sort" className="size-2.5 text-gray-300" />
    ) : (
      <Icon
        style="solid"
        name={sortDir === 'asc' ? 'sort-up' : 'sort-down'}
        className="size-2.5 text-primary"
      />
    );

  const clearFilters = () => {
    setSearchInput('');
    setFromDate(undefined);
    setToDate(undefined);
    setStatusFilter('');
  };

  const handleTabChange = (next: MeetingTab) => {
    if (next === tab) return;
    setTab(next);
    clearFilters();
  };

  const hasAnyFilter = !!searchInput || !!fromDate || !!toDate || !!statusFilter;

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleCutOff = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    cutOffDialog.onOpen();
  };

  const handleSendInvitation = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    setIsResend(false);
    sendInvitationDialog.onOpen();
  };

  const handleResendInvitation = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    setIsResend(true);
    sendInvitationDialog.onOpen();
  };

  const handleEndMeeting = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    endDialog.onOpen();
  };

  const handleDocuments = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    documentsDialog.onOpen();
  };

  const handleCancel = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    cancelDialog.onOpen();
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.meetings.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.meetings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate('/meetings/queue')}>
            <Icon name="hourglass-half" style="solid" className="size-3.5 mr-1.5" />
            {t('buttons.viewQueue')}
          </Button>
          {hasAdmin && (
            <Button size="sm" onClick={bulkCreateDialog.onOpen}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.newMeeting')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-1 border-b border-gray-200">
        {[
          { key: 'active' as const, labelKey: 'tabs.active' },
          { key: 'history' as const, labelKey: 'tabs.history' },
        ].map(({ key, labelKey }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="shrink-0 flex flex-wrap items-start gap-3 pb-1">
        <div className="w-96">
          <TextInput
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
            placeholder={t('filters.searchPlaceholder')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">{t('filters.searchHint')}</p>
        </div>
        <div className="w-44">
          <Dropdown
            placeholder={t('filters.allStatus')}
            showValuePrefix={false}
            value={statusFilter}
            options={statusOptions.map(s => ({
              value: s,
              label: t(`status.${s}` as `status.${MeetingStatus}`),
            }))}
            onChange={(val: string | null) => setStatusFilter((val ?? '') as MeetingStatus | '')}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t('filters.from')}</span>
          <div className="w-40">
            <DateInput value={fromDate ?? null} onChange={val => setFromDate(val ?? undefined)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t('filters.to')}</span>
          <div className="w-40">
            <DateInput value={toDate ?? null} onChange={val => setToDate(val ?? undefined)} />
          </div>
        </div>
        {hasAnyFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <Icon name="xmark" style="solid" className="size-3.5 mr-1" />
            {t('buttons.clear')}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th
                  onClick={() => handleSort('meetingNo')}
                  className={`text-left font-medium px-4 py-2.5 whitespace-nowrap select-none cursor-pointer hover:text-gray-700 transition-colors ${
                    sortField === 'meetingNo' ? 'text-primary' : 'text-gray-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {t('columns.meetingNo')}
                    <SortIcon field="meetingNo" />
                  </span>
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">
                  {t('columns.title')}
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">
                  {t('columns.status')}
                </th>
                <th
                  onClick={() => handleSort('startAt')}
                  className={`text-left font-medium px-4 py-2.5 whitespace-nowrap select-none cursor-pointer hover:text-gray-700 transition-colors ${
                    sortField === 'startAt' ? 'text-primary' : 'text-gray-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {t('columns.start')} - {t('columns.end')}
                    <SortIcon field="startAt" />
                  </span>
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  {t('columns.cutOff')}
                </th>
                <th
                  onClick={() => handleSort('itemCount')}
                  className={`text-right font-medium px-4 py-2.5 select-none cursor-pointer hover:text-gray-700 transition-colors ${
                    sortField === 'itemCount' ? 'text-primary' : 'text-gray-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    {t('columns.items')}
                    <SortIcon field="itemCount" />
                  </span>
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  {t('columns.lastUpdated')}
                </th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    <Icon
                      name="spinner"
                      style="solid"
                      className="w-5 h-5 animate-spin inline-block"
                    />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8}>
                    <DataErrorState
                      variant="inline"
                      title={t('common:status.failedToLoad')}
                      onRetry={() => refetch()}
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    {t('empty.noMeetings')}
                  </td>
                </tr>
              ) : (
                items.map(meeting => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    isAdmin={hasAdmin}
                    onNavigate={id => navigate(`/meetings/${id}`)}
                    onCutOff={handleCutOff}
                    onSendInvitation={handleSendInvitation}
                    onResendInvitation={handleResendInvitation}
                    onEndMeeting={handleEndMeeting}
                    onDocuments={handleDocuments}
                    onCancel={handleCancel}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalCount > 0 && (
          <div className="shrink-0 border-t border-gray-200">
            <Pagination
              currentPage={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPageNumber}
              onPageSizeChange={size => {
                setPageSize(size);
                setPageNumber(0);
              }}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <BulkCreateMeetingsDialog
        isOpen={bulkCreateDialog.isOpen}
        onClose={bulkCreateDialog.onClose}
      />

      {selectedMeeting && (
        <>
          <CutOffReviewDialog
            isOpen={cutOffDialog.isOpen}
            onClose={() => {
              cutOffDialog.onClose();
              setSelectedMeeting(null);
            }}
            meetingId={selectedMeeting.id}
          />

          <SendInvitationDialog
            isOpen={sendInvitationDialog.isOpen}
            onClose={() => {
              sendInvitationDialog.onClose();
              setSelectedMeeting(null);
              setIsResend(false);
            }}
            meetingId={selectedMeeting.id}
            meetingNo={selectedMeeting.meetingNo}
            startAt={selectedMeeting.startAt}
            location={selectedMeeting.location}
            isResend={isResend}
          />

          <EndMeetingDialog
            isOpen={endDialog.isOpen}
            onClose={() => {
              endDialog.onClose();
              setSelectedMeeting(null);
            }}
            meetingId={selectedMeeting.id}
          />

          <CancelMeetingDialog
            isOpen={cancelDialog.isOpen}
            onClose={() => {
              cancelDialog.onClose();
              setSelectedMeeting(null);
            }}
            meetingId={selectedMeeting.id}
          />

          <MeetingDocumentsDialog
            isOpen={documentsDialog.isOpen}
            onClose={() => {
              documentsDialog.onClose();
              setSelectedMeeting(null);
            }}
            meetingId={selectedMeeting.id}
          />
        </>
      )}
    </div>
  );
};

export default MeetingListPage;
