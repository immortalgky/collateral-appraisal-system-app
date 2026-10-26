import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import SearchCompanyModal from './SearchCompanyModal';
import SearchStaffModal from './SearchStaffModal';

/** The two pickers' own texts (title, search, states, counts, buttons) come from the Thai locale. */

const staff = {
  id: 'u1',
  employeeId: 'E0042',
  name: 'Staff Person',
  email: '',
  department: 'Valuation',
  avatar: null,
  currentWorkload: 3,
};
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
};

beforeAll(async () => {
  await i18n.loadNamespaces(['appraisal', 'common']);
  await i18n.changeLanguage('th');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

const noop = vi.fn();

describe('SearchStaffModal in Thai', () => {
  it('titles, searches, counts and buttons come from the locale', () => {
    render(<SearchStaffModal isOpen onClose={noop} onSelect={noop} eligibleStaff={[staff]} />);

    expect(screen.getByText('เลือกเจ้าหน้าที่')).toBeInTheDocument();
    expect(screen.getByLabelText('ค้นหาจากชื่อ รหัสพนักงาน หรือฝ่าย...')).toBeInTheDocument();
    expect(screen.getByText('3 งาน')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เลือก' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument();
  });

  it('has Thai loading and empty states', () => {
    const { rerender } = render(
      <SearchStaffModal isOpen onClose={noop} onSelect={noop} eligibleStaff={undefined} />,
    );
    expect(screen.getByText('กำลังโหลดรายชื่อเจ้าหน้าที่...')).toBeInTheDocument();

    rerender(<SearchStaffModal isOpen onClose={noop} onSelect={noop} eligibleStaff={[]} />);
    expect(screen.getByText('ไม่พบเจ้าหน้าที่ที่ตรงกับคำค้นหา')).toBeInTheDocument();
  });
});

describe('SearchCompanyModal in Thai', () => {
  it('titles, searches, counts and buttons come from the locale', () => {
    render(
      <SearchCompanyModal isOpen onClose={noop} onSelect={noop} eligibleCompanies={[company]} />,
    );

    expect(screen.getByText('เลือกบริษัทภายนอก')).toBeInTheDocument();
    expect(
      screen.getByLabelText('ค้นหาจากชื่อบริษัท เลขทะเบียน หรือผู้ติดต่อ...'),
    ).toBeInTheDocument();
    expect(screen.getByText('2 งานที่กำลังทำ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เลือก' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument();
  });

  it('has Thai loading, empty and MOU states', () => {
    const { rerender } = render(
      <SearchCompanyModal isOpen onClose={noop} onSelect={noop} eligibleCompanies={undefined} />,
    );
    expect(screen.getByText('กำลังโหลดรายชื่อบริษัท...')).toBeInTheDocument();

    rerender(<SearchCompanyModal isOpen onClose={noop} onSelect={noop} eligibleCompanies={[]} />);
    expect(screen.getByText('ไม่พบบริษัทที่ตรงกับคำค้นหา')).toBeInTheDocument();

    rerender(
      <SearchCompanyModal
        isOpen
        onClose={noop}
        onSelect={noop}
        eligibleCompanies={[{ ...company, isAssignable: false }]}
      />,
    );
    expect(screen.getByText('MOU ไม่ใช้งาน')).toBeInTheDocument();
  });
});
