import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Icon from '@/shared/components/Icon';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import type {
  AppraisalType,
  ItemDecision,
  MeetingDetailDto,
  MeetingItemDto,
  MeetingMemberDto,
} from '../api/types';
import { ACK_GROUP_COLORS, DECISION_GROUP_COLORS, DECISION_ROW_ACCENT } from '../constants';
import { useMeetingFormat } from '../utils/useMeetingFormat';
import DecisionActionButton from './detail/DecisionActionButton';
import ItemVoteBar from './detail/ItemVoteBar';
import RecallItemDialog from './RecallItemDialog';
import ReleaseItemDialog from './ReleaseItemDialog';
import RemoveItemDialog from './RemoveItemDialog';
import RouteBackItemDialog from './RouteBackItemDialog';

interface MeetingItemsGroupedProps {
  meeting: MeetingDetailDto;
  /**
   * When true, Release / RouteBack action buttons are shown on Pending decision
   * items. The parent page is responsible for computing this from the
   * meeting status and the current user's MEETING_SECRETARY permission.
   */
  canReleaseItems: boolean;
  /**
   * When true, a Remove (trash) icon is shown on Pending decision items, which
   * deletes the item from the meeting and returns it to the queue. Should only
   * be true before the meeting has started (status `New` or `InvitationSent`).
   */
  canRemoveItems: boolean;
  /**
   * When true, a Recall action is shown on Released decision items, undoing
   * the release and putting the item back to Pending on this meeting.
   */
  canRecallItems: boolean;
}

// ── Decision badge ────────────────────────────────────────────────────────────

const DECISION_VARIANT: Record<ItemDecision, string> = {
  Pending: 'bg-gray-100 text-gray-600',
  Released: 'bg-emerald-50 text-emerald-700',
  RoutedBack: 'bg-red-50 text-red-700',
};

