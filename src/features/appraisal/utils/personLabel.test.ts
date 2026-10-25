import { describe, expect, it } from 'vitest';
import { personLabel } from './personLabel';

describe('personLabel', () => {
  it('writes "Name (code)" when both are known', () => {
    expect(personLabel('Staff Name', 'int.staff2')).toBe('Staff Name (int.staff2)');
  });

  it('is the code alone when there is no name', () => {
    expect(personLabel(null, 'int.staff2')).toBe('int.staff2');
    expect(personLabel(undefined, 'int.staff2')).toBe('int.staff2');
    expect(personLabel('', 'int.staff2')).toBe('int.staff2');
  });

  it('is the name alone only when there is no code', () => {
    expect(personLabel('Staff Name', null)).toBe('Staff Name');
  });

  it('is empty when neither is known', () => {
    expect(personLabel(null, undefined)).toBe('');
  });
});
