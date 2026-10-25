import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act } from '@testing-library/react';
import { render, screen } from '@/test/test-utils';
import { FormLayoutProvider } from '../form';
import { MissingFieldsProvider } from '../form/missing';
import type { MissingFieldsSummary } from '../form/missing/types';
import { SectionToc } from './SectionToc';

const sections = [
  { id: 's1', title: 'Room' },
  { id: 's2', title: 'Ownership' },
  { id: 's3', title: 'Location' },
];

const rect = (top: number) => ({ top }) as DOMRect;

/**
 * The scroller (a `#sc` div, `overflow-y: auto`) with three sections. happy-dom does no layout, so
 * give it a viewport of 500, a content height of 1500, and each section its top. The reading line is
 * the scroller's top (0) + the pinned height (0) + 1rem + 8px.
 */
const Page = () => (
  <div id="sc" style={{ overflowY: 'auto' }}>
    <section id="s1" />
    <section id="s2" />
    <section id="s3" />
    <SectionToc sections={sections} />
  </div>
);

const arrange = (tops: [number, number, number], scrollTop: number) => {
  const scroller = document.getElementById('sc') as HTMLElement;
  Object.defineProperties(scroller, {
    clientHeight: { configurable: true, value: 500 },
    scrollHeight: { configurable: true, value: 1500 },
    scrollTop: { configurable: true, value: scrollTop, writable: true },
  });
  scroller.getBoundingClientRect = () => rect(0);
  ['s1', 's2', 's3'].forEach((id, i) => {
    (document.getElementById(id) as HTMLElement).getBoundingClientRect = () => rect(tops[i]);
  });
  return scroller;
};

const scrollAndFlush = (scroller: HTMLElement) => {
  act(() => {
    scroller.dispatchEvent(new Event('scroll'));
  });
  // The handler works in the next animation frame.
  return act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
};

const current = () => screen.getByRole('link', { current: 'location' }).textContent;

describe('SectionToc', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists the sections under the heading, the first one current', () => {
    render(<Page />);
    expect(screen.getByText('On this page')).toBeInTheDocument();
    expect(screen.getAllByRole('link').map(a => a.textContent)).toEqual([
      'Room',
      'Ownership',
      'Location',
    ]);
    expect(current()).toBe('Room');
  });

  it('marks the last section whose top has passed the reading line', async () => {
    render(<Page />);
    // s2 sits on the line (a jump lands it at 1rem + slack), s3 is still below it.
    const scroller = arrange([-420, 12, 410], 420);
    await scrollAndFlush(scroller);
    expect(current()).toBe('Ownership');
  });

  it('marks the last section at the bottom of the scroller, even if it never reaches the line', async () => {
    render(<Page />);
    const scroller = arrange([-900, -400, 300], 1000);
    await scrollAndFlush(scroller);
    expect(current()).toBe('Location');
  });

  it('keeps the clicked section while its smooth scroll runs, and scrolls to it', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { user } = render(<Page />);
    const scroller = arrange([0, 400, 800], 0);
    await user.click(screen.getByRole('link', { name: 'Location' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(current()).toBe('Location');
    // A scroll event mid-jump (s1 still on the line) does not move the mark back.
    await scrollAndFlush(scroller);
    expect(current()).toBe('Location');
  });

  it('drops the heading in the compact layout', () => {
    render(
      <FormLayoutProvider layout="compact">
        <Page />
      </FormLayoutProvider>,
    );
    expect(screen.queryByText('On this page')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});

describe('SectionToc status', () => {
  const summary: MissingFieldsSummary = {
    total: 3,
    sections: [
      {
        id: 's1',
        title: 'Room',
        items: [
          { key: 'name', label: 'Name', path: 'name' },
          { key: 'rows', label: 'Rows', path: 'rows.0.qty', count: 2 },
        ],
      },
    ],
  };
  const arrangeStatus = (value: MissingFieldsSummary | null) =>
    render(
      <MissingFieldsProvider summary={value}>
        <div data-field="name" />
        <Page />
      </MissingFieldsProvider>,
    );

  it('ends each row with a tick, or an amber pill with the count', () => {
    arrangeStatus(summary);
    expect(screen.getByRole('link', { name: /Room/ })).toHaveTextContent('3 missing');
    expect(screen.getByRole('link', { name: /Ownership/ })).not.toHaveTextContent('missing');
    expect(screen.getAllByRole('img', { name: 'Complete' })).toHaveLength(2);
  });

  it('shows nothing until the page has a summary', () => {
    arrangeStatus(null);
    expect(screen.queryByRole('img', { name: 'Complete' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Room' })).toBeInTheDocument();
  });

  it('jumps to the first missing field of a section with something missing, else to the section', async () => {
    const toSection = vi.fn();
    Element.prototype.scrollIntoView = toSection;
    const { user, container } = arrangeStatus(summary);
    const toField = vi.fn();
    (container.querySelector('[data-field="name"]') as HTMLElement).scrollIntoView = toField;

    await user.click(screen.getByRole('link', { name: /Room/ }));
    // the jump scrolls on the next animation frame
    await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    expect(toField).toHaveBeenCalledTimes(1);
    expect(toSection).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: /Ownership/ }));
    expect(toSection).toHaveBeenCalledTimes(1);
  });
});
