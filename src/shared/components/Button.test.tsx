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
import Icon from './Icon';
import { FormLayoutProvider } from './form/FormLayoutProvider';

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
      render(<Button leftIcon={<span data-testid="left-icon">+</span>}>Add Item</Button>);

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 3: Renders with right icon
    // ------------------------------------------
    it('should render with right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>Next</Button>);

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
        </Button>,
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

      // primary-700, not the brand teal: white on primary-600 is 3.7:1 (DESIGN.md 17.11).
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-700', 'hover:bg-primary-800');
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
      // danger-600, not the brand red: white on danger (#EF4444) is 3.8:1.
      expect(button).toHaveClass('bg-danger-600');
    });

    // ------------------------------------------
    // Scenario 8: Outline variant
    // ------------------------------------------
    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Cancel</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'text-(--palette-ink)');
    });

    // ------------------------------------------
    // Scenario 9: Ghost variant
    // ------------------------------------------
    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      // A palette token, so the hover and the text keep their contrast in dark mode.
      expect(button).toHaveClass('hover:bg-(--palette-surface-3)', 'text-(--palette-ink)');
    });

    // ------------------------------------------
    // Scenario 10: Success variant
    // ------------------------------------------
    it('should apply success variant styles', () => {
      render(<Button variant="success">Success</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-700');
    });

    it('should apply dangerOutline variant styles', () => {
      render(<Button variant="dangerOutline">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'border-(--palette-req-line)',
        'text-(--palette-req)',
        'hover:bg-(--palette-req-wash)',
      );
    });

    // The outline border is the control edge, shared with inputs (17.10).
    it('should draw the outline border in the control-edge colour inside a Compact form', () => {
      render(
        <FormLayoutProvider layout="compact">
          <Button variant="outline">Cancel</Button>
        </FormLayoutProvider>,
      );

      expect(screen.getByRole('button')).toHaveClass('border-(--palette-input-edge)');
    });

    // Cancel / Save draft are ghost buttons: borderless in both layouts (the mock's `.bt.gh`).
    it.each(['standard', 'compact'] as const)('should draw ghost borderless in %s', layout => {
      render(
        <FormLayoutProvider layout={layout}>
          <Button variant="ghost">Cancel</Button>
        </FormLayoutProvider>,
      );

      expect(screen.getByRole('button')).toHaveClass('border-transparent');
    });
  });

  // ============================================
  // Size Tests
  // ============================================
  describe('sizes', () => {
    // ------------------------------------------
    // Scenario 11: Medium size (default)
    // ------------------------------------------
    // Heights are explicit, never derived from padding, so a Thai label cannot change them (17.12).
    it('should apply medium size styles by default', () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'h-[2.4286rem]');
      expect(button).not.toHaveClass('py-2');
    });

    // ------------------------------------------
    // Scenario 12: Extra small size
    // ------------------------------------------
    it('should apply xs size styles', () => {
      render(<Button size="xs">XS</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-2', 'h-[1.7143rem]');
    });

    // ------------------------------------------
    // Scenario 13: Small size
    // ------------------------------------------
    it('should apply sm size styles', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'h-[2.1429rem]');
    });

    it('should take the Compact heights inside a Compact form', () => {
      render(
        <FormLayoutProvider layout="compact">
          <Button>Medium</Button>
          <Button size="sm">Small</Button>
        </FormLayoutProvider>,
      );

      expect(screen.getByRole('button', { name: 'Medium' })).toHaveClass(
        'h-[2.1429rem]',
        'rounded-ctl-c',
      );
      expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-chip-c');
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
        </Button>,
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
      // A grey fill with ink-2 text, not opacity-50 (which drops the label below 4.5:1 in dark).
      expect(button).toHaveClass(
        'disabled:bg-(--palette-surface-3)',
        'disabled:text-(--palette-ink-2)',
        'disabled:cursor-not-allowed',
      );
      expect(button).not.toHaveClass('disabled:opacity-50');
    });

    it('should keep its colours while loading', () => {
      render(<Button isLoading>Saving</Button>);

      expect(screen.getByRole('button')).not.toHaveClass('disabled:bg-(--palette-surface-3)');
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
        </Button>,
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    // ------------------------------------------
    // Scenario 24: The leading icon gives way to the spinner when loading; a trailing one stays
    // ------------------------------------------
    it('should replace the left icon but keep the right icon when loading', () => {
      render(
        <Button
          isLoading
          leftIcon={<span data-testid="left-icon">+</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          Loading
        </Button>,
      );

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    // The spinner replaces a LEADING <Icon> child only; a trailing one and an icon-only button
    // must not be swallowed or pushed off-centre.
    it('should replace a leading Icon child with the spinner', () => {
      render(
        <Button isLoading>
          <Icon name="floppy-disk" />
          Save
        </Button>,
      );

      const button = screen.getByRole('button');
      expect(button.querySelector('svg.icon')).not.toBeInTheDocument();
      expect(button.querySelector('svg.animate-spin')).toHaveClass('mr-2');
    });

    it('should keep a trailing Icon child while loading', () => {
      render(
        <Button isLoading>
          Next
          <Icon name="chevron-right" />
        </Button>,
      );

      const button = screen.getByRole('button');
      expect(button.querySelector('svg.icon')).toBeInTheDocument();
      expect(button.querySelector('svg.animate-spin')).toHaveClass('mr-2');
    });

    it('should centre a bare spinner on an icon-only button', () => {
      render(
        <Button isLoading aria-label="Edit">
          <Icon name="pen" />
        </Button>,
      );

      const spinner = screen.getByRole('button').querySelector('svg.animate-spin');
      expect(screen.getByRole('button').querySelector('svg.icon')).not.toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
      expect(spinner).not.toHaveClass('mr-2');
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
      expect(button).toHaveClass('rounded-ctl');
    });
  });
});
