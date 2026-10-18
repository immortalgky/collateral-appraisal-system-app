import { describe, expect, it } from 'vitest';
import {
  additionalConfigurationForSave,
  combineUsage,
  listUsesSameAssignee,
  withSameAssignee,
} from './sameAssignee';

const TOKEN = 'same_assignee_as_activity';

describe('listUsesSameAssignee', () => {
  it('is true when the override list has the token (any case)', () => {
    expect(listUsesSameAssignee(['manual', 'Same_Assignee_As_Activity'], '', [])).toBe(true);
  });

  it('is false when the override list lacks the token, even if the definition has it', () => {
    expect(listUsesSameAssignee(['round_robin'], '', [TOKEN])).toBe(false);
  });

  it('is false for an empty list with a specific assignee (engine uses Manual)', () => {
    expect(listUsesSameAssignee([], 'user1', [TOKEN])).toBe(false);
  });

  it('defers to the definition for an empty list', () => {
    expect(listUsesSameAssignee([], '', [TOKEN])).toBe(true);
    expect(listUsesSameAssignee([], '  ', ['round_robin'])).toBe(false);
  });

  it('is unknown for an empty list when the definition is not loaded', () => {
    expect(listUsesSameAssignee([], '', undefined)).toBeNull();
  });
});

describe('combineUsage', () => {
  it('is true if any list uses it, or for the follow-up step', () => {
    expect(combineUsage([false, true], false)).toBe(true);
    expect(combineUsage([null, true], false)).toBe(true);
    expect(combineUsage([false, false], true)).toBe(true);
  });

  it('is unknown when no list uses it but one is unknown', () => {
    expect(combineUsage([false, null], false)).toBeNull();
  });

  it('is false only when every list is known unused', () => {
    expect(combineUsage([false, false], false)).toBe(false);
  });
});

describe('withSameAssignee', () => {
  it('sets only its key and keeps the others', () => {
    expect(withSameAssignee({ other: 1 }, 'a')).toEqual({ other: 1, sameAssigneeAsActivity: 'a' });
  });

  it('removes only its key', () => {
    expect(withSameAssignee({ other: 1, sameAssigneeAsActivity: 'a' }, '')).toEqual({ other: 1 });
  });

  it('returns null when the bag ends up empty', () => {
    expect(withSameAssignee({ sameAssigneeAsActivity: 'a' }, '')).toBeNull();
    expect(withSameAssignee(null, '')).toBeNull();
  });

  it('does not mutate its input', () => {
    const bag = { sameAssigneeAsActivity: 'a' };
    withSameAssignee(bag, '');
    expect(bag).toEqual({ sameAssigneeAsActivity: 'a' });
  });
});

describe('additionalConfigurationForSave', () => {
  const bag = { other: 1, sameAssigneeAsActivity: 'a' };

  it('drops the key when known unused', () => {
    expect(additionalConfigurationForSave(bag, false, 'a')).toEqual({ other: 1 });
  });

  it('keeps the key when unknown', () => {
    expect(additionalConfigurationForSave(bag, null, 'a')).toEqual(bag);
  });

  it('trims a text value when in effect', () => {
    expect(additionalConfigurationForSave(bag, true, 'b')).toEqual({
      other: 1,
      sameAssigneeAsActivity: 'b',
    });
  });

  it('keeps a non-string value as-is when not known unused', () => {
    const numeric = { sameAssigneeAsActivity: 7 };
    expect(additionalConfigurationForSave(numeric, true, '7')).toBe(numeric);
  });
});
