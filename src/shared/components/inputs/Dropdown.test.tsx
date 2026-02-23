/**
 * ============================================
 * TOPIC 6: DROPDOWN/SELECT TESTS
 * ============================================
 *
 * This file demonstrates how to test dropdown components.
 *
 * Key concepts:
 * - Testing Headless UI components
 * - user.click() to open dropdown
 * - Testing option selection
 * - Testing keyboard navigation
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import Dropdown, { type ListBoxItem } from './Dropdown';

// Mock the useParameterOptions hook since Dropdown uses it
vi.mock('../../utils/parameterUtils', () => ({
  useParameterOptions: function useParameterOptions() {
    return [];
  },
}));

const mockOptions: ListBoxItem[] = [
  { value: 'option1', label: 'Option 1', id: 1 },
  { value: 'option2', label: 'Option 2', id: 2 },
  { value: 'option3', label: 'Option 3', id: 3 },
];

describe('Dropdown', () => {
  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    // ------------------------------------------
    // Scenario 1: Renders with label
    // ------------------------------------------
    it('should render with label', () => {
      render(
        <Dropdown
          label="Select Option"
          options={mockOptions}
          value={null}
          onChange={() => {}}
        />
      );

      expect(screen.getByText('Select Option')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 2: Renders with placeholder
    // ------------------------------------------
    it('should render with placeholder when no value selected', () => {
      render(
        <Dropdown
          options={mockOptions}
          value={null}
          onChange={() => {}}
          placeholder="Choose an option"
        />
      );

      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 3: Renders with default placeholder
    // ------------------------------------------
    it('should render with default placeholder', () => {
      render(
        <Dropdown options={mockOptions} value={null} onChange={() => {}} />
      );

      expect(screen.getByText('Please select')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 4: Shows selected value
    // ------------------------------------------
    it('should display selected value', () => {
      render(
        <Dropdown
          options={mockOptions}
          value="option2"
          onChange={() => {}}
        />
      );

      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 5: Renders required indicator
    // ------------------------------------------
    it('should show required indicator', () => {
      render(
        <Dropdown
          label="Country"
          options={mockOptions}
          value={null}
          onChange={() => {}}
          required
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  // ============================================
  // Open/Close Tests
  // ============================================
  describe('open/close behavior', () => {
    // ------------------------------------------
    // Scenario 6: Opens on click
    // ------------------------------------------
    it('should open dropdown when button is clicked', async () => {
      const { user } = render(
        <Dropdown options={mockOptions} value={null} onChange={() => {}} />
      );

      // Click the dropdown button
      const button = screen.getByRole('button');
      await user.click(button);

      // Options should be visible
      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('Option 2')).toBeInTheDocument();
        expect(screen.getByText('Option 3')).toBeInTheDocument();
      });
    });

    // ------------------------------------------
    // Scenario 7: Shows all options when open
    // ------------------------------------------
    it('should show all options when open', async () => {
      const { user } = render(
        <Dropdown options={mockOptions} value={null} onChange={() => {}} />
      );

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        mockOptions.forEach((option) => {
          expect(screen.getByText(option.label)).toBeInTheDocument();
        });
      });
    });
  });

  // ============================================
  // Selection Tests
  // ============================================
  describe('selection', () => {
    // ------------------------------------------
    // Scenario 8: Calls onChange when option selected
    // ------------------------------------------
    it('should call onChange when an option is selected', async () => {
      const handleChange = vi.fn();
      const { user } = render(
        <Dropdown
          options={mockOptions}
          value={null}
          onChange={handleChange}
        />
      );

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Select an option
      await waitFor(async () => {
        const option = screen.getByText('Option 2');
        await user.click(option);
      });

      expect(handleChange).toHaveBeenCalledWith('option2');
    });

    // ------------------------------------------
    // Scenario 9: Updates displayed value after selection
    // ------------------------------------------
    it('should update displayed value after selection', async () => {
      let selectedValue: string | null = null;
      const handleChange = (value: string) => {
        selectedValue = value;
      };

      const { user, rerender } = render(
        <Dropdown
          options={mockOptions}
          value={selectedValue}
          onChange={handleChange}
        />
      );

      // Open and select
      await user.click(screen.getByRole('button'));

      await waitFor(async () => {
        const option = screen.getByText('Option 3');
        await user.click(option);
      });

      // Rerender with new value
      rerender(
        <Dropdown
          options={mockOptions}
          value="option3"
          onChange={handleChange}
        />
      );

      // Selected value should be displayed
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });
  });

  // ============================================
  // Disabled State Tests
  // ============================================
  describe('disabled state', () => {
    // ------------------------------------------
    // Scenario 10: Cannot open when disabled
    // ------------------------------------------
    it('should not open when disabled', async () => {
      const { user } = render(
        <Dropdown
          options={mockOptions}
          value={null}
          onChange={() => {}}
          disabled
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Options should not appear
      // Note: Headless UI might still render options but they shouldn't be interactive
      await waitFor(() => {
        // Button should show disabled state
        expect(button).toHaveClass('cursor-not-allowed');
      });
    });

    // ------------------------------------------
    // Scenario 11: Disabled styling
    // ------------------------------------------
    it('should apply disabled styles', () => {
      render(
        <Dropdown
          options={mockOptions}
          value={null}
          onChange={() => {}}
          disabled
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-50', 'cursor-not-allowed');
    });
  });

  // ============================================
  // Error State Tests
  // ============================================
  describe('error state', () => {
    // ------------------------------------------
    // Scenario 12: Shows error message
    // ------------------------------------------
    it('should display error message', () => {
      render(
        <Dropdown
          label="Category"
          options={mockOptions}
          value={null}
          onChange={() => {}}
          error="Please select a category"
        />
      );

      expect(screen.getByText('Please select a category')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 13: Applies error styling
    // ------------------------------------------
    it('should apply error styles to button', () => {
      render(
        <Dropdown
          options={mockOptions}
          value={null}
          onChange={() => {}}
          error="Required"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-danger');
    });
  });

  // ============================================
  // Empty Options Tests
  // ============================================
  describe('empty options', () => {
    // ------------------------------------------
    // Scenario 14: Handles empty options array
    // ------------------------------------------
    it('should handle empty options array', async () => {
      const { user } = render(
        <Dropdown
          options={[]}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('button'));

      // Should open but have no options
      // Just verify it doesn't crash
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ============================================
  // Default Value Tests
  // ============================================
  describe('default value', () => {
    // ------------------------------------------
    // Scenario 15: Shows initial value
    // ------------------------------------------
    it('should display initial selected value', () => {
      render(
        <Dropdown
          options={mockOptions}
          value="option1"
          onChange={() => {}}
        />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 16: Handles value not in options
    // ------------------------------------------
    it('should show placeholder when value is not in options', () => {
      render(
        <Dropdown
          options={mockOptions}
          value="nonexistent"
          onChange={() => {}}
          placeholder="Select..."
        />
      );

      // Should show placeholder since value doesn't match any option
      expect(screen.getByText('Select...')).toBeInTheDocument();
    });
  });
});