const ItemDecisionBadge = ({ decision }: { decision: ItemDecision }) => {
  const { t } = useTranslation('meeting');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DECISION_VARIANT[decision]}`}
    >
      {t(`decision.${decision}` as `decision.${ItemDecision}`)}
    </span>
  );
};

// ── Decision-record action ────────────────────────────────────────────────────

type DecisionAction = 'released' | 'routedBack' | 'recalled';

/**
 * Which action produced the item's current decision state.
 *
 * The backend stores only the RESULT (`ItemDecision`) plus who/when/why — not the transition.
 * It's still recoverable, because the two paths that land on `Pending` stamp differently:
 * `Meeting.UndoRelease` (recall) requires a non-empty actor and reason, while
 * `MeetingItem.Reinstate` clears both. So a Pending item carrying an actor was recalled;
 * one without was reinstated or never decided at all.
 */
const deriveDecisionAction = (item: MeetingItemDto): DecisionAction | null => {
  if (item.itemDecision === 'Released') return 'released';
  if (item.itemDecision === 'RoutedBack') return 'routedBack';
  if (item.itemDecision === 'Pending' && item.decisionBy) return 'recalled';
  return null;
};

const ACTION_BADGE: Record<DecisionAction, string> = {
  released: 'bg-emerald-50 text-emerald-700',
  routedBack: 'bg-red-50 text-red-700',
  recalled: 'bg-amber-50 text-amber-700',
};

const ACTION_LABEL_KEY: Record<
  DecisionAction,
  'items.actionReleased' | 'items.actionRoutedBack' | 'items.actionRecalled'
> = {
  released: 'items.actionReleased',
  routedBack: 'items.actionRoutedBack',
  recalled: 'items.actionRecalled',
};

// ── Per-item action cell ──────────────────────────────────────────────────────

interface ItemActionsProps {
  meetingId: string;
  item: MeetingItemDto;
  canReleaseItems: boolean;
  canRemoveItems: boolean;
  canRecallItems: boolean;
}

const ItemActions = ({
  meetingId,
  item,
  canReleaseItems,
  canRemoveItems,
  canRecallItems,
}: ItemActionsProps) => {
  const { t } = useTranslation('meeting');
  const releaseDialog = useDisclosure();
  const routeBackDialog = useDisclosure();
  const removeDialog = useDisclosure();
  const recallDialog = useDisclosure();

  const isPending = item.itemDecision === 'Pending';
  const showRelease = canReleaseItems && isPending;
  const showRemove = canRemoveItems && isPending;
  const showRecall = canRecallItems && item.itemDecision === 'Released';

  // Status now lives in its own column, so with no permitted actions this cell is simply empty.
  if (!showRelease && !showRemove && !showRecall) return null;

  const appraisalLabel = item.appraisalNumber ?? 'item';

  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        {showRelease && (
          <>
            {/* Forward-arrow, not a check: releasing hands the appraisal on to the committee
                for voting — it is not the secretary approving it. Pairs directionally with
                Route Back's backward arrow. */}
            <DecisionActionButton
              tone="emerald"
              icon="circle-arrow-right"
              label={t('buttons.release')}
              onClick={releaseDialog.onOpen}
            />
            <DecisionActionButton
              tone="red"
              icon="arrow-rotate-left"
              label={t('buttons.routeBack')}
              onClick={routeBackDialog.onOpen}
            />
          </>
        )}
        {showRemove && (
          <DecisionActionButton
            tone="slate"
            icon="trash"
            label={t('aria.removeFromMeeting', { label: appraisalLabel })}
            onClick={removeDialog.onOpen}
          />
        )}
        {showRecall && (
          <DecisionActionButton
            tone="amber"
            icon="clock-rotate-left"
            label={t('buttons.recall')}
            onClick={recallDialog.onOpen}
          />
        )}
      </div>

      {showRelease && (
        <>
          <ReleaseItemDialog
            isOpen={releaseDialog.isOpen}
            onClose={releaseDialog.onClose}
            meetingId={meetingId}
            appraisalId={item.appraisalId}
            appraisalNo={item.appraisalNumber}
          />
          <RouteBackItemDialog
            isOpen={routeBackDialog.isOpen}
            onClose={routeBackDialog.onClose}
            meetingId={meetingId}
            appraisalId={item.appraisalId}
            appraisalNo={item.appraisalNumber}
          />
        </>
      )}
      {showRemove && (
        <RemoveItemDialog
          isOpen={removeDialog.isOpen}
          onClose={removeDialog.onClose}
          meetingId={meetingId}
          appraisalId={item.appraisalId}
          appraisalNo={item.appraisalNumber}
        />
      )}
      {showRecall && (
        <RecallItemDialog
          isOpen={recallDialog.isOpen}
          onClose={recallDialog.onClose}
          meetingId={meetingId}
          appraisalId={item.appraisalId}
          appraisalNo={item.appraisalNumber}
        />
      )}
    </>
  );
};

// ── Shared table column layout ────────────────────────────────────────────────

/**
 * Shared colgroup so Decision and Acknowledgement tables align column-for-column.
 * The leading narrow column is the expand toggle.
 */
const ItemsTableColgroup = () => (
  <colgroup>
    <col className="w-9" />
    <col className="w-12" />
    {/* Wide enough for the "Appraisal Number" header to sit on one line — it wrapped at w-36. */}
    <col className="w-44" />
    {/* Customer and staff BOTH flex, so the leftover width is split between them. Previously
        only customer flexed and it swallowed every spare pixel, leaving a dead gap mid-row. */}
    <col />
    <col />
    <col className="w-40" />
    <col className="w-28" />
    <col className="w-28" />
    <col className="w-24" />
  </colgroup>
);

const COLUMN_COUNT = 9;

// ── Row ───────────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: MeetingItemDto;
  index: number;
  meetingId: string;
  /** Acknowledgement rows carry no decision, so they render without the action cell. */
  showActions: boolean;
  canReleaseItems: boolean;
  canRemoveItems: boolean;
  canRecallItems: boolean;
  /** Meeting roster, for the one-icon-per-approver vote display. */
  members: MeetingMemberDto[];
}

const ItemRow = ({
  item,
  index,
  meetingId,
  showActions,
  canReleaseItems,
  canRemoveItems,
  canRecallItems,
  members,
}: ItemRowProps) => {
  const { t } = useTranslation('meeting');
  const { formatMoney, formatDateTime } = useMeetingFormat();
  const [expanded, setExpanded] = useState(false);

  const label = item.appraisalNumber ?? item.appraisalId.slice(0, 8);

  // Votes live in their own column now, so the expanded row exists purely for the decision
  // record — there is nothing to reveal until a decision has actually been made.
  // Gate on the derived ACTION, not on the raw timestamp. `MeetingItem.Reinstate` (a routed-back
  // item coming back for reconsideration) resets the item to Pending and clears the actor and
  // reason, but still stamps DecisionAt — so keying off `decisionAt` left reinstated rows
  // expandable with a record containing nothing but a date. A reset has no decision to record.
  const decisionAction = deriveDecisionAction(item);
  const hasDecisionRecord = decisionAction !== null;
  const expandable = hasDecisionRecord;

  return (
    <>
      <tr
        className={clsx(
          'border-l-4 transition-colors hover:bg-gray-50',
          showActions ? DECISION_ROW_ACCENT[item.itemDecision] : 'border-l-transparent',
          // Routed-back rows carry a faint tint so problem items are findable without reading
          // every decision cell.
          showActions && item.itemDecision === 'RoutedBack' && 'bg-red-50/40',
        )}
      >
        <td className="px-1 py-3 text-center">
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              aria-label={t('items.toggleDetail', { label })}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <Icon
                name="chevron-right"
                style="solid"
                className={clsx('size-3 transition-transform', expanded && 'rotate-90')}
              />
            </button>
          )}
        </td>
        <td className="px-2 py-1.5 text-center text-xs text-gray-400 tabular-nums">{index + 1}</td>
        <td className="truncate px-3 py-1.5 text-sm whitespace-nowrap">
          <Link
            to={`/appraisals/${item.appraisalId}/summary`}
            className="font-semibold text-primary hover:underline"
          >
            {label}
          </Link>
        </td>
        <td className="truncate px-3 py-1.5 text-left text-sm text-gray-900">
          {item.customerName}
        </td>
        {/* Staff is context, not the subject of the row — muted so the eye lands on the
            appraisal number, the customer and the value. */}
        <td className="truncate px-3 py-1.5 text-left text-sm text-gray-500">
          {item.appraisalStaff}
        </td>
        <td className="px-3 py-1.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums text-gray-900">
          {formatMoney(item.appraisedValue)}
        </td>
        {/* Status — always rendered for decision rows, regardless of what the viewer may do.
            Acknowledgement rows have no decision, so both trailing cells stay empty. */}
        <td className="px-3 py-1.5 text-center whitespace-nowrap" aria-hidden={!showActions}>
          {showActions && <ItemDecisionBadge decision={item.itemDecision} />}
        </td>
        <td className="px-3 py-1.5 text-center whitespace-nowrap" aria-hidden={!showActions}>
          {showActions && <ItemVoteBar item={item} members={members} />}
        </td>
        <td className="px-3 py-1.5 text-center whitespace-nowrap" aria-hidden={!showActions}>
          {showActions && (
            <ItemActions
              meetingId={meetingId}
              item={item}
              canReleaseItems={canReleaseItems}
              canRemoveItems={canRemoveItems}
              canRecallItems={canRecallItems}
            />
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50/70">
          {/* Skip the toggle and row-number columns so the detail starts flush under the
              Appraisal Number column rather than at an arbitrary offset. Using colSpan against
              the shared colgroup keeps that true if the widths ever change. */}
          <td colSpan={2} />
          <td colSpan={COLUMN_COUNT - 2} className="px-3 pb-3 pt-1">
            {/* Single flowing block rather than a 3-column grid: the record is only three short
                facts, so a grid left a tall thin column beside a very wide reason box and a dead
                gap between them. The facts now read across one line and the reason sits beneath
                at a readable measure. */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {t('items.decisionRecord')}
              </h5>

              <dl className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
                {/* The ACTION taken, not the resulting status — the Decision column already
                    carries the status, and "Pending" told you nothing about what happened. */}
                {decisionAction && (
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500">{t('items.action')}</dt>
                    <dd>
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          ACTION_BADGE[decisionAction],
                        )}
                      >
                        {t(ACTION_LABEL_KEY[decisionAction])}
                      </span>
                    </dd>
                  </div>
                )}
                {item.decisionBy && (
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500">{t('items.decidedBy')}</dt>
                    <dd className="font-medium text-gray-800">{item.decisionBy}</dd>
                  </div>
                )}
                {item.decisionAt && (
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500">{t('items.decidedAt')}</dt>
                    <dd className="text-gray-800">{formatDateTime(item.decisionAt)}</dd>
                  </div>
                )}
              </dl>

              {item.decisionReason && (
                <div>
                  <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {t('items.reason')}
                  </h5>
                  {/* Quoted, not boxed — the bordered white box read as an editable input. */}
                  <p className="mt-1 max-w-prose border-l-2 border-gray-200 pl-2.5 text-xs whitespace-pre-wrap text-gray-700">
                    {item.decisionReason}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Group table ───────────────────────────────────────────────────────────────

const DECISION_GROUP_ORDER: AppraisalType[] = ['New', 'ReAppraisal', 'Progressive', 'PreAppraisal'];

/**
 * Acknowledgement group keys, urgent first.
 * These are the raw values the API groups by — '2' = urgent, '1' = standard. (Note the
 * `AcknowledgementGroup` union in `api/types.ts` says `Group1`/`UrgentGroup2`, but the
 * grouping key on the wire is the bare digit, which is what the original code matched on.)
 */
const ACK_GROUP_ORDER = ['2', '1'] as const;

interface ItemsGroupTableProps {
  label: string;
  items: MeetingItemDto[];
  meetingId: string;
  showActions: boolean;
  canReleaseItems: boolean;
  canRemoveItems: boolean;
  canRecallItems: boolean;
  /** Group accent colour; omitted for groups that have no assigned colour. */
  accentColor?: string;
  /** Meeting roster, for the one-icon-per-approver vote display. */
  members: MeetingMemberDto[];
}

const ItemsGroupTable = ({
  label,
  items,
  meetingId,
  showActions,
  canReleaseItems,
  canRemoveItems,
  canRecallItems,
  accentColor,
  members,
}: ItemsGroupTableProps) => {
  const { t } = useTranslation('meeting');
  const { formatMoney } = useMeetingFormat();

  // Sum only the values that exist — a missing valuation must not be counted as zero.
  const subtotal = items.reduce(
    (sum, i) => (i.appraisedValue == null ? sum : sum + i.appraisedValue),
    0,
  );

  const heading = (
    <div className="mb-1.5 flex items-center gap-2">
      {accentColor && (
        <span
          aria-hidden="true"
          className="block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <h4 className="text-xs font-semibold tracking-wide text-gray-700">{label}</h4>
      <span className="text-[11px] text-gray-400 tabular-nums">{items.length}</span>
    </div>
  );

  // Empty groups still render — every canonical group is always visible — but as a single muted
  // strip rather than a full header + "no items" row. Four empty tables of repeated headers was
  // most of the page's vertical space.
  if (items.length === 0) {
    return (
      <div>
        {heading}
        <p className="border-t border-gray-100 py-2 text-xs text-gray-300 italic">
          {t('empty.noItems')}
        </p>
      </div>
    );
  }

  return (
    <div>
      {heading}
      {/* Borderless data list rather than a boxed table: one hairline under the header, hairlines
          between rows, no header fill. The chrome was competing with the data. */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <ItemsTableColgroup />
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-1 pb-2" aria-hidden="true" />
              <th className="px-2 pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('columns.no')}
              </th>
              <th className="px-3 pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('columns.appraisalNumber')}
              </th>
              <th className="px-3 pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('columns.customerName')}
              </th>
              <th className="px-3 pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('columns.appraisalStaff')}
              </th>
              <th className="px-3 pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('columns.appraisalValue')}
              </th>
              {/* Status and actions are separate columns: status must be readable on every row,
                  including rows the viewer has no permission to act on. Acknowledgement tables
                  leave both empty — they carry no decision — but keep the columns so the two
                  tables stay aligned. */}
              {showActions ? (
                <>
                  <th className="px-3 pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {t('columns.decision')}
                  </th>
                  <th className="px-3 pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {t('columns.votes')}
                  </th>
                  <th className="px-3 pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {t('columns.actions')}
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 pb-2" aria-hidden="true" />
                  <th className="px-3 pb-2" aria-hidden="true" />
                  <th className="px-3 pb-2" aria-hidden="true" />
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                meetingId={meetingId}
                showActions={showActions}
                canReleaseItems={canReleaseItems}
                canRemoveItems={canRemoveItems}
                canRecallItems={canRecallItems}
                members={members}
              />
            ))}
          </tbody>
          {items.length > 1 && (
            <tfoot>
              <tr className="border-t border-gray-200">
                <td
                  colSpan={5}
                  className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                >
                  {t('items.subtotal')}
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-gray-900">
                  {formatMoney(subtotal)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

type DecisionFilter = ItemDecision | 'all';

const MeetingItemsGrouped = ({
  meeting,
  canReleaseItems,
  canRemoveItems,
  canRecallItems,
}: MeetingItemsGroupedProps) => {
  const { t } = useTranslation('meeting');
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('all');
  const debouncedSearch = useDebounce(search);

  const totalItemCount =
    meeting.items.decisionItems.reduce((s, g) => s + g.items.length, 0) +
    meeting.items.acknowledgementItems.reduce((s, g) => s + g.items.length, 0);

  // Every meeting member becomes an approver when an item is released
  // (see MeetingItemReleasedDomainEventHandler), so the roster IS the expected voter list.
  const members = meeting.members;

  const { decisionGroups, ackGroups, shownCount } = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();

    const matches = (item: MeetingItemDto) => {
      if (decisionFilter !== 'all' && item.itemDecision !== decisionFilter) return false;
      if (!needle) return true;
      return [item.appraisalNumber, item.customerName, item.appraisalStaff]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(needle));
    };

    /**
     * Every canonical group is always rendered, even with no items — the fixed set of
     * headings is what people read the page against, and a group vanishing reads as
     * "this category doesn't exist here" rather than "nothing in it yet". Groups the
     * backend returns that aren't in the canonical list are appended after.
     */
    const buildGroups = (
      groups: { group: string; items: MeetingItemDto[] }[],
      canonical: readonly string[],
    ) => {
      const byGroup = new Map<string, MeetingItemDto[]>();
      for (const g of groups) byGroup.set(g.group, g.items);

      const extras = groups.map(g => g.group).filter(key => !canonical.includes(key));

      return [...canonical, ...extras].map(key => ({
        group: key,
        items: (byGroup.get(key) ?? []).filter(matches),
      }));
    };

    const decision = buildGroups(meeting.items.decisionItems, DECISION_GROUP_ORDER);
    // Urgent (group 2) before standard (group 1), matching the original fixed layout.
    const ack = buildGroups(meeting.items.acknowledgementItems, ACK_GROUP_ORDER);

    const shown =
      decision.reduce((s, g) => s + g.items.length, 0) +
      ack.reduce((s, g) => s + g.items.length, 0);

    return { decisionGroups: decision, ackGroups: ack, shownCount: shown };
  }, [meeting.items, debouncedSearch, decisionFilter]);

  const decisionShown = decisionGroups.reduce((s, g) => s + g.items.length, 0);
  const ackShown = ackGroups.reduce((s, g) => s + g.items.length, 0);
  const isFiltering = debouncedSearch.trim().length > 0 || decisionFilter !== 'all';

  const decisionGroupLabel = (group: string) =>
    DECISION_GROUP_ORDER.includes(group as AppraisalType)
      ? t(`decisionGroups.${group}` as `decisionGroups.${AppraisalType}`)
      : t('decisionGroups.other');

  const ackGroupLabel = (group: string) =>
    group === '2' ? t('ackGroups.urgent') : group === '1' ? t('ackGroups.standard') : group;

  return (
    <div className="space-y-6">
      {/* Filter bar — only worth the space once there are enough items to hunt through. */}
      {totalItemCount > 5 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Icon
              name="magnifying-glass"
              style="solid"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('items.searchPlaceholder')}
              aria-label={t('items.searchPlaceholder')}
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={decisionFilter}
            onChange={e => setDecisionFilter(e.target.value as DecisionFilter)}
            aria-label={t('columns.decision')}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t('items.allDecisions')}</option>
            {(['Pending', 'Released', 'RoutedBack'] as ItemDecision[]).map(d => (
              <option key={d} value={d}>
                {t(`decision.${d}` as `decision.${ItemDecision}`)}
              </option>
            ))}
          </select>

          {isFiltering && (
            <span className="text-xs text-gray-500 tabular-nums">
              {t('items.showing', { shown: shownCount, total: totalItemCount })}
            </span>
          )}
        </div>
      )}

      {/* Both sections and every group inside them always render — an empty group shows its
          own "no items" row rather than disappearing. */}
      {isFiltering && shownCount === 0 && (
        <p className="text-center text-sm text-gray-400">{t('items.noMatches')}</p>
      )}

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon name="gavel" style="solid" className="size-3.5 text-primary" />
          {t('sections.decisionItems', { n: decisionShown })}
        </h3>
        {decisionGroups.map(group => (
          <ItemsGroupTable
            key={group.group}
            label={decisionGroupLabel(group.group)}
            accentColor={DECISION_GROUP_COLORS[group.group]}
            items={group.items}
            meetingId={meeting.id}
            showActions
            canReleaseItems={canReleaseItems}
            canRemoveItems={canRemoveItems}
            canRecallItems={canRecallItems}
            members={members}
          />
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon name="circle-info" style="solid" className="size-3.5 text-purple-500" />
          {t('sections.acknowledgementItems', { n: ackShown })}
        </h3>
        {ackGroups.map(group => (
          <ItemsGroupTable
            key={group.group}
            label={ackGroupLabel(group.group)}
            accentColor={ACK_GROUP_COLORS[group.group]}
            items={group.items}
            meetingId={meeting.id}
            showActions={false}
            canReleaseItems={false}
            canRemoveItems={false}
            canRecallItems={false}
            members={members}
          />
        ))}
      </div>
    </div>
  );
};

export default MeetingItemsGrouped;
