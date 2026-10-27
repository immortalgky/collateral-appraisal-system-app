import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@/test/test-utils';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { StateCtx } from '../../store/selectionContext';
import type { SelectionState } from '../../store/selectionReducer';
import type { ManualCostBreakdownContext, Method } from '../../types/selection';
import { ManualCostBreakdown } from './ManualCostBreakdown';

const lbMethod = (over: Partial<Method> = {}): Method => ({
  id: 'm1',
  methodType: 'WQS_COST',
  label: 'WQS',
  icon: 'scale-balanced',
  appraisalValue: 600_000,
  isIncluded: true,
  isSelected: true,
  role: 'LandAndBuilding',
  landRatePerSqWa: 1000,
  buildingValue: 500_000,
  ...over,
});

/** Stands in for the reducer: a land-rate sync writes the figures back onto the method. */
function Harness({
  initial,
  groupBuildingValue = null,
  readOnly = false,
  disabled = false,
  buildingCostValue = null,
  onSync,
  onRevert = vi.fn(),
  onTotal,
}: {
  initial: Method;
  groupBuildingValue?: number | null;
  readOnly?: boolean;
  disabled?: boolean;
  /** The group's Building Cost method value, as the shared hook reads it from the selection state. */
  buildingCostValue?: number | null;
  onSync: ManualCostBreakdownContext['onLandRateSync'];
  onRevert?: ManualCostBreakdownContext['onBreakdownRevert'];
  onTotal: (total: number) => void;
}) {
  const [method, setMethod] = useState(initial);
  const context: ManualCostBreakdownContext = {
    landAreaInSqWa: 100,
    buildingValue: groupBuildingValue,
    onLandRateSync: arg => {
      onSync(arg);
      setMethod(m => ({
        ...m,
        landRatePerSqWa: arg.rate,
        ...(arg.buildingValue !== undefined && { buildingValue: arg.buildingValue }),
      }));
    },
    onBreakdownRevert: arg => {
      onRevert(arg);
      setMethod(m => ({
        ...m,
        landRatePerSqWa: arg.rate,
        ...(arg.buildingValue !== undefined && { buildingValue: arg.buildingValue }),
      }));
    },
  };
  const state = {
    dirtyCostBreakdownKeys: [] as string[],
    dirtyManualValueKeys: [] as string[],
    summarySelected: [
      {
        approachType: 'COSTAPPR',
        methods: [{ methodType: 'BC', appraisalValue: buildingCostValue ?? 0 }],
      },
    ],
  } as unknown as SelectionState;
  return (
    <StateCtx.Provider value={state}>
      <PageReadOnlyContext.Provider value={readOnly}>
        <ManualCostBreakdown
          approachType="COSTAPPR"
          method={method}
          context={context}
          onTotalChange={onTotal}
          disabled={disabled}
        />
      </PageReadOnlyContext.Provider>
    </StateCtx.Provider>
  );
}

const setup = (props: Partial<Parameters<typeof Harness>[0]> & { initial: Method }) => {
  const onSync = vi.fn();
  const onRevert = vi.fn();
  const onTotal = vi.fn();
  const shared = { onSync, onRevert, onTotal };
  const utils = render(<Harness {...shared} {...props} />);
  const rerenderWith = (next: Partial<Parameters<typeof Harness>[0]>) =>
    utils.rerender(<Harness {...shared} {...props} {...next} />);
  return { ...utils, ...shared, rerenderWith };
};

