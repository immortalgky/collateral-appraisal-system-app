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
