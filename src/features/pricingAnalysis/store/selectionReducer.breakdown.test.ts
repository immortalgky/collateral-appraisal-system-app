import { describe, expect, it } from 'vitest';
import { approachMethodReducer, type SelectionState } from './selectionReducer';
import type { Approach, Method } from '../types/selection';

const method = (over: Partial<Method> = {}): Method => ({
  id: 'm1',
  methodType: 'WQS_COST',
  label: 'WQS',
  icon: 'scale-balanced',
  appraisalValue: 600_000,
  isIncluded: true,
  isSelected: true,
  role: 'LandAndBuilding',
  useSystemCalc: false,
  landRatePerSqWa: 1000,
  buildingValue: 500_000,
  ...over,
});

const approach = (m: Method): Approach =>
  ({ approachType: 'COSTAPPR', isSelected: true, appraisalValue: 0, methods: [m] }) as Approach;

const stateWith = (m: Method): SelectionState =>
  ({
    viewMode: 'summary',
    editDraft: [],
    editSaved: [],
    summarySelected: [approach(m)],
    systemCalculationMode: 'FillIn',
    dirtyManualValueKeys: [],
    dirtyCostBreakdownKeys: ['m1'],
    dirtyMethodRemarkKeys: [],
    dirtyMethodApproachTypes: [],
    dirtyApproachSelection: false,
  }) as unknown as SelectionState;

const init = (state: SelectionState, server: Method) =>
  approachMethodReducer(state, {
    type: 'INIT',
    payload: { approaches: [approach(server)] },
  });

describe('INIT and a dirty land-rate breakdown', () => {
  it('keeps the typed rate and building while the method stays manual', () => {
    const next = init(
      stateWith(method({ landRatePerSqWa: 2000, buildingValue: 700_000 })),
      method({ landRatePerSqWa: 1000, buildingValue: 500_000 }),
    );
    const m = next.summarySelected[0].methods[0];
    expect(m.landRatePerSqWa).toBe(2000);
    expect(m.buildingValue).toBe(700_000);
    expect(next.dirtyCostBreakdownKeys).toEqual(['m1']);
  });

  it('drops the dirty key for a method that flipped System/Manual', () => {
    const next = init(stateWith(method()), method({ useSystemCalc: true, landRatePerSqWa: null }));
    expect(next.dirtyCostBreakdownKeys).toEqual([]);
    expect(next.summarySelected[0].methods[0].landRatePerSqWa).toBeNull();
  });
});

describe('SUMMARY_REVERT_METHOD_BREAKDOWN (Escape after an edit already dispatched)', () => {
  const edited = () =>
    approachMethodReducer(stateWith(method()), {
      type: 'SUMMARY_UPDATE_METHOD_LAND_RATE',
      payload: {
        approachType: 'COSTAPPR',
        methodType: 'WQS_COST',
        methodId: 'm1',
        rate: 2000,
        buildingValue: 700_000,
      },
    });
  const revert = (state: SelectionState, keep: boolean) =>
    approachMethodReducer(state, {
      type: 'SUMMARY_REVERT_METHOD_BREAKDOWN',
      payload: {
        approachType: 'COSTAPPR',
        methodType: 'WQS_COST',
        methodId: 'm1',
        rate: 1000,
        buildingValue: 500_000,
        price: 600_000,
        keepBreakdownDirty: keep,
        keepValueDirty: keep,
      },
    });

  it('restores the method and drops the dirty marks the edit added', () => {
    const start = { ...edited(), dirtyManualValueKeys: ['m1'] };
    const next = revert(start, false);
    const m = next.summarySelected[0].methods[0];
    expect([m.landRatePerSqWa, m.buildingValue, m.appraisalValue]).toEqual([
      1000, 500_000, 600_000,
    ]);
    expect(next.dirtyCostBreakdownKeys).toEqual([]);
    expect(next.dirtyManualValueKeys).toEqual([]);
  });

  it('keeps the marks the method already had before the edit', () => {
    const next = revert({ ...edited(), dirtyManualValueKeys: ['m1'] }, true);
    expect(next.dirtyCostBreakdownKeys).toEqual(['m1']);
    expect(next.dirtyManualValueKeys).toEqual(['m1']);
  });
});

describe('SUMMARY_SET_METHOD_ROLE (the chip mirrored locally)', () => {
  it('updates the method role before the refetch lands', () => {
    const next = approachMethodReducer(stateWith(method({ role: 'Land' })), {
      type: 'SUMMARY_SET_METHOD_ROLE',
      payload: { approachType: 'COSTAPPR', methodType: 'WQS_COST', role: 'LandAndBuilding' },
    });
    expect(next.summarySelected[0].methods[0].role).toBe('LandAndBuilding');
  });
});