describe('ManualCostBreakdown (Cost LandAndBuilding)', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('pushes a prefilled but unsaved building once a rate exists, then settles', async () => {
    const { onSync, onTotal } = setup({
      initial: lbMethod({ buildingValue: null }),
      groupBuildingValue: 500_000,
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith(
      expect.objectContaining({ rate: 1000, buildingValue: 500_000 }),
    );
    // land 100,000 + building 500,000, to the thousand
    expect(onTotal).toHaveBeenLastCalledWith(600_000);
  });

  it('does not push a prefilled building while there is no rate', async () => {
    const { onSync } = setup({
      initial: lbMethod({ buildingValue: null, landRatePerSqWa: null }),
      groupBuildingValue: 500_000,
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(onSync).not.toHaveBeenCalled();
  });

  it('Escape puts back the input and the price and saves nothing', async () => {
    const { user, onSync, onRevert, onTotal } = setup({ initial: lbMethod() });
    const [rate] = screen.getAllByRole('textbox');

    await user.clear(rate);
    await user.type(rate, '2000');
    expect(onTotal).toHaveBeenLastCalledWith(700_000);

    await user.keyboard('{Escape}');
    // the derived price had reached the reducer, so the revert carries the price from the start
    expect(onRevert).toHaveBeenCalledWith(expect.objectContaining({ price: 600_000 }));
    expect((rate as HTMLInputElement).value).toContain('1,000');

    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(onSync).not.toHaveBeenCalled();
  });

  it('leaves the price alone when a building is typed before any rate', async () => {
    const { user, onTotal } = setup({
      initial: lbMethod({ landRatePerSqWa: null, buildingValue: null }),
    });
    const [, building] = screen.getAllByRole('textbox');

    await user.type(building, '700000');
    expect(onTotal).not.toHaveBeenCalled();
  });

  it('read-only shows only the saved building, never the borrowed one', () => {
    const { unmount } = setup({
      initial: lbMethod({ buildingValue: null }),
      groupBuildingValue: 500_000,
      readOnly: true,
    });
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByText('500,000.00')).toBeNull();
    expect(screen.getByText('-')).toBeTruthy();
    unmount();

    setup({ initial: lbMethod({ buildingValue: 123_456 }), readOnly: true });
    expect(screen.getByText('123,456.00')).toBeTruthy();
  });

  it('puts the original lump back as the rate is typed away to empty', async () => {
    const { user, onTotal } = setup({ initial: lbMethod() });
    const [rate] = screen.getAllByRole('textbox');

    await user.clear(rate);
    expect(onTotal).toHaveBeenLastCalledWith(600_000);

    await user.type(rate, '1234');
    expect(onTotal).toHaveBeenLastCalledWith(623_000);
    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}');
    expect(onTotal).toHaveBeenLastCalledWith(600_000);
  });

  it('shows no total line without a rate, in edit or read-only mode', () => {
    const { unmount } = setup({ initial: lbMethod({ landRatePerSqWa: null }) });
    expect(screen.queryByText(/^manualCost\.total/)).toBeNull();
    unmount();

    const { unmount: unmountReadOnly } = setup({
      initial: lbMethod({ landRatePerSqWa: null }),
      readOnly: true,
    });
    expect(screen.queryByText(/^manualCost\.total/)).toBeNull();
    unmountReadOnly();

    setup({ initial: lbMethod() });
    expect(screen.getByText(/^manualCost\.total/)).toBeTruthy();
  });

  it('Escape after the debounce already pushed reverts the method through the reducer, leaving nothing dirty', async () => {
    const { user, onSync, onRevert } = setup({ initial: lbMethod() });
    const [rate] = screen.getAllByRole('textbox');

    await user.clear(rate);
    await user.type(rate, '2000');
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(onSync).toHaveBeenLastCalledWith(expect.objectContaining({ rate: 2000 }));

    await user.keyboard('{Escape}');
    expect(onRevert).toHaveBeenCalledTimes(1);
    expect(onRevert).toHaveBeenCalledWith(
      expect.objectContaining({
        rate: 1000,
        buildingValue: 500_000,
        price: 600_000,
        // not dirty when the edit began, so the revert drops the marks the edit added
        keepBreakdownDirty: false,
        keepValueDirty: false,
      }),
    );
    expect((rate as HTMLInputElement).value).toContain('1,000');

    const calls = onSync.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(onSync.mock.calls.length).toBe(calls);
  });

  it('Escape dispatches nothing when the edit never reached the reducer', async () => {
    const { user, onSync, onRevert, onTotal } = setup({
      initial: lbMethod({ landRatePerSqWa: null, buildingValue: null }),
      buildingCostValue: 500_000,
    });
    const [, building] = screen.getAllByRole('textbox');

    // no rate, so a typed building changes neither the price nor the breakdown
    await user.type(building, '1');
    await user.keyboard('{Escape}');
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(onSync).not.toHaveBeenCalled();
    expect(onRevert).not.toHaveBeenCalled();
    expect(onTotal).not.toHaveBeenCalled();
    expect((building as HTMLInputElement).value).toContain('500,000');
  });

  it('Escape puts the building back to its start value even after the Building Cost value moved', async () => {
    const { user, rerenderWith } = setup({
      initial: lbMethod({ landRatePerSqWa: null, buildingValue: null }),
      buildingCostValue: 500_000,
    });
    const [, building] = screen.getAllByRole('textbox');
    expect((building as HTMLInputElement).value).toContain('500,000');

    await user.clear(building);
    await user.type(building, '700000');
    rerenderWith({ buildingCostValue: 900_000 });

    await user.keyboard('{Escape}');
    expect((building as HTMLInputElement).value).toContain('500,000');
    expect((building as HTMLInputElement).value).not.toContain('900,000');
  });

  it('read-only derives the land value and total from the saved figures', () => {
    setup({
      initial: lbMethod({ buildingValue: null }),
      groupBuildingValue: 500_000,
      readOnly: true,
    });
    // saved rate 1,000 × 100 sq.wa, and no saved building: 100,000, never the 600,000 a seed would give
    expect(screen.queryByText('600,000')).toBeNull();
    expect(screen.getAllByText('100,000')).toHaveLength(2);
  });

  it('pushes nothing while disabled', async () => {
    const { onSync } = setup({
      initial: lbMethod({ buildingValue: null }),
      groupBuildingValue: 500_000,
      disabled: true,
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(onSync).not.toHaveBeenCalled();
  });
});
