import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LongTextCell from './LongTextCell';

describe('LongTextCell', () => {
  it('clamps the text and keeps the full text, with line breaks, in the title', () => {
    const text = 'first line\nsecond line\nthird line';
    render(<LongTextCell text={text} />);
    const cell = screen.getByText(/first line/);
    expect(cell.className).toContain('line-clamp-2');
    expect(cell.getAttribute('title')).toBe(text);
  });

  it('collapses blank lines in the display but not in the title', () => {
    const text = '\n first\n\n\nsecond \n';
    render(<LongTextCell text={text} />);
    const cell = screen.getByText(/first/);
    expect(cell.textContent).toBe('first\nsecond');
    expect(cell.getAttribute('title')).toBe(text);
  });

  it('shows a dash with no title for whitespace-only text', () => {
    const { container } = render(<LongTextCell text={' \n '} />);
    expect(container.textContent).toBe('—');
    expect(container.querySelector('[title]')).toBeNull();
  });
});
