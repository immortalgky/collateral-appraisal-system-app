import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ExternalCompany, InternalStaff } from '../types/administration';
import SearchCompanyModal from './SearchCompanyModal';
import CompanyDisplay from './CompanyDisplay';
import SearchStaffModal from './SearchStaffModal';

/** The test i18n returns keys, so texts are asserted by key. */

const company = {
  id: 'c1',
  companyName: 'Acme Appraisal',
  companyNameLocal: null,
  registrationNo: '123',
  contactPerson: 'Contact',
  contactPhone: '0800000000',
  contactEmail: 'c@example.com',
  rating: 4,
  activeAssignments: 2,
} as ExternalCompany;

const noop = vi.fn();

const BADGE = 'administration.previousCompany.badge {n: 3}';

const renderCompanies = (companies: ExternalCompany[], previousCompanyId?: string) =>
  render(
    <SearchCompanyModal
      isOpen
      onClose={noop}
      onSelect={noop}
      eligibleCompanies={companies}
      previousCompany={previousCompanyId ? { id: previousCompanyId, badge: BADGE } : null}
    />,
  );

describe('SearchCompanyModal rows', () => {
  it('shows only what exists: no "()" for a missing registration, no stars or contact for empty ones', () => {
    renderCompanies([
      { ...company, registrationNo: '', rating: 0, contactPerson: '', contactPhone: '' },
    ]);

    expect(
      screen.queryByText('administration.modal.company.registrationNo'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('()')).not.toBeInTheDocument();
    expect(screen.queryByText(/\(\s*\)/)).not.toBeInTheDocument();
    expect(screen.queryByText('(0.0)')).not.toBeInTheDocument();
    expect(screen.queryByText('0800000000')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('#star');
  });

  it('shows registration, rating and contact when they exist', () => {
    renderCompanies([company]);

    expect(screen.getByText('administration.modal.company.registrationNo')).toBeInTheDocument();
    expect(screen.getByText('(4.0)')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('0800000000')).toBeInTheDocument();
  });

  it('tags only the previous company with the previous-company badge', () => {
    renderCompanies([company, { ...company, id: 'c2', companyName: 'Other Co' }], 'c2');

    const badges = screen.getAllByText(BADGE);
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('button')).toHaveTextContent('Other Co');
  });

  it('shows exactly the badge text the page passes', () => {
    renderCompanies([company], 'c1');

    expect(screen.getByText(BADGE)).toBeInTheDocument();
  });

  it('has no previous-company badge when none matches or none is passed', () => {
    renderCompanies([company], 'someone-else');
    expect(screen.queryByText(BADGE)).not.toBeInTheDocument();
    expect(screen.queryByText(/previousCompany\.badge/)).not.toBeInTheDocument();
  });

  it('does not let an MOU-expired company be selected', async () => {
    const { user } = renderCompanies([{ ...company, isAssignable: false }]);

    const row = screen.getByRole('button', { name: /Acme Appraisal/ });
    expect(row).toBeDisabled();
    expect(screen.getByText('administration.modal.company.mouExpired')).toBeInTheDocument();

    await user.click(row);
    expect(row).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'administration.modal.select' })).toBeDisabled();
  });

  it('lets an assignable company be selected', async () => {
    const { user } = renderCompanies([company]);

    await user.click(screen.getByRole('button', { name: /Acme Appraisal/ }));
    expect(screen.getByRole('button', { name: 'administration.modal.select' })).toBeEnabled();
  });
});

describe('SearchStaffModal rows', () => {
  const staff = {
    id: 'u1',
    employeeId: 'E0042',
    name: 'Staff Person',
    email: '',
    department: 'Valuation',
    avatar: null,
    currentWorkload: 3,
  } as InternalStaff;

  const renderStaff = (s: InternalStaff) =>
    render(<SearchStaffModal isOpen onClose={noop} onSelect={noop} eligibleStaff={[s]} />);

  it('joins the code and the department with a dot', () => {
    renderStaff(staff);

    expect(screen.getByText('administration.modal.staff.code · Valuation')).toBeInTheDocument();
  });

  it('omits the empty department', () => {
    renderStaff({ ...staff, department: '' });

    expect(screen.getByText('administration.modal.staff.code')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('omits the empty code', () => {
    renderStaff({ ...staff, employeeId: '' });

    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.queryByText(/administration\.modal\.staff\.code/)).not.toBeInTheDocument();
  });

  it('shows no detail line when both are empty', () => {
    renderStaff({ ...staff, employeeId: '', department: '' });

    expect(screen.getByText('Staff Person')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/administration\.modal\.staff\.code/)).not.toBeInTheDocument();
  });
});

describe('CompanyDisplay', () => {
  it('hides the empty registration "()", stars and contact icons', () => {
    render(
      <CompanyDisplay
        company={{ ...company, registrationNo: '', rating: 0, contactPerson: '', contactPhone: '' }}
      />,
    );

    expect(screen.getByText('Acme Appraisal')).toBeInTheDocument();
    expect(screen.queryByText(/\(\s*\)/)).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('#star');
    expect(document.body.innerHTML).not.toContain('#user');
    expect(document.body.innerHTML).not.toContain('#phone');
  });

  it('shows the contact icons when the contact exists, and the previous-company badge when given', () => {
    render(<CompanyDisplay company={company} badge="Previous" />);

    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('0800000000')).toBeInTheDocument();
    expect(document.body.innerHTML).toContain('#user');
    expect(document.body.innerHTML).toContain('#phone');
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });
});
