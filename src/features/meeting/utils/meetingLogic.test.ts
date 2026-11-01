import { describe, expect, it } from 'vitest';

import { END_ELIGIBLE, getPrimaryToolbarAction, ITEM_RECALL_ELIGIBLE } from '../constants';
import type { MeetingDetailDto, MeetingItemDto } from '../api/types';
import { computeMeetingStats, isVoteRoundResolved } from './meetingStats';

const item = (voteOutcome?: string | null): MeetingItemDto =>
  ({ itemDecision: 'Released', appraisedValue: 1, voteOutcome }) as MeetingItemDto;

describe('meeting awaiting-votes logic', () => {
  it('counts only decision items with a concluded outcome', () => {
    const meeting = {
      items: {
        decisionItems: [
          {
            group: 'New',
            items: [item('approve'), item('cancelled'), item('route_back'), item(null), item()],
          },
        ],
        // Acknowledgement items never carry an outcome and must not count.
        acknowledgementItems: [{ group: '1', items: [item('approve')] }],
      },
    } as unknown as MeetingDetailDto;
    const stats = computeMeetingStats(meeting);
    // A cancelled round counts as concluded, so it must not hold End back.
    expect(stats.votedCount).toBe(3);
    expect(stats.totalDecision).toBe(5);
  });

  it('allows ending and recalling in AwaitingVotes, without a solid primary action', () => {
    expect(END_ELIGIBLE.has('AwaitingVotes')).toBe(true);
    expect(ITEM_RECALL_ELIGIBLE.has('AwaitingVotes')).toBe(true);
    expect(getPrimaryToolbarAction('AwaitingVotes', true)).toBeNull();
  });

  it('hides recall once a round is resolved, except a reject which stays recallable', () => {
    expect(isVoteRoundResolved(null)).toBe(false);
    expect(isVoteRoundResolved(undefined)).toBe(false);
    expect(isVoteRoundResolved('reject')).toBe(false);
    expect(isVoteRoundResolved('approve')).toBe(true);
    expect(isVoteRoundResolved('cancelled')).toBe(true);
    expect(isVoteRoundResolved('route_back')).toBe(true);
  });
});
