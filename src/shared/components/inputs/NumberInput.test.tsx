/**
 * ============================================
 * TOPIC 5B: NUMBER INPUT TESTS
 * ============================================
 *
 * This file demonstrates testing number-specific input behavior.
 *
 * Key concepts:
 * - Testing formatted values (commas, decimals)
 * - Testing number-only input validation
 * - Testing special keyboard shortcuts
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@/test/test-utils';
import NumberInput from './NumberInput';

// Controlled wrapper for testing
function ControlledNumberInput(
  props: React.ComponentProps<typeof NumberInput> & { initialValue?: number }
) {
  const [value, setValue] = useState<number | null>(props.initialValue ?? null);
  return (
    <NumberInput
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

describe('NumberInput', () => {
  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    // ------------------------------------------
    // Scenario 1: Renders with label
    // ------------------------------------------
    it('should render with label', () => {
      render(<NumberInput label="Amount" />);

      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 2: Renders with placeholder
    // ------------------------------------------
    it('should render with default placeholder', () => {
      render(<NumberInput label="Price" />);

      const input = screen.getByLabelText('Price');
      expect(input).toHaveAttribute('placeholder', '0.00');
    });

    // ------------------------------------------
    // Scenario 3: Renders with custom placeholder
    // ------------------------------------------
    it('should render with custom placeholder', () => {
      render(<NumberInput label="Price" placeholder="Enter amount" />);

      const input = screen.getByLabelText('Price');
      expect(input).toHaveAttribute('placeholder', 'Enter amount');
    });

    // ------------------------------------------
    // Scenario 4: Renders required indicator
    // ------------------------------------------
    it('should show required indicator', () => {
      render(<NumberInput label="Amount" required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  // ============================================
  // Number Input Behavior Tests
  // ============================================
  describe('number input behavior', () => {
    // ------------------------------------------
    // Scenario 5: Accepts numeric input
    // ------------------------------------------
    it('should accept numeric input', async () => {
      const { user } = render(<ControlledNumberInput label="Amount" />);

      const input = screen.getByLabelText('Amount');
      await user.type(input, '12345');

      // Should format with commas
      expect(input).toHaveValue('12,345');
    });

    // ------------------------------------------
    // Scenario 6: Accepts decimal input
    // ------------------------------------------
    it('should accept decimal input', async () => {
      const { user } = render(<ControlledNumberInput label="Price" />);

      const input = screen.getByLabelText('Price');
      await user.type(input, '123.45');

      expect(input).toHaveValue('123.45');
    });

    // ------------------------------------------
    // Scenario 7: Formats with thousand separators
    // ------------------------------------------
    it('should format large numbers with thousand separators', async () => {
      const { user } = render(<ControlledNumberInput label="Amount" />);

      const input = screen.getByLabelText('Amount');
      await user.type(input, '1234567');

      expect(input).toHaveValue('1,234,567');
    });

    // ------------------------------------------
    // Scenario 8: Rejects non-numeric characters
    // ------------------------------------------
    it('should reject letters and special characters', async () => {
      const { user } = render(<ControlledNumberInput label="Amount" />);

      const input = screen.getByLabelText('Amount');
      await user.type(input, 'abc!@#');

      expect(input).toHaveValue('');
    });

    // ------------------------------------------
    // Scenario 9: Mixed input - only numbers accepted
    // ------------------------------------------
    it('should only accept numbers from mixed input', async () => {
      const { user } = render(<ControlledNumberInput label="Amount" />);

      const input = screen.getByLabelText('Amount');
      await user.type(input, '1a2b3c');

      expect(input).toHaveValue('123');
    });
  });

  // ============================================
  // Negative Numbers Tests
  // ============================================
  describe('negative numbers', () => {
    // ------------------------------------------
    // Scenario 10: Does not allow negative by default
    // ------------------------------------------
    it('should not allow negative numbers by default', async () => {
      const { user } = render(<ControlledNumberInput label="Amount" />);

      const input = screen.getByLabelText('Amount');
      await user.type(input, '-100');

      // Should not have the minus sign
      expect(input).toHaveValue('100');
    });

    // ------------------------------------------
    // Scenario 11: Allows negative when enabled
    // ------------------------------------------
    it('should allow negative numbers when allowNegative is true', async () => {
      const { user } = render(
        <ControlledNumberInput label="Balance" allowNegative />
      );

      const input = screen.getByLabelText('Balance');
      await user.type(input, '-500');

      expect(input).toHaveValue('-500');
    });
  });

  // ============================================
  // Decimal Places Tests
  // ============================================
  describe('decimal places', () => {
    // ------------------------------------------
    // Scenario 12: Default decimal places (2)
    // ------------------------------------------
    it('should format to 2 decimal places by default on blur', async () => {
      const { user } = render(<ControlledNumberInput label="Amount" />);

      const input = screen.getByLabelText('Amount');
      await user.type(input, '100');
      await user.tab(); // Blur

      expect(input).toHaveValue('100.00');
    });

    // ------------------------------------------
    // Scenario 13: Custom decimal places
    // ------------------------------------------
    it('should format to custom decimal places on blur', async () => {
      const { user } = render(
        <ControlledNumberInput label="Amount" decimalPlaces={4} />
      );

      const input = screen.getByLabelText('Amount');
      await user.type(input, '100');
      await user.tab(); // Blur

      expect(input).toHaveValue('100.0000');
    });

    // ------------------------------------------
    // Scenario 14: No decimal places
    // ------------------------------------------
    it('should format without decimals when decimalPlaces is 0', async () => {
      const { user } = render(
        <ControlledNumberInput label="Quantity" decimalPlaces={0} />
      );

      const input = screen.getByLabelText('Quantity');
      await user.type(input, '100');
      await user.tab();

      expect(input).toHaveValue('100');
    });
  });

  // ============================================
  // onChange Handler Tests
  // ============================================
  describe('onChange handler', () => {
    // ------------------------------------------
    // Scenario 15: Calls onChange with numeric value
    // ------------------------------------------
    it('should call onChange with numeric value', async () => {
      const handleChange = vi.fn();
      const { user } = render(
        <NumberInput label="Amount" onChange={handleChange} />
      );

      const input = screen.getByLabelText('Amount');
      await user.type(input, '1000');

      // Check last call - value should be a number
      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      expect(lastCall[0].target.value).toBe(1000);
    });

    // ------------------------------------------
    // Scenario 16: Calls onChange with null for empty
    // ------------------------------------------
    it('should call onChange with null when cleared', async () => {
      const handleChange = vi.fn();
      const { user } = render(
        <NumberInput label="Amount" value={100} onChange={handleChange} />
      );

      const input = screen.getByLabelText('Amount');
      await user.clear(input);

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      expect(lastCall[0].target.value).toBeNull();
    });
  });

  // ============================================
  // Error State Tests
  // ============================================
  describe('error state', () => {
    // ------------------------------------------
    // Scenario 17: Shows error message
    // ------------------------------------------
    it('should display error message', () => {
      render(<NumberInput label="Amount" error="Amount is required" />);

      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 18: Applies error styling
    // ------------------------------------------
    it('should apply error border style', () => {
      render(<NumberInput label="Amount" error="Invalid" />);

      const input = screen.getByLabelText('Amount');
      expect(input).toHaveClass('border-danger');
    });
  });

  // ============================================
  // Disabled State Tests
  // ============================================
  describe('disabled state', () => {
    // ------------------------------------------
    // Scenario 19: Input is disabled
    // ------------------------------------------
    it('should be disabled when disabled prop is true', () => {
      render(<NumberInput label="Amount" disabled />);

      const input = screen.getByLabelText('Amount');
      expect(input).toBeDisabled();
    });

    // ------------------------------------------
    // Scenario 20: Disabled styling
    // ------------------------------------------
    it('should apply disabled styles', () => {
      render(<NumberInput label="Amount" disabled />);

      const input = screen.getByLabelText('Amount');
      expect(input).toHaveClass('bg-gray-50', 'cursor-not-allowed');
    });
  });

  // ============================================
  // Keyboard Shortcuts Tests
  // ============================================
  describe('keyboard shortcuts', () => {
    // ------------------------------------------
    // Scenario 21: K key multiplies by 1000
    // ------------------------------------------
    it('should multiply by 1000 when K key is pressed', async () => {
      const handleChange = vi.fn();
      const { user } = render(
        <ControlledNumberInput label="Amount" initialValue={5} />
      );

      const input = screen.getByLabelText('Amount');
      await user.click(input);

      // Simulate keydown for 'k'
      fireEvent.keyDown(input, { key: 'k' });

      // Value should be 5 * 1000 = 5,000
      expect(input).toHaveValue('5,000.00');
    });

    // ------------------------------------------
    // Scenario 22: M key multiplies by 1000000
    // ------------------------------------------
    it('should multiply by 1000000 when M key is pressed', async () => {
      const { user } = render(
        <ControlledNumberInput label="Amount" initialValue={2} />
      );

      const input = screen.getByLabelText('Amount');
      await user.click(input);

      // Simulate keydown for 'm'
      fireEvent.keyDown(input, { key: 'm' });

      // Value should be 2 * 1,000,000 = 2,000,000
      expect(input).toHaveValue('2,000,000.00');
    });
  });

  // ============================================
  // Icon Tests
  // ============================================
  describe('icons', () => {
    // ------------------------------------------
    // Scenario 23: Renders left icon
    // ------------------------------------------
    it('should render left icon', () => {
      render(
        <NumberInput
          label="Price"
          leftIcon={<span data-testid="currency">$</span>}
        />
      );

      expect(screen.getByTestId('currency')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 24: Renders right icon
    // ------------------------------------------
    it('should render right icon', () => {
      render(
        <NumberInput
          label="Area"
          rightIcon={<span data-testid="unit">sqm</span>}
        />
      );

      expect(screen.getByTestId('unit')).toBeInTheDocument();
    });
  });
});
