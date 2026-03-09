import { describe, it, expect } from 'vitest';
import {
  getNestedValue,
  resolveFieldPath,
  evaluateCondition,
  evaluateConditions,
  setNestedValue,
} from './conditions';
import type { FieldCondition, FieldConditions } from './types';

// =============================================================================
// getNestedValue
// =============================================================================

describe('getNestedValue', () => {
  it('returns flat key value', () => {
    expect(getNestedValue({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('returns dotted path value', () => {
    expect(getNestedValue({ address: { city: 'Bangkok' } }, 'address.city')).toBe('Bangkok');
  });

  it('returns bracket notation value', () => {
    const obj = { items: [{ name: 'first' }, { name: 'second' }] };
    expect(getNestedValue(obj, 'items[0].name')).toBe('first');
    expect(getNestedValue(obj, 'items[1].name')).toBe('second');
  });

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined();
    expect(getNestedValue({ a: { b: 1 } }, 'a.c')).toBeUndefined();
    expect(getNestedValue({}, 'x.y.z')).toBeUndefined();
  });

  it('returns undefined when traversing through a primitive', () => {
    expect(getNestedValue({ a: 42 }, 'a.b')).toBeUndefined();
  });
});

// =============================================================================
// resolveFieldPath
// =============================================================================

describe('resolveFieldPath', () => {
  it('returns plain field name when no prefix', () => {
    expect(resolveFieldPath('status', '')).toBe('status');
  });

  it('strips $root. prefix', () => {
    expect(resolveFieldPath('$root.globalField', 'items')).toBe('globalField');
    expect(resolveFieldPath('$root.globalField', '')).toBe('globalField');
  });

  it('builds relative path with prefix and index', () => {
    expect(resolveFieldPath('city', 'addresses', 2)).toBe('addresses.2.city');
  });

  it('builds relative path with prefix only (no index)', () => {
    expect(resolveFieldPath('city', 'addresses')).toBe('addresses.city');
  });
});

// =============================================================================
// evaluateCondition
// =============================================================================

describe('evaluateCondition', () => {
  const vals = { status: 'active', count: 5, tags: ['a', 'b'], empty: '', nothing: null };

  it('equals (default operator)', () => {
    const cond: FieldCondition = { field: 'status', is: 'active' };
    expect(evaluateCondition(cond, vals, '')).toBe(true);

    const cond2: FieldCondition = { field: 'status', is: 'inactive' };
    expect(evaluateCondition(cond2, vals, '')).toBe(false);
  });

  it('notEquals', () => {
    const cond: FieldCondition = { field: 'status', is: 'inactive', operator: 'notEquals' };
    expect(evaluateCondition(cond, vals, '')).toBe(true);

    const cond2: FieldCondition = { field: 'status', is: 'active', operator: 'notEquals' };
    expect(evaluateCondition(cond2, vals, '')).toBe(false);
  });

  it('contains — value is array containing target', () => {
    const cond: FieldCondition = { field: 'tags', is: 'a', operator: 'contains' };
    expect(evaluateCondition(cond, vals, '')).toBe(true);

    const cond2: FieldCondition = { field: 'tags', is: 'z', operator: 'contains' };
    expect(evaluateCondition(cond2, vals, '')).toBe(false);
  });

  it('notContains — value is array NOT containing target', () => {
    const cond: FieldCondition = { field: 'tags', is: 'z', operator: 'notContains' };
    expect(evaluateCondition(cond, vals, '')).toBe(true);

    const cond2: FieldCondition = { field: 'tags', is: 'a', operator: 'notContains' };
    expect(evaluateCondition(cond2, vals, '')).toBe(false);
  });

  it('in — scalar value is one of target array', () => {
    const cond: FieldCondition = { field: 'status', is: ['active', 'pending'], operator: 'in' };
    expect(evaluateCondition(cond, vals, '')).toBe(true);

    const cond2: FieldCondition = { field: 'status', is: ['inactive', 'pending'], operator: 'in' };
    expect(evaluateCondition(cond2, vals, '')).toBe(false);
  });

  it('notIn — scalar value is not in target array', () => {
    const cond: FieldCondition = { field: 'status', is: ['inactive', 'pending'], operator: 'notIn' };
    expect(evaluateCondition(cond, vals, '')).toBe(true);

    const cond2: FieldCondition = { field: 'status', is: ['active', 'pending'], operator: 'notIn' };
    expect(evaluateCondition(cond2, vals, '')).toBe(false);
  });

  it('isEmpty', () => {
    expect(evaluateCondition({ field: 'empty', operator: 'isEmpty' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'nothing', operator: 'isEmpty' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'missing', operator: 'isEmpty' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'status', operator: 'isEmpty' }, vals, '')).toBe(false);
  });

  it('isNotEmpty', () => {
    expect(evaluateCondition({ field: 'status', operator: 'isNotEmpty' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'empty', operator: 'isNotEmpty' }, vals, '')).toBe(false);
    expect(evaluateCondition({ field: 'nothing', operator: 'isNotEmpty' }, vals, '')).toBe(false);
  });

  it('gt / gte / lt / lte', () => {
    expect(evaluateCondition({ field: 'count', is: 3, operator: 'gt' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'count', is: 5, operator: 'gt' }, vals, '')).toBe(false);

    expect(evaluateCondition({ field: 'count', is: 5, operator: 'gte' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'count', is: 6, operator: 'gte' }, vals, '')).toBe(false);

    expect(evaluateCondition({ field: 'count', is: 10, operator: 'lt' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'count', is: 5, operator: 'lt' }, vals, '')).toBe(false);

    expect(evaluateCondition({ field: 'count', is: 5, operator: 'lte' }, vals, '')).toBe(true);
    expect(evaluateCondition({ field: 'count', is: 4, operator: 'lte' }, vals, '')).toBe(false);
  });

  it('unknown operator defaults to true', () => {
    const cond = { field: 'status', is: 'x', operator: 'bogus' as any };
    expect(evaluateCondition(cond, vals, '')).toBe(true);
  });
});

// =============================================================================
// evaluateConditions
// =============================================================================

describe('evaluateConditions', () => {
  const vals = { a: 1, b: 2, c: 3 };

  it('single condition (passthrough)', () => {
    const cond: FieldCondition = { field: 'a', is: 1 };
    expect(evaluateConditions(cond, vals, '')).toBe(true);
  });

  it('multiple conditions with match: all (AND, default)', () => {
    const input: FieldConditions = {
      conditions: [
        { field: 'a', is: 1 },
        { field: 'b', is: 2 },
      ],
    };
    expect(evaluateConditions(input, vals, '')).toBe(true);

    const failing: FieldConditions = {
      conditions: [
        { field: 'a', is: 1 },
        { field: 'b', is: 999 },
      ],
    };
    expect(evaluateConditions(failing, vals, '')).toBe(false);
  });

  it('multiple conditions with match: any (OR)', () => {
    const input: FieldConditions = {
      conditions: [
        { field: 'a', is: 999 },
        { field: 'b', is: 2 },
      ],
      match: 'any',
    };
    expect(evaluateConditions(input, vals, '')).toBe(true);

    const failing: FieldConditions = {
      conditions: [
        { field: 'a', is: 999 },
        { field: 'b', is: 999 },
      ],
      match: 'any',
    };
    expect(evaluateConditions(failing, vals, '')).toBe(false);
  });

  it('function condition', () => {
    expect(evaluateConditions((v) => v.a === 1, vals, '')).toBe(true);
    expect(evaluateConditions(() => false, vals, '')).toBe(false);
  });
});

// =============================================================================
// setNestedValue
// =============================================================================

describe('setNestedValue', () => {
  it('sets flat key', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'name', 'Alice');
    expect(obj.name).toBe('Alice');
  });

  it('sets dotted path creating intermediates', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'address.city', 'Bangkok');
    expect((obj.address as any).city).toBe('Bangkok');
  });

  it('sets array index path', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'items[0].name', 'first');
    expect((obj.items as any)[0].name).toBe('first');
  });

  it('creates array when next key is numeric', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'list.0', 'a');
    expect(Array.isArray(obj.list)).toBe(true);
    expect((obj.list as any)[0]).toBe('a');
  });
});
