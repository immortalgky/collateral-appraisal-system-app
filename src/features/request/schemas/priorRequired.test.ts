import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildFormSchema } from '@/shared/components/form';
import { requestFields } from '../configs/fields';
import { createRequestForm } from './form';

// The rule on its own, through the same builder the page's schema uses: the form's other rules would
// keep zod from reaching a conditional rule at all (see collectIssues).
const prior = requestFields.filter(f =>
  ['purpose', 'detail.prevAppraisalReportNo'].includes(f.name),
);
const schema = buildFormSchema(
  prior,
  z.object({
    purpose: z.string(),
    meta: z.object({ priorLocked: z.boolean().optional() }).optional(),
  }),
);
const paths = (values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map(i => i.path.join('.'));
};

describe('the prior appraisal is asked for of a request that is not submitted yet', () => {
  it('a draft or new request with a purpose that uses one needs it', () => {
    expect(paths({ purpose: '02', detail: {} })).toContain('detail.prevAppraisalReportNo');
    expect(paths({ purpose: '02', detail: {}, meta: { priorLocked: false } })).toContain(
      'detail.prevAppraisalReportNo',
    );
  });

  it('a submitted one is not asked: it is locked and cannot be given one', () => {
    expect(paths({ purpose: '02', detail: {}, meta: { priorLocked: true } })).toEqual([]);
  });

  it('a purpose that takes none asks for none either way', () => {
    expect(paths({ purpose: '01', detail: {} })).toEqual([]);
  });

  it('the page schema keeps `meta` in its shape, so the rule can read it', () => {
    // buildFormSchema wraps the object in refinements: go down to it
    let inner: z.ZodTypeAny = createRequestForm;
    while (inner instanceof z.ZodEffects) inner = inner._def.schema;
    expect((inner as z.ZodObject<z.ZodRawShape>).shape.meta).toBeDefined();
  });
});
