/**
 * Approver votes for one released appraisal: one person icon per committee member.
 *
 * Icons follow the meeting roster order, so each position is a specific person — filled and
 * coloured once they've voted (green approve, red reject, amber route back), hollow grey while
 * outstanding. Hovering (or focusing) the group opens a popover naming every approver and their
 * vote, so "who still owes a vote" is one hover away rather than a per-icon hunt.
 *
 * The popover renders through `FloatingPortal` because the items table sits inside an
 * `overflow-x-auto` wrapper, which would otherwise clip it.
 *
 * Vote keys are workflow-config driven (`voteOptions`), so an unrecognised key still renders in
 * a neutral colour with its raw key shown, rather than vanishing from the tally.
 */
import { useState } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Icon from '@/shared/components/Icon';
import type {
  CommitteeMemberPosition,
  ItemVoteDto,
  MeetingItemDto,
  MeetingMemberDto,
} from '../../api/types';
import { useMeetingFormat } from '../../utils/useMeetingFormat';

const KNOWN_VOTES = new Set(['approve', 'reject', 'route_back']);

/** Tailwind text colours — the shared `Icon` uses `style` for the sprite name, so colour has to
 *  come through `className` rather than an inline style object. */
const VOTE_ICON_CLASS: Record<string, string> = {
  approve: 'text-emerald-500',
  reject: 'text-red-500',
  route_back: 'text-amber-500',
};

const FALLBACK_ICON_CLASS = 'text-gray-400';

/**
 * One committee member.
 *
 * Solid + coloured once they've voted, hollow grey while outstanding — no overlaid tick badge.
 * A corner badge was tried and reverted: at this size it was ~60% the width of the person glyph,
 * so it couldn't shrink enough to look right without becoming illegible, and it overhung into
 * the neighbouring member. Colour carries the at-a-glance signal; the popover carries the
 * precise per-person answer.
 */
const VoterIcon = ({ vote }: { vote: ItemVoteDto | undefined }) => (
  <Icon
    name="user"
    style={vote ? 'solid' : 'regular'}
    className={clsx(
      'size-3 shrink-0',
      vote ? (VOTE_ICON_CLASS[vote.vote] ?? FALLBACK_ICON_CLASS) : 'text-gray-300',
    )}
  />
);

interface VoteSlot {
  key: string;
  name: string;
  role: string | null;
  vote: ItemVoteDto | undefined;
}

interface ItemVoteBarProps {
  item: MeetingItemDto;
  /** The meeting roster — every member becomes an approver when an item is released. */
  members: MeetingMemberDto[];
}

const ItemVoteBar = ({ item, members }: ItemVoteBarProps) => {
  const { t } = useTranslation('meeting');
  const { formatDateTime } = useMeetingFormat();
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });

  // Small open delay so sweeping the cursor across a table doesn't flash popovers.
  const hover = useHover(context, { move: false, delay: { open: 120, close: 60 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  // Only released items go to approvers at all; anything else has nothing to show.
  // NOTE: this sits below the hooks on purpose — an early return above them would change hook
  // order between renders as items get released.
  if (item.itemDecision !== 'Released') return null;

  // Defensive: drop malformed entries rather than throwing. This shape changed once
  // (aggregated {vote,count} → per-voter {member,vote,...}), and an API serving the old shape
  // would otherwise crash the page on `undefined.toLowerCase()`.
  const votes = (item.votes ?? []).filter(v => typeof v?.member === 'string' && v.member !== '');

  const labelFor = (vote: string) =>
    KNOWN_VOTES.has(vote)
      ? t(`votes.${vote}` as 'votes.approve' | 'votes.reject' | 'votes.route_back')
      : vote;

  // `ApprovalVote.Member` and `MeetingMember.UserId` are both usernames, but they're written by
  // different paths — match case-insensitively rather than trusting them to agree exactly.
  const voteByMember = new Map(votes.map(v => [v.member.toLowerCase(), v]));

  const slots: VoteSlot[] = members.map(member => ({
    key: member.id,
    name: member.memberName,
    // Roster positions are a known enum with translations; the orphan path below uses the
    // workflow's free-text MemberRole, which has none, so it stays raw.
    role: member.position
      ? t(`position.${member.position}` as `position.${CommitteeMemberPosition}`)
      : null,
    vote: member.userId ? voteByMember.get(member.userId.toLowerCase()) : undefined,
  }));

  // A member removed from the meeting after voting has no roster row left, but their vote still
  // counts toward the round — append them rather than silently dropping the icon.
  const rosterUserIds = new Set(members.filter(m => m.userId).map(m => m.userId.toLowerCase()));
  for (const vote of votes) {
    if (rosterUserIds.has(vote.member.toLowerCase())) continue;
    slots.push({
      key: `orphan-${vote.member}`,
      name: vote.member,
      role: vote.memberRole ?? null,
      vote,
    });
  }

  if (slots.length === 0) return null;

  const summary = `${votes.length}/${slots.length}`;

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        aria-label={t('votes.title')}
        className="inline-flex items-center gap-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {slots.map(slot => (
          <VoterIcon key={slot.key} vote={slot.vote} />
        ))}
      </button>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 min-w-[240px] max-w-xs rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 px-3 py-2">
              <p className="text-xs font-semibold text-gray-700">{t('votes.title')}</p>
              <p className="text-[10px] tabular-nums text-gray-400">{summary}</p>
            </div>

            <ul className="max-h-64 overflow-auto py-1">
              {slots.map(slot => (
                <li key={slot.key} className="flex items-start gap-2 px-3 py-1.5">
                  <span className="mt-0.5">
                    <VoterIcon vote={slot.vote} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800">{slot.name}</p>
                    {slot.role && <p className="text-[10px] text-gray-400">{slot.role}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    {slot.vote ? (
                      <>
                        <p
                          className={clsx(
                            'text-[11px] font-medium',
                            VOTE_ICON_CLASS[slot.vote.vote] ?? FALLBACK_ICON_CLASS,
                          )}
                        >
                          {labelFor(slot.vote.vote)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatDateTime(slot.vote.votedAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">{t('votes.notVoted')}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default ItemVoteBar;
