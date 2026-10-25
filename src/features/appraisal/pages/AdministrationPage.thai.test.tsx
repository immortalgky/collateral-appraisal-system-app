import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import AdministrationPage from './AdministrationPage';

/**
 * The made-assignment view in real Thai (the sibling test echoes keys, which cannot show the
 * interpolated name and employee code). Importing the real i18n here is why this is its own file.
 */

// Stable identities: a hook returning a fresh array each render would re-run the page's effects forever.
const data = vi.hoisted(() => ({
  none: [] as unknown[],
  request: {},
  assignments: [
    {
      id: 'as-1',
      appraisalId: 'A1',
      assignmentType: 'Internal',
      assignmentStatus: 'Assigned',
      assignmentMethod: 'Manual',
      assigneeUserId: 'u1',
      assigneeCompanyId: null,
      internalAppraiserId: null,
      internalFollowupAssignmentMethod: null,
      remark: null,
      draftSavedAt: null,
      assignedAt: '2026-10-21T09:30:00',
      assignedBy: 'E0001',
      assignedByName: 'Somchai Jaidee',
    },
  ],
  staff: [
    {
      id: 'u1',
      employeeId: 'E0042',
      name: 'Staff Person',
      email: '',
      department: 'Valuation',
      avatar: null,
      currentWorkload: 1,
    },
  ],
}));

vi.mock('@/features/appraisal/context/AppraisalContext', () => ({
  useAppraisalId: () => 'A1',
  useAppraisalRequestId: () => 'R1',
  useIsTaskOwner: () => true,
  useWorkflowInstanceId: () => 'W1',
  useAppraisalContextSafe: () => null,
}));
vi.mock('@/features/request/api', () => ({
  useGetRequestById: () => ({
    data: data.request,
    isLoading: false,
    isError: false,
    isFetching: false,
  }),
}));
vi.mock('@/features/quotation/api/quotation', () => ({
  useGetQuotationById: () => ({ data: undefined }),
}));
vi.mock('@shared/api/systemConfiguration', async importOriginal => ({
  ...(await importOriginal<typeof import('@shared/api/systemConfiguration')>()),
  useSystemConfiguration: () => ({ data: null, isLoading: false, isFetching: false }),
}));
vi.mock('../api/administration', () => ({
  useCreateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveAssignmentDraft: () => ({ mutate: vi.fn(), isPending: false }),
  useGetAppraisalQuotations: () => ({ data: data.none, isError: false, isFetching: false }),
  useGetAssignment: () => ({ data: data.assignments, isLoading: false, isFetching: false }),
  useGetAssignmentDefaults: () => ({ data: undefined, isFetching: false }),
  useGetCompanyById: () => ({ data: undefined, isFetching: false }),
  useGetEligibleCompanies: () => ({ data: data.none }),
  useGetEligibleStaff: () => ({ data: data.staff }),
  useGetUserById: () => ({ data: undefined }),
}));
vi.mock('../components/SearchCompanyModal', () => ({ default: () => null }));
vi.mock('../components/SearchStaffModal', () => ({ default: () => null }));
vi.mock('../components/QuotationSection', () => ({ default: () => null }));
vi.mock('../components/QuotationEntryModal', () => ({ default: () => null }));
vi.mock('../components/AssignmentFeeCard', () => ({ default: () => null }));
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

beforeAll(async () => {
  await i18n.loadNamespaces(['appraisal', 'common']);
  await i18n.changeLanguage('th');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('AdministrationPage: read-only view in Thai', () => {
  beforeEach(() =>
    server.use(
      http.get('*/appraisals/:id/fee-preview', () => new HttpResponse(null, { status: 404 })),
    ),
  );

  it('says assigned, shows who assigned (name and code) and offers no action', async () => {
    render(<AdministrationPage />);

    // The slip is in the rail and, narrow, at the form's end: two copies, both read-only.
    expect(await screen.findAllByText('มอบหมายแล้ว')).toHaveLength(2);
    expect(screen.getAllByText('โดย Somchai Jaidee (E0001)')).toHaveLength(2);
    // The assignee: the staff card (name and code in separate spans) and both slips, "Name (code)".
    expect(screen.getByText('Staff Person', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getAllByText('Staff Person (E0042)')).toHaveLength(2);

    for (const name of ['มอบหมาย', 'บันทึกฉบับร่าง', 'ยกเลิก']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});
