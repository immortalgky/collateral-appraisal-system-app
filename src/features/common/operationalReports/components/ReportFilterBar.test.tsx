import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ReportFilterBar from './ReportFilterBar';

describe('date range chip', () => {
  const renderBar = (values: object, onChange = vi.fn()) => {
    render(
      <ReportFilterBar
        filters={['approvedFrom', 'approvedTo']}
        values={values}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );
    return onChange;
  };

  it('shows one merged chip and clears both bounds', async () => {
    const onChange = renderBar({ approvedFrom: '2026-11-23', approvedTo: '2026-11-24' });
    expect(screen.getByText('Approved Date: 23/11/2026 \u2013 24/11/2026')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /^Clear Approved Date/ }));
    expect(onChange).toHaveBeenCalledWith({ approvedFrom: undefined, approvedTo: undefined });
  });

  it('shows from / to wording for a single bound', () => {
    renderBar({ approvedTo: '2026-11-24' });
    expect(screen.getByText('Approved Date: to 24/11/2026')).toBeTruthy();
  });

  it('renders one range control per pair', () => {
    renderBar({});
    expect(screen.getAllByText('Approved Date')).toHaveLength(1);
  });
});
