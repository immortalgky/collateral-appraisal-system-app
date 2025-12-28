/**
 * ============================================
 * TOPIC 4: SIMPLE COMPONENT TESTS
 * ============================================
 *
 * This file demonstrates how to test React components.
 *
 * Key concepts:
 * - render(): Renders a component to the virtual DOM
 * - screen: Query elements from the rendered output
 * - user: Simulate user interactions (from test-utils)
 * - getByRole, getByText, etc.: Query functions
 * - toBeInTheDocument(): Check if element exists
 * - toHaveClass(): Check CSS classes
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Button from './Button';

describe('Button', () => {
  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    // ------------------------------------------
    // Scenario 1: Renders with children text
    // ------------------------------------------
    it('should render with children text', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 2: Renders with left icon
    // ------------------------------------------
    it('should render with left icon', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon">+</span>}>
          Add Item
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 3: Renders with right icon
    // ------------------------------------------
    it('should render with right icon', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon">→</span>}>
          Next
        </Button>
      );

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 4: Renders with both icons
    // ------------------------------------------
    it('should render with both left and right icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left">←</span>}
          rightIcon={<span data-testid="right">→</span>}
        >
          Navigate
        </Button>
      );

      expect(screen.getByTestId('left')).toBeInTheDocument();
      expect(screen.getByTestId('right')).toBeInTheDocument();
    });
  });

  // ============================================
  // Variant Tests
  // ============================================
  describe('variants', () => {
    // ------------------------------------------
    // Scenario 5: Primary variant (default)
    // ------------------------------------------
    it('should apply primary variant styles by default', () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });

    // ------------------------------------------
    // Scenario 6: Secondary variant
    // ------------------------------------------
    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
    });

    // ------------------------------------------
    // Scenario 7: Danger variant
    // ------------------------------------------
    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-danger');
    });

    // ------------------------------------------
    // Scenario 8: Outline variant
    // ------------------------------------------
    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Cancel</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
    });

    // ------------------------------------------
    // Scenario 9: Ghost variant
    // ------------------------------------------
    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-gray-100');
    });

    // ------------------------------------------
    // Scenario 10: Success variant
    // ------------------------------------------
    it('should apply success variant styles', () => {
      render(<Button variant="success">Success</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-success');
    });
  });

  // ============================================
  // Size Tests
  // ============================================
  describe('sizes', () => {
    // ------------------------------------------
    // Scenario 11: Medium size (default)
    // ------------------------------------------
    it('should apply medium size styles by default', () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2');
    });

    // ------------------------------------------
    // Scenario 12: Extra small size
    // ------------------------------------------
    it('should apply xs size styles', () => {
      render(<Button size="xs">XS</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-2', 'py-1');
    });

    // ------------------------------------------
    // Scenario 13: Small size
    // ------------------------------------------
    it('should apply sm size styles', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5');
    });

    // ------------------------------------------
    // Scenario 14: Large size
    // ------------------------------------------
    it('should apply lg size styles', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-5', 'py-2.5');
    });

    // ------------------------------------------
    // Scenario 15: Extra large size
    // ------------------------------------------
    it('should apply xl size styles', () => {
      render(<Button size="xl">XL</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3');
    });
  });

  // ============================================
  // Interaction Tests
  // ============================================
  describe('interactions', () => {
    // ------------------------------------------
    // Scenario 16: Click handler is called
    // ------------------------------------------
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const { user } = render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // ------------------------------------------
    // Scenario 17: Multiple clicks
    // ------------------------------------------
    it('should call onClick multiple times for multiple clicks', async () => {
      const handleClick = vi.fn();
      const { user } = render(<Button onClick={handleClick}>Click</Button>);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================
  // Disabled State Tests
  // ============================================
  describe('disabled state', () => {
    // ------------------------------------------
    // Scenario 18: Disabled attribute is set
    // ------------------------------------------
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    // ------------------------------------------
    // Scenario 19: Click is prevented when disabled
    // ------------------------------------------
    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    // ------------------------------------------
    // Scenario 20: Disabled styling is applied
    // ------------------------------------------
    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('loading state', () => {
    // ------------------------------------------
    // Scenario 21: Shows loading spinner when loading
    // ------------------------------------------
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      // Check for the spinner (svg with animate-spin class)
      const spinner = button.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 22: Button is disabled when loading
    // ------------------------------------------
    it('should be disabled when loading', () => {
      render(<Button isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    // ------------------------------------------
    // Scenario 23: Click is prevented when loading
    // ------------------------------------------
    it('should not call onClick when loading', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    // ------------------------------------------
    // Scenario 24: Icons are hidden when loading
    // ------------------------------------------
    it('should hide icons when loading', () => {
      render(
        <Button
          isLoading
          leftIcon={<span data-testid="left-icon">+</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          Loading
        </Button>
      );

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 25: Text is still visible when loading
    // ------------------------------------------
    it('should still show text when loading', () => {
      render(<Button isLoading>Submit</Button>);

      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  // ============================================
  // Full Width Tests
  // ============================================
  describe('fullWidth', () => {
    // ------------------------------------------
    // Scenario 26: Not full width by default
    // ------------------------------------------
    it('should not be full width by default', () => {
      render(<Button>Normal</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    // ------------------------------------------
    // Scenario 27: Full width when prop is true
    // ------------------------------------------
    it('should be full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  // ============================================
  // Custom Class Tests
  // ============================================
  describe('custom className', () => {
    // ------------------------------------------
    // Scenario 28: Applies custom className
    // ------------------------------------------
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    // ------------------------------------------
    // Scenario 29: Custom class doesn't override base classes
    // ------------------------------------------
    it('should keep base classes with custom className', () => {
      render(<Button className="my-custom">Button</Button>);

      const button = screen.getByRole('button');
      // Should have both custom and base classes
      expect(button).toHaveClass('my-custom');
      expect(button).toHaveClass('inline-flex');
      expect(button).toHaveClass('rounded-md');
    });
  });
});