describe('the approach total follows every selected Cost method', () => {
  // Land (m1) and Building (m2) are both ticked: the Cost approach is worth their sum.
  const twoSelected = (): SelectionState => {
    const state = stateWith(method());
    return {
      ...state,
      summarySelected: [
        {
          approachType: 'COSTAPPR',
          isSelected: true,
          appraisalValue: 900_000,
          methods: [
            method({ id: 'm1', appraisalValue: 600_000 }),
            method({ id: 'm2', methodType: 'BC', role: 'Building', appraisalValue: 300_000 }),
          ],
        },
      ],
    } as unknown as SelectionState;
  };

  it('a revert recomputes the total as the sum, not the first method', () => {
    const next = approachMethodReducer(twoSelected(), {
      type: 'SUMMARY_REVERT_METHOD_BREAKDOWN',
      payload: {
        approachType: 'COSTAPPR',
        methodType: 'WQS_COST',
        methodId: 'm1',
        rate: 1000,
        price: 650_000,
        keepBreakdownDirty: false,
        keepValueDirty: false,
      },
    });
    expect(next.summarySelected[0].appraisalValue).toBe(950_000);
  });

  it('a typed price recomputes the total as the sum, not the first method', () => {
    const next = approachMethodReducer(twoSelected(), {
      type: 'SUMMARY_UPDATE_METHOD_VALUE',
      payload: { approachType: 'COSTAPPR', methodType: 'BC', value: 350_000, methodId: 'm2' },
    });
    expect(next.summarySelected[0].appraisalValue).toBe(950_000);
  });
});

describe('SUMMARY_SELECT_METHOD in a Cost approach deselects by coverage (mirrors BE)', () => {
  const costState = (...methods: Method[]): SelectionState =>
    ({
      ...stateWith(methods[0]),
      summarySelected: [{ ...approach(methods[0]), methods }],
    }) as SelectionState;
  const m = (id: string, role: Method['role'], isSelected: boolean): Method =>
    method({ id, methodType: id, role, isSelected, appraisalValue: 100 });
  const pick = (state: SelectionState, methodType: string) =>
    approachMethodReducer(state, {
      type: 'SUMMARY_SELECT_METHOD',
      payload: { approachType: 'COSTAPPR', methodType },
    })
      .summarySelected[0].methods.filter(x => x.isSelected)
      .map(x => x.methodType);

  it('LandAndBuilding replaces the selected Land and Building methods', () => {
    expect(
      pick(
        costState(
          m('L', 'Land', true),
          m('B', 'Building', true),
          m('LB', 'LandAndBuilding', false),
        ),
        'LB',
      ),
    ).toEqual(['LB']);
  });

  it('LandAndBuilding leaves a Machinery method alone', () => {
    expect(
      pick(
        costState(
          m('M', 'Machinery', true),
          m('B', 'Building', true),
          m('LB', 'LandAndBuilding', false),
        ),
        'LB',
      ),
    ).toEqual(['M', 'LB']);
  });

  it('Building does not drop a selected LandAndBuilding (the backend rejects the pair)', () => {
    expect(
      pick(costState(m('LB', 'LandAndBuilding', true), m('B', 'Building', false)), 'B'),
    ).toEqual(['LB', 'B']);
  });

  it('a same-role method still swaps, and a role-less sibling is left alone', () => {
    expect(
      pick(costState(m('L1', 'Land', true), m('N', null, true), m('L2', 'Land', false)), 'L2'),
    ).toEqual(['N', 'L2']);
  });
});

describe('CALCULATION_SAVE approach value', () => {
  const state = (): SelectionState => {
    const l = method({ id: 'm1', methodType: 'L', role: 'Land', appraisalValue: 100 });
    const b = method({ id: 'm2', methodType: 'B', role: 'Building', appraisalValue: 200 });
    return {
      ...stateWith(l),
      summarySelected: [{ ...approach(l), appraisalValue: 300, methods: [l, b] }],
    } as SelectionState;
  };
  const save = (s: SelectionState, methodType: string, appraisalValue: number) =>
    approachMethodReducer(s, {
      type: 'CALCULATION_SAVE',
      payload: { approachType: 'COSTAPPR', methodType, appraisalValue },
    }).summarySelected[0];

  it('sums every selected Cost method, not just the first', () => {
    expect(save(state(), 'B', 250).appraisalValue).toBe(350);
  });

  it('keeps the approach value while no method is selected', () => {
    const s = state();
    s.summarySelected[0].methods.forEach(x => (x.isSelected = false));
    expect(save(s, 'B', 250).appraisalValue).toBe(300);
  });
});
