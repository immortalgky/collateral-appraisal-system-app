/**
 * ============================================
 * TOPIC 5: FORM INPUT TESTS
 * ============================================
 *
 * This file demonstrates how to test form input components.
 *
 * Key concepts:
 * - user.type(): Simulate typing in an input
 * - user.clear(): Clear input value
 * - getByLabelText(): Find input by its label
 * - getByPlaceholderText(): Find input by placeholder
 * - toHaveValue(): Check input value
 * - Testing controlled vs uncontrolled inputs
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@/test/test-utils';
import TextInput from './TextInput';

// Wrapper for controlled input testing
function ControlledTextInput(props: React.ComponentProps<typeof TextInput>) {
  const [value, setValue] = useState(props.value ?? '');
  return (
    <TextInput
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

describe('TextInput', () => {
  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    // ------------------------------------------
    // Scenario 1: Renders with label
    // ------------------------------------------
    it('should render with label', () => {
      render(<TextInput label="Username" />);

      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 2: Renders with placeholder
    // ------------------------------------------
    it('should render with placeholder', () => {
      render(<TextInput placeholder="Enter your name" />);

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 3: Renders with both label and placeholder
    // ------------------------------------------
    it('should render with both label and placeholder', () => {
      render(<TextInput label="Email" placeholder="example@email.com" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('placeholder', 'example@email.com');
    });

    // ------------------------------------------
    // Scenario 4: Renders required indicator
    // ------------------------------------------
    it('should show required indicator when required', () => {
      render(<TextInput label="Name" required />);

      // Look for the asterisk in the label
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  // ============================================
  // User Interaction Tests
  // ============================================
  describe('user interactions', () => {
    // ------------------------------------------
    // Scenario 5: User can type text
    // ------------------------------------------
    it('should allow user to type text', async () => {
      const { user } = render(<ControlledTextInput label="Name" />);

      const input = screen.getByLabelText('Name');
      await user.type(input, 'John Doe');

      expect(input).toHaveValue('John Doe');
    });

    // ------------------------------------------
    // Scenario 6: User can clear input
    // ------------------------------------------
    it('should allow user to clear input', async () => {
      const { user } = render(<ControlledTextInput label="Name" value="Initial" />);

      const input = screen.getByLabelText('Name');
      await user.clear(input);

      expect(input).toHaveValue('');
    });

    // ------------------------------------------
    // Scenario 7: User can replace text
    // ------------------------------------------
    it('should allow user to replace text', async () => {
      const { user } = render(<ControlledTextInput label="Name" value="Old Value" />);

      const input = screen.getByLabelText('Name');
      await user.clear(input);
      await user.type(input, 'New Value');

      expect(input).toHaveValue('New Value');
    });

    // ------------------------------------------
    // Scenario 8: onChange is called when typing
    // ------------------------------------------
    it('should call onChange when typing', async () => {
      const handleChange = vi.fn();
      const { user } = render(
        <TextInput label="Name" onChange={handleChange} />
      );

      const input = screen.getByLabelText('Name');
      await user.type(input, 'A');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  // ============================================
  // Error State Tests
  // ============================================
  describe('error state', () => {
    // ------------------------------------------
    // Scenario 9: Shows error message
    // ------------------------------------------
    it('should display error message', () => {
      render(<TextInput label="Email" error="Invalid email format" />);

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 10: Error styling is applied
    // ------------------------------------------
    it('should apply error styles', () => {
      render(<TextInput label="Email" error="Required" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveClass('border-danger');
    });

    // ------------------------------------------
    // Scenario 11: aria-invalid is set when error
    // ------------------------------------------
    it('should set aria-invalid when error exists', () => {
      render(<TextInput label="Email" error="Invalid" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    // ------------------------------------------
    // Scenario 12: No error styling without error
    // ------------------------------------------
    it('should not have error styles when no error', () => {
      render(<TextInput label="Email" />);

      const input = screen.getByLabelText('Email');
      expect(input).not.toHaveClass('border-danger');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });
  });

  // ============================================
  // Disabled State Tests
  // ============================================
  describe('disabled state', () => {
    // ------------------------------------------
    // Scenario 13: Input is disabled
    // ------------------------------------------
    it('should be disabled when disabled prop is true', () => {
      render(<TextInput label="Name" disabled />);

      const input = screen.getByLabelText('Name');
      expect(input).toBeDisabled();
    });

    // ------------------------------------------
    // Scenario 14: Disabled styling is applied
    // ------------------------------------------
    it('should apply disabled styles', () => {
      render(<TextInput label="Name" disabled />);

      const input = screen.getByLabelText('Name');
      expect(input).toHaveClass('bg-gray-50', 'cursor-not-allowed');
    });

    // ------------------------------------------
    // Scenario 15: Cannot type in disabled input
    // ------------------------------------------
    it('should not allow typing when disabled', async () => {
      const handleChange = vi.fn();
      const { user } = render(
        <TextInput label="Name" disabled onChange={handleChange} />
      );

      const input = screen.getByLabelText('Name');
      await user.type(input, 'Test');

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Read-only State Tests
  // ============================================
  describe('readonly state', () => {
    // ------------------------------------------
    // Scenario 16: Input is readonly
    // ------------------------------------------
    it('should be readonly when readOnly prop is true', () => {
      render(<TextInput label="ID" readOnly value="12345" />);

      const input = screen.getByLabelText('ID');
      expect(input).toHaveAttribute('readonly');
    });
  });

  // ============================================
  // Character Count Tests
  // ============================================
  describe('character count', () => {
    // ------------------------------------------
    // Scenario 17: Shows character count with maxLength
    // ------------------------------------------
    it('should show character count when showCharCount and maxLength are set', () => {
      render(
        <ControlledTextInput
          label="Bio"
          maxLength={100}
          showCharCount
          value="Hello"
        />
      );

      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 18: Updates character count when typing
    // ------------------------------------------
    it('should update character count when typing', async () => {
      const { user } = render(
        <ControlledTextInput label="Bio" maxLength={50} showCharCount />
      );

      const input = screen.getByLabelText('Bio');
      await user.type(input, 'Hello World');

      expect(screen.getByText('11/50')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 19: No character count without showCharCount
    // ------------------------------------------
    it('should not show character count without showCharCount prop', () => {
      render(<TextInput label="Bio" maxLength={100} value="Test" />);

      expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================
  describe('accessibility', () => {
    // ------------------------------------------
    // Scenario 20: Label is associated with input
    // ------------------------------------------
    it('should have label associated with input via htmlFor', () => {
      render(<TextInput label="Email" id="email-input" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    // ------------------------------------------
    // Scenario 21: Error message is linked via aria-describedby
    // ------------------------------------------
    it('should link error message via aria-describedby', () => {
      render(<TextInput label="Email" id="email" error="Invalid" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
    });
  });
});
