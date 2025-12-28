/**
 * ============================================
 * TOPIC 1: UTILITY FUNCTION TESTS
 * ============================================
 *
 * This file demonstrates how to test pure utility functions.
 * Pure functions are the easiest to test - no mocking needed!
 *
 * Key concepts:
 * - describe(): Groups related tests together
 * - it() / test(): Individual test cases
 * - expect(): Assertion to check results
 */
import { describe, it, expect } from 'vitest';
import { accessPath } from './objectUtils';

describe('objectUtils', () => {
  // ============================================
  // accessPath function tests
  // ============================================
  describe('accessPath', () => {
    // ------------------------------------------
    // Scenario 1: Valid input - access nested property
    // ------------------------------------------
    it('should access nested property with valid path', () => {
      const obj = {
        user: {
          name: 'John',
          address: {
            city: 'Bangkok',
          },
        },
      };

      // Access nested property
      const result = accessPath(obj, ['user', 'address', 'city']);

      expect(result).toBe('Bangkok');
    });

    // ------------------------------------------
    // Scenario 2: Access top-level property
    // ------------------------------------------
    it('should access top-level property', () => {
      const obj = { name: 'Test', value: 123 };

      expect(accessPath(obj, ['name'])).toBe('Test');
      expect(accessPath(obj, ['value'])).toBe(123);
    });

    // ------------------------------------------
    // Scenario 3: Access array element (if path includes index)
    // ------------------------------------------
    it('should access array element by index', () => {
      const obj = {
        items: ['apple', 'banana', 'cherry'],
      };

      expect(accessPath(obj, ['items', '0'])).toBe('apple');
      expect(accessPath(obj, ['items', '2'])).toBe('cherry');
    });

    // ------------------------------------------
    // Scenario 4: Empty path returns the object itself
    // ------------------------------------------
    it('should return the object itself when path is empty', () => {
      const obj = { name: 'Test' };

      const result = accessPath(obj, []);

      expect(result).toEqual({ name: 'Test' });
    });

    // ------------------------------------------
    // Scenario 5: Invalid path returns undefined
    // ------------------------------------------
    it('should return undefined for invalid path', () => {
      const obj = { user: { name: 'John' } };

      // Path doesn't exist
      expect(accessPath(obj, ['user', 'email'])).toBeUndefined();
      expect(accessPath(obj, ['nonexistent'])).toBeUndefined();
      expect(accessPath(obj, ['user', 'address', 'city'])).toBeUndefined();
    });

    // ------------------------------------------
    // Scenario 6: Handle null/undefined object
    // ------------------------------------------
    it('should handle null object gracefully', () => {
      expect(accessPath(null, ['name'])).toBeUndefined();
    });

    it('should handle undefined object gracefully', () => {
      expect(accessPath(undefined, ['name'])).toBeUndefined();
    });

    // ------------------------------------------
    // Scenario 7: Handle null in path
    // ------------------------------------------
    it('should handle null value in nested path', () => {
      const obj = {
        user: null,
      };

      // Trying to access property of null
      expect(accessPath(obj, ['user', 'name'])).toBeUndefined();
    });

    // ------------------------------------------
    // Scenario 8: Access boolean and number values
    // ------------------------------------------
    it('should return boolean and number values correctly', () => {
      const obj = {
        isActive: true,
        count: 0,
        empty: '',
      };

      expect(accessPath(obj, ['isActive'])).toBe(true);
      expect(accessPath(obj, ['count'])).toBe(0);
      expect(accessPath(obj, ['empty'])).toBe('');
    });

    // ------------------------------------------
    // Scenario 9: Access deeply nested object
    // ------------------------------------------
    it('should access deeply nested properties', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      const result = accessPath(obj, ['level1', 'level2', 'level3', 'level4', 'value']);

      expect(result).toBe('deep');
    });
  });
});
