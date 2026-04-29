import { Link } from 'react-router-dom';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import type { AppraisalType, ItemDecision, MeetingDetailDto, MeetingItemDto } from '../api/types';
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
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );

// ── Decision badge ────────────────────────────────────────────────────────────

const DECISION_VARIANT: Record<ItemDecision, string> = {
  Pending: 'bg-gray-100 text-gray-600',
  Released: 'bg-emerald-50 text-emerald-700',
  RoutedBack: 'bg-red-50 text-red-700',
};

const ItemDecisionBadge = ({ decision }: { decision: ItemDecision }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DECISION_VARIANT[decision]}`}
  >
    {decision === 'RoutedBack' ? 'Routed Back' : decision}
  </span>
);

// ── Per-item action cell ──────────────────────────────────────────────────────

interface ItemActionsProps {
  meetingId: string;
  item: MeetingItemDto;
  canReleaseItems: boolean;
  canRemoveItems: boolean;
}

const ItemActions = ({ meetingId, item, canReleaseItems, canRemoveItems }: ItemActionsProps) => {
  const releaseDialog = useDisclosure();
  const routeBackDialog = useDisclosure();
  const removeDialog = useDisclosure();

  const isPending = item.itemDecision === 'Pending';
  const showRelease = canReleaseItems && isPending;
  const showRemove = canRemoveItems && isPending;

  if (!showRelease && !showRemove) {
    return <ItemDecisionBadge decision={item.itemDecision} />;
  }

  const appraisalLabel = item.appraisalNumber ?? 'item';

  return (
    <>
      <div className="flex justify-center items-center gap-1.5">
        {showRelease && (
          <>
            <Button
              className="text-green-600"
              variant="ghost"
              size="xs"
              type="button"
              onClick={releaseDialog.onOpen}
            >
              <Icon name="check" style="solid" className="size-3 mr-1" />
              Release
            </Button>
            <Button
              className="text-red-600"
              variant="ghost"
              size="xs"
              type="button"
              onClick={routeBackDialog.onOpen}
            >
              <Icon name="arrow-rotate-left" style="solid" className="size-3 mr-1" />
              Route Back
            </Button>
          </>
        )}
        {showRemove && (
          <Button
            className="text-red-600"
            variant="ghost"
            size="xs"
            type="button"
            aria-label={`Remove ${appraisalLabel} from meeting`}
            title="Remove from meeting"
            onClick={removeDialog.onOpen}
          >
            <Icon name="trash" style="solid" className="size-3" />
          </Button>
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
    </>
  );
};

// ── Shared table column layout ────────────────────────────────────────────────

/**
 * Shared colgroup so Decision and Acknowledgement tables align column-for-column.
 * Six columns: No · Appraisal Number · Customer Name · Appraisal Staff · Appraisal Value · Decision.
 * The Decision column is empty in Acknowledgement tables to preserve cross-table alignment.
 */
const ItemsTableColgroup = () => (
  <colgroup>
    <col className="w-16" />
    <col className="w-44" />
    <col />
    <col className="w-56" />
    <col className="w-40" />
    <col className="w-40" />
  </colgroup>
);

// ── Decision group table ──────────────────────────────────────────────────────

const DECISION_GROUP_LABELS: Record<AppraisalType, string> = {
  New: 'New Appraisals',
  ReAppraisal: 'Re-Appraisals',
  Progressive: 'Progressive Appraisals',
  PreAppraisal: 'Pre-Appraisals',
};

const DECISION_GROUP_ORDER: AppraisalType[] = ['New', 'ReAppraisal', 'Progressive', 'PreAppraisal'];

interface DecisionGroupTableProps {
  label: string;
  items: MeetingItemDto[];
  meetingId: string;
  canReleaseItems: boolean;
  canRemoveItems: boolean;
}

const DecisionGroupTable = ({
  label,
  items,
  meetingId,
  canReleaseItems,
  canRemoveItems,
}: DecisionGroupTableProps) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{label}</h4>
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full table-fixed divide-y divide-gray-200">
        <ItemsTableColgroup />
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
              No
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Appraisal Number
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Customer Name
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Appraisal Staff
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Appraisal Value
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
              Decision
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-400 italic">
                No items
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const label = item.appraisalNumber ?? item.appraisalId.slice(0, 8);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap truncate">
                    <Link
                      to={`/appraisals/${item.appraisalId}/summary`}
                      className="text-blue-600 hover:underline"
                    >
                      {label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-left whitespace-nowrap truncate">
                    {item.customerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-left whitespace-nowrap truncate">
                    {item.appraisalStaff}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                    {formatCurrency(item.appraisedValue ?? 0)}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <ItemActions
                      meetingId={meetingId}
                      item={item}
                      canReleaseItems={canReleaseItems}
                      canRemoveItems={canRemoveItems}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Acknowledgement info card ─────────────────────────────────────────────────

interface AckGroupCardProps {
  label: string;
  items: MeetingItemDto[];
}

const AckGroupCard = ({ label, items }: AckGroupCardProps) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{label}</h4>
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full table-fixed divide-y divide-gray-200">
        <ItemsTableColgroup />
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
              No
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Appraisal Number
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Customer Name
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Appraisal Staff
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Appraisal Value
            </th>
            {/* Empty 6th header — keeps column positions aligned with the Decision tables. */}
            <th className="px-4 py-2" aria-hidden="true" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-400 italic">
                No items
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const appraisalLabel = item.appraisalNumber ?? item.appraisalId.slice(0, 8);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap truncate">
                    <Link
                      to={`/appraisals/${item.appraisalId}/summary`}
                      className="text-blue-600 hover:underline"
                    >
                      {appraisalLabel}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap truncate">
                    {item.customerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap truncate">
                    {item.appraisalStaff}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                    {formatCurrency(item.appraisedValue ?? 0)}
                  </td>
                  {/* Empty 6th cell mirrors the Decision column slot. */}
                  <td className="px-4 py-3" aria-hidden="true" />
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const MeetingItemsGrouped = ({
  meeting,
  canReleaseItems,
  canRemoveItems,
}: MeetingItemsGroupedProps) => {
  // Build a lookup from the grouped DTO (backend nests these under `items`)
  const decisionByGroup = new Map<AppraisalType, MeetingItemDto[]>();
  for (const group of meeting.items.decisionItems) {
    const key = group.group as AppraisalType;
    decisionByGroup.set(key, group.items);
  }

  const ackByGroup = new Map<string, MeetingItemDto[]>();
  for (const group of meeting.items.acknowledgementItems) {
    ackByGroup.set(group.group, group.items);
  }

  const totalDecision = [...decisionByGroup.values()].reduce((s, arr) => s + arr.length, 0);
  const totalAck = [...ackByGroup.values()].reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Decision section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Decision Items ({totalDecision})</h3>
        {DECISION_GROUP_ORDER.map(type => (
          <DecisionGroupTable
            key={type}
            label={DECISION_GROUP_LABELS[type]}
            items={decisionByGroup.get(type) ?? []}
            meetingId={meeting.id}
            canReleaseItems={canReleaseItems}
            canRemoveItems={canRemoveItems}
          />
        ))}
      </div>

      {/* Acknowledgement section — always shown (empty groups render their own no-items copy). */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Acknowledgement Items ({totalAck})
        </h3>
        <AckGroupCard
          label="Acknowledge for Urgent Approval (Group 2)"
          items={ackByGroup.get('2') ?? []}
        />
        <AckGroupCard label="Acknowledge (Group 1)" items={ackByGroup.get('1') ?? []} />
      </div>

    </div>
  );
};

export default MeetingItemsGrouped;
