import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { assignmentFormDefaults, makeAssignmentFormSchema } from './administration';

// A key-echo t, so a message is asserted by its key.
const schema = makeAssignmentFormSchema(
  ((key: string) => key) as unknown as TFunction<'appraisal'>,
);

const issues = (over: Partial<typeof assignmentFormDefaults>) => {
  const result = schema.safeParse({ ...assignmentFormDefaults, ...over });
  return result.success ? [] : result.error.issues.map(i => [i.path.join('.'), i.message]);
};

describe('assignment form schema', () => {
  it('puts the missing company of a manual external pick on companyId (under the company picker)', () => {
    expect(
      issues({ assignmentType: 'external', assignmentMethod: 'manual', companyId: null }),
    ).toContainEqual(['companyId', 'validation.selectCompany']);
  });

  it('puts the missing staff of a manual internal pick on staffId', () => {
    expect(
      issues({ assignmentType: 'internal', assignmentMethod: 'manual', staffId: null }),
    ).toContainEqual(['staffId', 'validation.selectAssignee']);
  });

  it('caps the remark at 4000 with its own message', () => {
    const ok = { assignmentType: 'external', assignmentMethod: 'roundrobin' } as const;
    expect(issues({ ...ok, remarks: 'x'.repeat(4000) })).toEqual([]);
    expect(issues({ ...ok, remarks: 'x'.repeat(4001) })).toEqual([
      ['remarks', 'validation.remarksMaxLength'],
    ]);
  });
});
