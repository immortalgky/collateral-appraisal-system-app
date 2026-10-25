import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import {
  assignmentFormDefaults,
  makeAssignmentFormSchema,
  ASSIGNMENT_REMARKS_MAX,
} from './administration';
import { computeSlipChecks } from '../components/administration/slipChecks';

/**
 * The over-long remark message in real text (the sibling tests echo keys, which cannot show the
 * limit): every language names the limit, and none leaves "{{max}}" in the sentence.
 */

beforeAll(async () => {
  await i18n.loadNamespaces(['appraisal']);
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe.each(['en', 'th', 'zh'])('remark limit message (%s)', lng => {
  const text = async () => {
    await i18n.changeLanguage(lng);
    return i18n.getFixedT(lng, 'appraisal');
  };

  it('the form error names the limit', async () => {
    const t = await text();
    const result = makeAssignmentFormSchema(t).safeParse({
      ...assignmentFormDefaults,
      assignmentType: 'external',
      assignmentMethod: 'roundrobin',
      remarks: 'x'.repeat(ASSIGNMENT_REMARKS_MAX + 1),
    });
    const message = result.success ? '' : result.error.issues[0].message;
    expect(message).toContain('4000');
    expect(message).not.toContain('{{');
  });

  it('the slip check and its block reason name the limit', async () => {
    const t = await text();
    const result = computeSlipChecks({
      assignmentType: 'external',
      assignmentMethod: 'roundrobin',
      staffId: null,
      companyId: null,
      followupStaffMethod: 'roundrobin',
      followupStaffId: null,
      remarksTooLong: true,
      hasWorkflowTask: true,
      isTaskOwner: true,
      isLockedByQuotation: false,
      lockedQuotation: null,
      quotationStatus: null,
      quotationWinnerReady: false,
      feeStatus: 'ready',
      revealed: {},
      submitted: false,
    });
    const check = result.checks.find(c => c.id === 'remarks')!;
    const label = t(check.labelKey, check.labelParams);
    const reason = t(result.blockReason!, result.blockParams);
    for (const message of [label, reason]) {
      expect(message).toContain('4000');
      expect(message).not.toContain('{{');
    }
  });
});
