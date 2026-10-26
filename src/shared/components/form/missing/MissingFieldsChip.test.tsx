import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MissingFieldsChip from './MissingFieldsChip';
import { MissingFieldsProvider } from './MissingFieldsProvider';
import { useMissingFields, useRegisterMissingReveal } from './missingFieldsContext';
import type { MissingFieldsSummary } from './types';

const tr = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}${JSON.stringify(options)}` : key,
}));
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: tr.t }),
}));

const summary: MissingFieldsSummary = {
  total: 4,
  sections: [
    {
      id: 'sec-a',
      title: 'Section A',
      items: [
        { key: 'name', label: 'Name', path: 'name' },
        { key: 'age', label: 'Age', path: 'age' },
      ],
    },
    {
      id: 'sec-b',
      title: 'Section B',
      items: [{ key: 'rows', label: 'Rows', path: 'rows.0.qty', count: 2 }],
    },
  ],
};

function Reveal({ onReveal }: { onReveal: (path: string) => void }) {
  useRegisterMissingReveal(onReveal);
  return null;
}

function renderChip({
  value = summary,
  onReveal,
  completeLabel,
}: {
  value?: MissingFieldsSummary | null;
  onReveal?: (path: string) => void;
  completeLabel?: string;
} = {}) {
  return render(
    <MissingFieldsProvider summary={value} completeLabel={completeLabel}>
      {onReveal && <Reveal onReveal={onReveal} />}
      <button type="button">outside</button>
      <MissingFieldsChip />
    </MissingFieldsProvider>,
  );
}

const chip = () => screen.getByRole('button', { name: /missing\.chip/ });

describe('MissingFieldsChip live region', () => {
  function FailSave() {
    const missing = useMissingFields();
    return (
      <button type="button" onClick={missing?.show}>
        fail
      </button>
    );
  }
  const tree = (value: MissingFieldsSummary) => (
    <MissingFieldsProvider summary={value}>
      <FailSave />
      <MissingFieldsChip />
    </MissingFieldsProvider>
  );
  const withTotal = (total: number): MissingFieldsSummary => ({ ...summary, total });
  const status = () => screen.getByRole('status');

  it('is silent on mount and while the count changes as the user types', () => {
    const { rerender } = render(tree(withTotal(4)));
    expect(status()).toHaveAttribute('aria-live', 'polite');
    expect(status()).toBeEmptyDOMElement();

    rerender(tree(withTotal(2)));
    rerender(tree(withTotal(0)));
    expect(status()).toBeEmptyDOMElement();
  });

  it('announces the count when a failed Save shows the popover, not on later recounts', async () => {
    const user = userEvent.setup();
    const { rerender } = render(tree(withTotal(4)));

    await user.click(screen.getByRole('button', { name: 'fail' }));
    expect(status()).toHaveTextContent('missing.chip{"count":4}');

    rerender(tree(withTotal(2)));
    expect(status()).toHaveTextContent('missing.chip{"count":4}');
  });

  it('announces "complete" when the form gets there after a failed Save', async () => {
    const user = userEvent.setup();
    const { rerender } = render(tree(withTotal(4)));
    await user.click(screen.getByRole('button', { name: 'fail' }));

    rerender(tree(withTotal(0)));
    expect(status()).toHaveTextContent('missing.complete');
  });

  it('announces "complete" at once when Save fails with nothing left to fix', async () => {
    const user = userEvent.setup();
    render(tree(withTotal(0)));
    await user.click(screen.getByRole('button', { name: 'fail' }));
    expect(status()).toHaveTextContent('missing.complete');
  });
});

describe('MissingFieldsChip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // happy-dom does not implement scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows the total on the chip and keeps the popover closed until clicked', async () => {
    const user = userEvent.setup();
    renderChip();
    expect(chip()).toHaveTextContent('missing.chip{"count":4}');
    expect(chip()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(chip());
    expect(chip()).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog');
    expect(chip()).toHaveAttribute('aria-controls', dialog.id);
    expect(dialog).toHaveTextContent('missing.popoverTitle{"count":2,"missing":4}');
  });

  it('groups the items under their section with the section count', async () => {
    const user = userEvent.setup();
    renderChip();
    await user.click(chip());
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Section A');
    expect(dialog).toHaveTextContent('Section B');
    // Section B holds one item standing for two fields
    expect(screen.getByText('Section B').nextElementSibling).toHaveTextContent('2');
    expect(screen.getAllByText('missing.goTo')).toHaveLength(3);
  });

  it('moves focus to the first item on open and back to the chip on Escape', async () => {
    const user = userEvent.setup();
    renderChip();
    await user.click(chip());
    expect(screen.getByRole('button', { name: /Name/ })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(chip()).toHaveFocus();
  });

  it('closes on a click outside, and on the chip itself', async () => {
    const user = userEvent.setup();
    renderChip();
    await user.click(chip());
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(chip());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(chip());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reveals the field first, then scrolls to it on the next frame', async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockImplementation(() => {
      order.push('scroll');
    });
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => frames.push(cb));
    document.body.insertAdjacentHTML('beforeend', '<div data-field="age"><input id="age" /></div>');

    renderChip({ onReveal: path => order.push(`reveal:${path}`) });
    await user.click(chip());
    await user.click(screen.getByRole('button', { name: /Age/ }));

    expect(order).toEqual(['reveal:age']);
    expect(screen.queryByRole('dialog')).toBeNull();

    frames.forEach(cb => cb(0));
    expect(order).toEqual(['reveal:age', 'scroll']);
    expect(document.getElementById('age')).toHaveFocus();
  });

  it('lands on the section when the field is not on the page', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
    document.body.insertAdjacentHTML('beforeend', '<section id="sec-b"></section>');

    renderChip();
    await user.click(chip());
    await user.click(screen.getByRole('button', { name: /Rows/ }));

    const scrolled = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock
      .contexts as Element[];
    expect(scrolled.map(el => el.id)).toEqual(['sec-b']);
  });

  it('asks every registered reveal, so a tab bar and a popover can both own fields', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const first = vi.fn();
    const second = vi.fn();

    render(
      <MissingFieldsProvider summary={summary}>
        <Reveal onReveal={first} />
        <Reveal onReveal={second} />
        <MissingFieldsChip />
      </MissingFieldsProvider>,
    );
    await user.click(chip());
    await user.click(screen.getByRole('button', { name: /Age/ }));

    expect(first).toHaveBeenCalledWith('age');
    expect(second).toHaveBeenCalledWith('age');
  });

  describe('a jump that finds nothing still moves the page', () => {
    const jumpToRows = async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 0;
      });
      renderChip();
      await user.click(chip());
      await user.click(screen.getByRole('button', { name: /Rows/ }));
    };
    const scrolledIds = () =>
      (
        (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.contexts as Element[]
      ).map(el => el.id);

    it('falls back to the form scroller when the section is not on the page', async () => {
      document.body.insertAdjacentHTML('beforeend', '<div id="form-scroll-container"></div>');
      await jumpToRows();
      expect(scrolledIds()).toEqual(['form-scroll-container']);
    });

    it('falls back to the first form, then to the top of the window', async () => {
      document.body.insertAdjacentHTML('beforeend', '<form id="only-form"></form>');
      await jumpToRows();
      expect(scrolledIds()).toEqual(['only-form']);
    });

    it('scrolls the window to the top when there is no form either', async () => {
      const scrollTo = vi.fn();
      window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
      await jumpToRows();
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  it('shows the green complete pill, not a button, when nothing is missing', () => {
    renderChip({ value: { total: 0, sections: [] } });
    expect(screen.getByText('missing.complete')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /missing/ })).toBeNull();
  });

  it('lets the caller word the complete pill', () => {
    renderChip({ value: { total: 0, sections: [] }, completeLabel: 'Ready to submit' });
    expect(screen.getByText('Ready to submit')).toBeInTheDocument();
  });

  it('renders nothing before the first check has run', () => {
    const { container } = renderChip({ value: null });
    expect(container.querySelector('[aria-haspopup]')).toBeNull();
    expect(screen.queryByText('missing.complete')).toBeNull();
  });
});
