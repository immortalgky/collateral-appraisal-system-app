import { Link } from 'react-router-dom';

import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import type { AppraisalType, ItemDecision, MeetingDetailDto, MeetingItemDto } from '../api/types';
import ReleaseItemDialog from './ReleaseItemDialog';
import RouteBackItemDialog from './RouteBackItemDialog';

interface MeetingItemsGroupedProps {
  meeting: MeetingDetailDto;
  /**
   * When true, Release / RouteBack action buttons are shown on Pending decision
   * items. The parent page is responsible for computing this from the
   * meeting status and the current user's MEETING_SECRETARY permission.
   */
  canReleaseItems: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

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
}

const ItemActions = ({ meetingId, item, canReleaseItems }: ItemActionsProps) => {
  const releaseDialog = useDisclosure();
  const routeBackDialog = useDisclosure();

  if (!canReleaseItems || item.itemDecision !== 'Pending') {
    return <ItemDecisionBadge decision={item.itemDecision} />;
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="xs" type="button" onClick={releaseDialog.onOpen}>
          <Icon name="check" style="solid" className="size-3 mr-1" />
          Release
        </Button>
        <Button variant="ghost" size="xs" type="button" onClick={routeBackDialog.onOpen}>
          <Icon name="arrow-rotate-left" style="solid" className="size-3 mr-1" />
          Route Back
        </Button>
      </div>

      <ReleaseItemDialog
        isOpen={releaseDialog.isOpen}
        onClose={releaseDialog.onClose}
        meetingId={meetingId}
        appraisalId={item.appraisalId}
        appraisalNo={item.appraisalNo}
      />
      <RouteBackItemDialog
        isOpen={routeBackDialog.isOpen}
        onClose={routeBackDialog.onClose}
        meetingId={meetingId}
        appraisalId={item.appraisalId}
        appraisalNo={item.appraisalNo}
      />
    </>
  );
};

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
}

const DecisionGroupTable = ({
  label,
  items,
  meetingId,
  canReleaseItems,
}: DecisionGroupTableProps) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{label}</h4>
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Appraisal #
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Facility Limit
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Added
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Decision
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-400 italic">
                No items
              </td>
            </tr>
          ) : (
            items.map(item => {
              const label = item.appraisalNo ?? item.appraisalId.slice(0, 8);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <Link
                      to={`/appraisals/${item.appraisalId}/summary`}
                      className="text-blue-600 hover:underline"
                    >
                      {label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                    {formatCurrency(item.facilityLimit)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(item.addedAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <ItemActions
                      meetingId={meetingId}
                      item={item}
                      canReleaseItems={canReleaseItems}
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
    {items.length === 0 ? (
      <p className="text-sm text-gray-400 italic py-2">No acknowledgement items.</p>
    ) : (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Appraisal #
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Facility Limit
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Group
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(item => {
              const appraisalLabel = item.appraisalNo ?? item.appraisalId.slice(0, 8);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <Link
                      to={`/appraisals/${item.appraisalId}/summary`}
                      className="text-blue-600 hover:underline"
                    >
                      {appraisalLabel}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                    {formatCurrency(item.facilityLimit)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {item.acknowledgementGroup ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Badge variant="info" size="xs" type="status" value="inprogress">
                      Acknowledgement
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const MeetingItemsGrouped = ({ meeting, canReleaseItems }: MeetingItemsGroupedProps) => {
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
        <h3 className="text-sm font-semibold text-gray-700">
          Decision Items ({totalDecision})
        </h3>
        {DECISION_GROUP_ORDER.map(type => (
          <DecisionGroupTable
            key={type}
            label={DECISION_GROUP_LABELS[type]}
            items={decisionByGroup.get(type) ?? []}
            meetingId={meeting.id}
            canReleaseItems={canReleaseItems}
          />
        ))}
      </div>

      {/* Acknowledgement section */}
      {totalAck > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Acknowledgement Items ({totalAck})
          </h3>
          <AckGroupCard
            label="Group 1 (Sub-Committee)"
            items={ackByGroup.get('Group1') ?? []}
          />
          <AckGroupCard
            label="Urgent Group 2"
            items={ackByGroup.get('UrgentGroup2') ?? []}
          />
        </div>
      )}

      {totalDecision === 0 && totalAck === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Icon name="folder-open" style="regular" className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">No appraisals in this meeting yet.</p>
        </div>
      )}
    </div>
  );
};

export default MeetingItemsGrouped;
