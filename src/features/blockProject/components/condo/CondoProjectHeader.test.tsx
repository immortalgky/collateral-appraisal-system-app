import { useMutation } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act, render, screen } from '@/test/test-utils';
import { CALCULATE_MUTATION_KEY } from '../../api/projectUnitPrice';
import { CondoShellContext } from './CondoShellContext';
import { CondoProjectHeader } from './CondoProjectHeader';

let rollup = {
  units: 10,
  sold: 0,
  models: 2,
  pendingModels: 0,
  towers: 1,
  titles: 0,
  landSqWa: 0,
  priced: 10,
  appraisedTotal: 1000,
  forceSaleTotal: 700,
};

vi.mock('./useCondoRollup', () => ({ useCondoRollup: () => rollup }));
vi.mock('../../api/project', () => ({ useGetProject: () => ({ data: { projectName: 'P' } }) }));
vi.mock('@/features/appraisal/context/AppraisalContext', () => ({ useAppraisalId: () => 'a1' }));

const shell = {
  projectType: 'U' as const,
  tabs: [],
  activeTab: 'unit-price',
  onTabChange: () => {},
  focus: false,
  onFocusChange: () => {},
};

/** A calculate mutation held open, as it is while the refetched totals arrive. */
function Recalculating() {
  const { mutate } = useMutation({
    mutationKey: CALCULATE_MUTATION_KEY,
    mutationFn: () => new Promise(() => {}),
  });
  return <button onClick={() => mutate(undefined)}>recalc</button>;
}

const Page = () => (
  <CondoShellContext.Provider value={shell}>
    <Recalculating />
    <CondoProjectHeader />
  </CondoShellContext.Provider>
);

describe('CondoProjectHeader KPI flash', () => {
  it('flashes a tile whose figure a recalculation changed, and no other', async () => {
    rollup = { ...rollup, appraisedTotal: 1000 };
    const { user, rerender } = render(<Page />);
    expect(document.querySelector('[data-flash]')).toBeNull(); // first load

    await user.click(screen.getByText('recalc'));
    rollup = { ...rollup, appraisedTotal: 1200 };
    await act(async () => rerender(<Page />));

    const flashed = document.querySelectorAll('[data-flash]');
    expect(flashed).toHaveLength(1);
    expect(flashed[0]).toHaveTextContent('฿1,200');
  });

  it('does not flash a change that is not part of a recalculation', async () => {
    rollup = { ...rollup, appraisedTotal: 1000 };
    const { rerender } = render(<Page />);
    rollup = { ...rollup, units: 11 };
    await act(async () => rerender(<Page />));
    expect(document.querySelector('[data-flash]')).toBeNull();
  });
});
