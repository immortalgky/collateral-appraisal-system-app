import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { TaskFilterDialog } from './TaskFilterDialog';

const range = { appointmentFrom: '2026-10-01', appointmentTo: '2026-10-07' };

const setup = (initialValues = range) => {
  const onApply = vi.fn();
  const utils = render(
    <TaskFilterDialog open initialValues={initialValues} onApply={onApply} onClose={vi.fn()} />,
  );
  return { onApply, ...utils };
};

describe('TaskFilterDialog date range', () => {
  it('shows the active range (of the three the filters hold) as its one range, and applies it back unchanged', async () => {
    const { onApply, user } = setup();
    expect(screen.getAllByText(/Appointment Date/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const applied = onApply.mock.calls[0][0];
    expect(applied).toMatchObject({
      dateType: 'appointment',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-07',
    });
    // the three ranges are not left beside it
    expect(applied).not.toHaveProperty('appointmentFrom');
  });

  it('applies the other ranges back too: the dialog only shows the first', async () => {
    const { onApply, user } = setup({ ...range, requestedFrom: '2026-08-01' } as typeof range);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply.mock.calls[0][0]).toMatchObject({
      dateType: 'appointment',
      requestedFrom: '2026-08-01',
    });
  });

  it('clears the range with Clear dates', async () => {
    const { onApply, user } = setup();
    await user.click(screen.getByRole('button', { name: /Clear dates/ }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const applied = onApply.mock.calls[0][0];
    expect(applied.dateFrom).toBeUndefined();
    expect(applied.dateTo).toBeUndefined();
    expect(applied).not.toHaveProperty('appointmentFrom');
  });
});
