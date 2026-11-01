import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import StaffDisplay from './StaffDisplay';
import type { InternalStaff } from '../types/administration';

const staff = (over: Partial<InternalStaff> = {}): InternalStaff => ({
  id: 'u-1',
  employeeId: 'E0042',
  name: 'Somying Rakngan',
  email: '',
  department: 'Valuation',
  avatar: null,
  currentWorkload: 2,
  ...over,
});

describe('StaffDisplay: the code beside the name', () => {
  it('shows the employee id', () => {
    render(<StaffDisplay staff={staff()} />);
    expect(screen.getByText('(E0042)')).toBeInTheDocument();
  });

  it('falls back to the id when there is no employee id', () => {
    render(<StaffDisplay staff={staff({ employeeId: '' })} />);
    expect(screen.getByText('(u-1)')).toBeInTheDocument();
  });
});

describe('StaffDisplay: the card', () => {
  it('is a plain card with the change button, and a × only when the caller can clear it', () => {
    const { container, rerender } = render(<StaffDisplay staff={staff()} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'administration.changeStaff' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'administration.clearSelection' })).toBeNull();
    expect(container.innerHTML).not.toContain('bg-(--palette-accent-wash)');

    rerender(<StaffDisplay staff={staff()} onClear={() => {}} />);
    expect(
      screen.getByRole('button', { name: 'administration.clearSelection' }),
    ).toBeInTheDocument();
  });
});

describe('StaffDisplay: the details line and the workload', () => {
  it('lists position, department, phone and email, leaving out what is empty', () => {
    render(
      <StaffDisplay
        staff={staff({ position: 'Senior Appraiser', phone: '', email: 's@bank.example' })}
      />,
    );

    const line = screen.getByText('Senior Appraiser').parentElement!;
    // A dot between neighbours only: none leading, trailing or doubled by the empty phone.
    expect(line.textContent).toBe('Senior Appraiser·Valuation·s@bank.example');
    expect(screen.queryByText('02-123-4567')).toBeNull();
  });

  it('has no details line when all four are empty', () => {
    const { container } = render(
      <StaffDisplay staff={staff({ department: '', position: '', phone: '', email: '' })} />,
    );

    expect(container.querySelector('.mt-0\\.5')).toBeNull();
  });

  it('shows the workload only when it is a real number', () => {
    const { rerender } = render(<StaffDisplay staff={staff({ currentWorkload: 0 })} />);
    expect(screen.getByText('administration.workload')).toBeInTheDocument();

    rerender(<StaffDisplay staff={staff({ currentWorkload: undefined })} />);
    expect(screen.queryByText('administration.workload')).toBeNull();
  });
});
