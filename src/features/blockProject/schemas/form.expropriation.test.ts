import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { projectTowerForm } from './form';

/** The object under any superRefine wrappers. */
const shapeOf = (schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> => {
  let inner = schema;
  while (inner instanceof z.ZodEffects) inner = inner.innerType();
  return (inner as z.ZodObject<z.ZodRawShape>).shape;
};

/** The tower no longer asks "in an expropriation map sheet", but a stored answer must survive a save. */
describe('tower schema: the unasked expropriation map sheet', () => {
  it('still declares isExpropriated and its remark, so zod does not strip them', () => {
    expect(Object.keys(shapeOf(projectTowerForm))).toEqual(
      expect.arrayContaining(['isExpropriated', 'expropriationRemark']),
    );
  });
});
