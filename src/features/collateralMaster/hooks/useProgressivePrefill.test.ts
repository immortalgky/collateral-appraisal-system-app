import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProgressivePrefill } from './useProgressivePrefill';

/** A new construction-inspection round starts at the previous figure: current = previous. */

const state = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('../api/hooks', () => ({
  useConstructionInspectionWorkDetails: () => ({
    data: state.data,
    isLoading: false,
    isError: false,
  }),
}));

const row = (name: string, itemId: string | null, pct: number) => ({
  constructionWorkItemId: itemId,
  constructionWorkGroupId: 'g1',
  workItemName: name,
  proportionPct: 50,
  constructionValue: null,
  displayOrder: 1,
  currentProgressPct: pct,
});

beforeEach(() => {
  state.data = undefined;
});

describe('useProgressivePrefill: the new round starts at the previous figure', () => {
  it('seeds every prior row with current = previous = the prior current', () => {
    state.data = {
      isFullDetail: true,
      workDetails: [row('Foundation', 'w1', 40), row('Roof', null, 72.5)],
    };
    const { result } = renderHook(() => useProgressivePrefill('insp-1'));

    expect(result.current.buildSeedRows()).toMatchObject([
      { workItemName: 'Foundation', previousProgressPct: 40, currentProgressPct: 40 },
      { workItemName: 'Roof', previousProgressPct: 72.5, currentProgressPct: 72.5 },
    ]);
  });

  it('does the same for rows matched to a template, by id and by name', () => {
    state.data = {
      isFullDetail: true,
      workDetails: [row('Foundation', 'w1', 40), row('Roof', null, 72.5)],
    };
    const { result } = renderHook(() => useProgressivePrefill('insp-1'));

    expect(
      result.current.buildSeedRows([
        { constructionWorkItemId: 'w1', workItemName: 'x' },
        { constructionWorkItemId: null, workItemName: ' roof ' },
      ]),
    ).toMatchObject([
      { workItemName: 'Foundation', previousProgressPct: 40, currentProgressPct: 40 },
      { workItemName: 'Roof', previousProgressPct: 72.5, currentProgressPct: 72.5 },
    ]);
  });

  it('seeds the summary with current = previous = the prior summary figure', () => {
    state.data = { isFullDetail: false, workDetails: null, summaryCurrentProgressPct: 35 };
    const { result } = renderHook(() => useProgressivePrefill('insp-1'));

    expect(result.current.buildSeedRows()).toEqual([
      expect.objectContaining({ previousProgressPct: 35, currentProgressPct: 35 }),
    ]);
    expect(result.current.summaryPreviousProgressPct).toBe(35);
  });

  it('seeds 0 and 0 for a summary with no prior figure', () => {
    state.data = { isFullDetail: false, workDetails: null, summaryCurrentProgressPct: null };
    const { result } = renderHook(() => useProgressivePrefill('insp-1'));

    expect(result.current.buildSeedRows()).toEqual([
      expect.objectContaining({ previousProgressPct: 0, currentProgressPct: 0 }),
    ]);
  });

  it('returns no seeds while the prior details are not there', () => {
    const { result } = renderHook(() => useProgressivePrefill('insp-1'));
    expect(result.current.buildSeedRows()).toBeNull();
  });
});
