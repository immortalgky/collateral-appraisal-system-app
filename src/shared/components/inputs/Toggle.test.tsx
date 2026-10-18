import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Toggle from './Toggle';

// jsdom has no layout: give each option a width by its label and lay them out left to right.
const WIDTHS: Record<string, number> = { Normal: 60, Urgent: 90 };
const LEFT: Record<string, number> = { Normal: 4, Urgent: 64 };

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return WIDTHS[this.textContent ?? ''] ?? 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return LEFT[this.textContent ?? ''] ?? 0;
  });
});

afterEach(() => vi.restoreAllMocks());

function Harness({ error }: { error?: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <Toggle options={['Normal', 'Urgent']} checked={checked} onChange={setChecked} error={error} />
  );
}

const pill = () =>
  screen.getByRole('radiogroup').querySelector('span[aria-hidden="true"]') as HTMLElement;

describe('Toggle sliding pill', () => {
  it('sits behind the active option, sized to its own width', () => {
    render(<Harness />);
    expect(pill().style.width).toBe('60px');
    expect(pill().style.transform).toBe('translateX(4px)');
  });

  it('follows the active option when it changes', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Urgent' }));
    expect(screen.getByRole('radio', { name: 'Urgent' })).toHaveAttribute('aria-checked', 'true');
    expect(pill().style.width).toBe('90px');
    expect(pill().style.transform).toBe('translateX(64px)');
  });

  it('does not animate on first paint, only on later moves', async () => {
    render(<Harness />);
    expect(pill().className).not.toContain('transition-[transform,width]');
    await userEvent.click(screen.getByRole('radio', { name: 'Urgent' }));
    expect(pill().className).toContain('transition-[transform,width]');
    expect(pill().className).toContain('motion-reduce:transition-none');
  });

  it('is danger-coloured without a shadow in the error state', () => {
    render(<Harness error="Required" />);
    expect(pill().className).toContain('bg-danger');
    expect(pill().className).not.toContain('shadow-');
  });
});
