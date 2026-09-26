import { describe, expect, it } from 'vitest';
import { createCondoPMAFormBase } from './form';

/**
 * The condo PMA floor is a text field bound as `string?` by the API. The base schema declared it
 * `z.coerce.number()`, which never validated (buildFormSchema's text-input rule wins) but disagreed
 * with the rule that did — and a numeric floor is exactly what broke the draft with a 400.
 */
describe('condo PMA floorNumber', () => {
  it('keeps the floor a string in the base schema', () => {
    const result = createCondoPMAFormBase.shape.floorNumber.safeParse('5');

    expect(result).toEqual({ success: true, data: '5' });
  });
});
