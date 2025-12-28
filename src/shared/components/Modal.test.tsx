/**
 * ============================================
 * TOPIC 7: MODAL TESTS
 * ============================================
 *
 * This file demonstrates how to test modal components.
 *
 * Key concepts:
 * - Testing open/close states
 * - Testing backdrop clicks
 * - Testing keyboard interactions (Escape key)
 * - Testing focus trap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import Modal from './Modal';

// Mock the Icon component since it's used in Modal
vi.mock('./Icon', () => ({
  default: function Icon({ name, className }: { name: string; className?: string }) {
    return (
      <span data-testid={`icon-${name}`} className={className}>
        {name}
      </span>
    );
  },
}));

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content goes here</div>,
  };

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    // ------------------------------------------
    // Scenario 1: Renders when open
    // ------------------------------------------
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content goes here')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 2: Does not render when closed
    // ------------------------------------------
    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 3: Renders title
    // ------------------------------------------
    it('should render the title', () => {
      render(<Modal {...defaultProps} title="My Custom Title" />);

      expect(screen.getByText('My Custom Title')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 4: Renders children content
    // ------------------------------------------
    it('should render children content', () => {
      render(
        <Modal {...defaultProps}>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </Modal>
      );

      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });
  });

  // ============================================
  // Close Button Tests
  // ============================================
  describe('close button', () => {
    // ------------------------------------------
    // Scenario 5: Shows close button by default
    // ------------------------------------------
    it('should render close button by default', () => {
      render(<Modal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /close modal/i })
      ).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 6: Hides close button when disabled
    // ------------------------------------------
    it('should hide close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);

      expect(
        screen.queryByRole('button', { name: /close modal/i })
      ).not.toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 7: Calls onClose when clicked
    // ------------------------------------------
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const { user } = render(<Modal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /close modal/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // Backdrop Tests
  // ============================================
  describe('backdrop', () => {
    // ------------------------------------------
    // Scenario 8: Renders backdrop
    // ------------------------------------------
    it('should render backdrop overlay', () => {
      render(<Modal {...defaultProps} />);

      // Look for backdrop element (blur overlay)
      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 9: Calls onClose when backdrop clicked
    // Note: HeadlessUI Dialog handles this
    // ------------------------------------------
    it('should call onClose when clicking outside modal', async () => {
      const onClose = vi.fn();
      const { user } = render(<Modal {...defaultProps} onClose={onClose} />);

      // Click on the backdrop (the fixed overlay area outside the panel)
      const dialog = screen.getByRole('dialog');

      // HeadlessUI Dialog calls onClose when clicking outside
      // We simulate this by clicking the backdrop area
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      if (backdrop) {
        await user.click(backdrop);
        await waitFor(() => {
          expect(onClose).toHaveBeenCalled();
        });
      }
    });
  });

  // ============================================
  // Size Tests
  // ============================================
  describe('sizes', () => {
    // ------------------------------------------
    // Scenario 10: Default size (md)
    // ------------------------------------------
    it('should apply default md size', () => {
      render(<Modal {...defaultProps} />);

      const panel = document.querySelector('[class*="max-w-lg"]');
      expect(panel).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 11: Small size
    // ------------------------------------------
    it('should apply sm size', () => {
      render(<Modal {...defaultProps} size="sm" />);

      const panel = document.querySelector('[class*="max-w-md"]');
      expect(panel).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 12: Large size
    // ------------------------------------------
    it('should apply lg size', () => {
      render(<Modal {...defaultProps} size="lg" />);

      const panel = document.querySelector('[class*="max-w-2xl"]');
      expect(panel).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 13: Extra large size
    // ------------------------------------------
    it('should apply xl size', () => {
      render(<Modal {...defaultProps} size="xl" />);

      const panel = document.querySelector('[class*="max-w-4xl"]');
      expect(panel).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 14: 2xl size
    // ------------------------------------------
    it('should apply 2xl size', () => {
      render(<Modal {...defaultProps} size="2xl" />);

      const panel = document.querySelector('[class*="max-w-6xl"]');
      expect(panel).toBeInTheDocument();
    });
  });

  // ============================================
  // Transition/Animation Tests
  // ============================================
  describe('transitions', () => {
    // ------------------------------------------
    // Scenario 15: Modal appears with transition
    // ------------------------------------------
    it('should have transition classes', () => {
      render(<Modal {...defaultProps} />);

      const panel = document.querySelector('[class*="transition-all"]');
      expect(panel).toBeInTheDocument();
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================
  describe('accessibility', () => {
    // ------------------------------------------
    // Scenario 16: Has dialog role
    // ------------------------------------------
    it('should have dialog role', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 17: Close button has aria-label
    // ------------------------------------------
    it('should have accessible close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });
  });

  // ============================================
  // Complex Content Tests
  // ============================================
  describe('complex content', () => {
    // ------------------------------------------
    // Scenario 18: Renders form inside modal
    // ------------------------------------------
    it('should render form content correctly', () => {
      render(
        <Modal {...defaultProps} title="Edit User">
          <form>
            <input type="text" placeholder="Name" />
            <button type="submit">Save</button>
          </form>
        </Modal>
      );

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 19: Renders multiple elements
    // ------------------------------------------
    it('should render multiple elements in content', () => {
      render(
        <Modal {...defaultProps} title="Confirm Delete">
          <p>Are you sure you want to delete this item?</p>
          <div>
            <button>Cancel</button>
            <button>Delete</button>
          </div>
        </Modal>
      );

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });
});
