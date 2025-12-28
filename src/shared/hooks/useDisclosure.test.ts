/**
 * ============================================
 * TOPIC 3: CUSTOM HOOK TESTS
 * ============================================
 *
 * This file demonstrates how to test custom React hooks.
 * Use renderHook() from @testing-library/react to test hooks in isolation.
 *
 * Key concepts:
 * - renderHook(): Renders a hook without a component
 * - result.current: Access the current return value of the hook
 * - act(): Wrap state updates when calling hook functions
 * - rerender(): Re-render hook with new props
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDisclosure } from './useDisclosure';

describe('useDisclosure', () => {
  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    // ------------------------------------------
    // Scenario 1: Default initial state (closed)
    // ------------------------------------------
    it('should start with isOpen = false by default', () => {
      const { result } = renderHook(() => useDisclosure());

      expect(result.current.isOpen).toBe(false);
    });

    // ------------------------------------------
    // Scenario 2: Custom initial state (open)
    // ------------------------------------------
    it('should start with isOpen = true when defaultIsOpen is true', () => {
      const { result } = renderHook(() =>
        useDisclosure({ defaultIsOpen: true })
      );

      expect(result.current.isOpen).toBe(true);
    });

    // ------------------------------------------
    // Scenario 3: Empty options object
    // ------------------------------------------
    it('should handle empty options object', () => {
      const { result } = renderHook(() => useDisclosure({}));

      expect(result.current.isOpen).toBe(false);
    });
  });

  // ============================================
  // Action Tests
  // ============================================
  describe('actions', () => {
    // ------------------------------------------
    // Scenario 4: onOpen should set isOpen to true
    // ------------------------------------------
    it('should open when onOpen is called', () => {
      const { result } = renderHook(() => useDisclosure());

      // Initially closed
      expect(result.current.isOpen).toBe(false);

      // Call onOpen
      act(() => {
        result.current.onOpen();
      });

      // Should be open
      expect(result.current.isOpen).toBe(true);
    });

    // ------------------------------------------
    // Scenario 5: onClose should set isOpen to false
    // ------------------------------------------
    it('should close when onClose is called', () => {
      const { result } = renderHook(() =>
        useDisclosure({ defaultIsOpen: true })
      );

      // Initially open
      expect(result.current.isOpen).toBe(true);

      // Call onClose
      act(() => {
        result.current.onClose();
      });

      // Should be closed
      expect(result.current.isOpen).toBe(false);
    });

    // ------------------------------------------
    // Scenario 6: onToggle should flip the state
    // ------------------------------------------
    it('should toggle state when onToggle is called', () => {
      const { result } = renderHook(() => useDisclosure());

      // Initially closed
      expect(result.current.isOpen).toBe(false);

      // Toggle (should open)
      act(() => {
        result.current.onToggle();
      });
      expect(result.current.isOpen).toBe(true);

      // Toggle again (should close)
      act(() => {
        result.current.onToggle();
      });
      expect(result.current.isOpen).toBe(false);
    });

    // ------------------------------------------
    // Scenario 7: Multiple toggles
    // ------------------------------------------
    it('should handle multiple toggles correctly', () => {
      const { result } = renderHook(() => useDisclosure());

      // Toggle 3 times
      act(() => {
        result.current.onToggle();
        result.current.onToggle();
        result.current.onToggle();
      });

      // Should be open (odd number of toggles)
      expect(result.current.isOpen).toBe(true);
    });

    // ------------------------------------------
    // Scenario 8: onOpen when already open (idempotent)
    // ------------------------------------------
    it('should stay open when onOpen is called multiple times', () => {
      const { result } = renderHook(() => useDisclosure());

      act(() => {
        result.current.onOpen();
        result.current.onOpen();
        result.current.onOpen();
      });

      expect(result.current.isOpen).toBe(true);
    });

    // ------------------------------------------
    // Scenario 9: onClose when already closed (idempotent)
    // ------------------------------------------
    it('should stay closed when onClose is called multiple times', () => {
      const { result } = renderHook(() => useDisclosure());

      act(() => {
        result.current.onClose();
        result.current.onClose();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  // ============================================
  // Callback Stability Tests
  // ============================================
  describe('callback stability', () => {
    // ------------------------------------------
    // Scenario 10: Callbacks should have stable references
    // ------------------------------------------
    it('should maintain stable callback references across rerenders', () => {
      const { result, rerender } = renderHook(() => useDisclosure());

      // Store initial references
      const initialOnOpen = result.current.onOpen;
      const initialOnClose = result.current.onClose;
      const initialOnToggle = result.current.onToggle;

      // Rerender the hook
      rerender();

      // References should be the same (useCallback)
      expect(result.current.onOpen).toBe(initialOnOpen);
      expect(result.current.onClose).toBe(initialOnClose);
      expect(result.current.onToggle).toBe(initialOnToggle);
    });

    // ------------------------------------------
    // Scenario 11: Callbacks stable even after state changes
    // ------------------------------------------
    it('should maintain callback references after state changes', () => {
      const { result } = renderHook(() => useDisclosure());

      const initialOnOpen = result.current.onOpen;
      const initialOnClose = result.current.onClose;
      const initialOnToggle = result.current.onToggle;

      // Change state
      act(() => {
        result.current.onOpen();
      });

      // References should still be the same
      expect(result.current.onOpen).toBe(initialOnOpen);
      expect(result.current.onClose).toBe(initialOnClose);
      expect(result.current.onToggle).toBe(initialOnToggle);
    });
  });

  // ============================================
  // Return Value Structure Tests
  // ============================================
  describe('return value structure', () => {
    // ------------------------------------------
    // Scenario 12: Should return correct shape
    // ------------------------------------------
    it('should return object with isOpen and action functions', () => {
      const { result } = renderHook(() => useDisclosure());

      // Check that all expected properties exist
      expect(result.current).toHaveProperty('isOpen');
      expect(result.current).toHaveProperty('onOpen');
      expect(result.current).toHaveProperty('onClose');
      expect(result.current).toHaveProperty('onToggle');

      // Check types
      expect(typeof result.current.isOpen).toBe('boolean');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
    });
  });
});
