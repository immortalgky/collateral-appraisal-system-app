import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import CompanyDisplay from './CompanyDisplay';
import StaffDisplay from './StaffDisplay';
import type { ExternalCompany, InternalStaff } from '../types/administration';

/**
 * The task counts are plural keys (workload_one / _other): the singular says "1 task". The test
 * i18n echoes keys; importing the real i18n is why this is its own file.
 */
beforeAll(async () => {
  await i18n.loadNamespaces(['appraisal', 'common']);
  await i18n.changeLanguage('en');
});

const staff = (currentWorkload: number) =>
  ({
    id: 'u-1',
    employeeId: 'E0042',
    name: 'Somying Rakngan',
    email: '',
    department: 'Valuation',
    avatar: null,
    currentWorkload,
  }) as InternalStaff;

const company = (activeAssignments: number) =>
  ({
    id: 'c1',
    companyName: 'Acme',
    companyNameLocal: null,
    registrationNo: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    rating: 0,
    activeAssignments,
  }) as ExternalCompany;

describe('workload counts in English', () => {
  it('says "1 task" and "2 tasks"', () => {
    const one = render(<StaffDisplay staff={staff(1)} />);
    expect(screen.getByText('1 task')).toBeInTheDocument();
    one.unmount();

    render(<StaffDisplay staff={staff(2)} />);
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('says "N active" for a company', () => {
    render(<CompanyDisplay company={company(1)} />);
    expect(screen.getByText('1 active')).toBeInTheDocument();
  });
});
