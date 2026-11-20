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

describe('Toggle locked', () => {
  const render2 = (props: { locked?: boolean }) =>
    render(<Toggle options={['Normal', 'Urgent']} checked disabled {...props} />);

  it('a plain disabled toggle has a grey pill', () => {
    render2({});
    expect(pill().className).toMatch(/bg-gray-500/);
  });

  it('a locked one keeps the accent pill and stays unclickable', async () => {
    render2({ locked: true });
    expect(pill().className).toMatch(/bg-primary-700/);
    expect(pill().className).not.toMatch(/bg-gray-500/);
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeDisabled();
  });
});

describe('Toggle in a narrow cell', () => {
  it('never outgrows its cell: the track is capped and the captions can shrink', () => {
    render(<Toggle options={['Normal', 'Urgent']} checked={false} />);
    const track = screen.getByRole('radiogroup');
    expect(track).toHaveClass('max-w-full');
    expect(track.closest('fieldset')).toHaveClass('min-w-0');
    const caption = screen.getByRole('radio', { name: 'Normal' }).firstElementChild!;
    expect(caption).toHaveClass('truncate', 'min-w-0');
  });

  it('gives the full caption as a title only where it is cut short', () => {
    const scroll = vi
      .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.textContent === 'Urgent' ? 90 : 60;
      });
    const client = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.textContent === 'Urgent' ? 40 : 60;
      });
    render(<Toggle options={['Normal', 'Urgent']} checked={false} />);
    expect(screen.getByRole('radio', { name: 'Normal' })).not.toHaveAttribute('title');
    expect(screen.getByRole('radio', { name: 'Urgent' })).toHaveAttribute('title', 'Urgent');
    scroll.mockRestore();
    client.mockRestore();
  });
});
