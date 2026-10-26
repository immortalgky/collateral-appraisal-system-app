import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import i18n from '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import FeeAppointmentApprovalTaskPage from './FeeAppointmentApprovalTaskPage';

/**
 * The fee-type column in real Thai: the page shares the Appointment & Fee page's label key set
 * (feePreview.type.*), not its own English list. The sibling tests echo keys, so this one is separate.
 */

vi.mock('@/features/appraisal/context/AppraisalContext', () => ({
  useWorkflowInstanceId: () => 'W1',
  useIsTaskOwner: () => true,
}));

const line = (id: string, feeCode: string, feeDescription: string, feeAmount: number) => ({
  id,
  lineType: 'Fee',
  targetId: `t-${id}`,
  feeCode,
  feeDescription,
  feeAmount,
  lineStatus: 'Pending',
});

beforeAll(async () => {
  await i18n.loadNamespaces(['appraisal', 'common']);
  await i18n.changeLanguage('th');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('FeeAppointmentApprovalTaskPage: fee types in Thai', () => {
  it('labels the requested fees and the appraisal`s existing fees by type, from the shared keys', async () => {
    server.use(
      http.get('*/workflows/fee-appointment-approvals/by-workflow-instance/:id', () =>
        HttpResponse.json({
          id: 'FA1',
          appraisalId: 'A1',
          requestSource: 'Int',
          status: 'Open',
          raisedAt: '2026-10-20T10:00:00',
          lines: [line('L1', '02', 'Re-inspection', 500), line('L2', '99', 'Travel', 300)],
        }),
      ),
      http.get('*/appraisals/:id/fees', () =>
        HttpResponse.json({
          fees: [
            {
              id: 'F1',
              items: [
                {
                  id: 'I1',
                  feeCode: '01',
                  feeDescription: 'Appraisal fee',
                  feeAmount: 3000,
                  requiresApproval: false,
                },
              ],
            },
          ],
        }),
      ),
    );
    render(<FeeAppointmentApprovalTaskPage />);

    const requested = (await screen.findByText('Re-inspection')).closest('tbody')!;
    expect(within(requested).getByText('ค่าตรวจ')).toBeInTheDocument();
    expect(within(requested).getByText('อื่น ๆ')).toBeInTheDocument();

    // The fee already on the appraisal sits in its own table, labelled the same way.
    const existing = (await screen.findByText('Appraisal fee')).closest('tbody')!;
    expect(within(existing).getByText('ค่าประเมิน')).toBeInTheDocument();
  });
});
