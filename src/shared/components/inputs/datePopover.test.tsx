import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import { render, screen } from '@/test/test-utils';
import DatePickerInput from './DatePickerInput';
import DateTimePickerInput from './DateTimePickerInput';

/**
 * The calendars are portalled out of the field (react-day-picker builds a <table>, which the form
 * grid must never see inside a field) and positioned by floating-ui. These cover what the pickers
 * add on top: where the popover lives, that it stays hidden until positioned, and how it closes.
 */

/** Opens the month / year panel, then the year grid, and picks a year with the keyboard. */
async function pickYearByKeyboard(user: ReturnType<typeof render>['user']) {
  const year = String(new Date().getFullYear());
  await user.click(screen.getByRole('button', { name: format(new Date(), 'MMMM yyyy') }));
  await user.click(await screen.findByRole('button', { name: year }));
  const target = await screen.findByRole('button', { name: String(new Date().getFullYear() + 1) });
  target.focus();
  await user.keyboard('{Enter}');
}

describe('DateTimePickerInput popover', () => {
  it('portals the calendar out of the field, takes focus, and returns it on Escape', async () => {
    const { container, user } = render(<DateTimePickerInput label="When" />);
    const opener = screen.getByRole('button', { name: 'Open calendar' });
    await user.click(opener);

    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
    // Positioned and shown, with focus moved inside.
    await waitFor(() => expect(dialog).toHaveStyle({ opacity: '1' }));
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside after a click on a part of the popover that cannot take focus', async () => {
    const { user } = render(<DateTimePickerInput label="When" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    // A weekday header is not focusable: focus falls back to the popover itself.
    await user.click(dialog.querySelector('thead th') as HTMLElement);

    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('keeps focus inside when a month is picked from the month / year panel', async () => {
    const { user } = render(<DateTimePickerInput label="When" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.click(screen.getByRole('button', { name: format(new Date(), 'MMMM yyyy') }));
    // Picking a month closes the panel, which unmounts the button that held focus.
    await user.click(await screen.findByRole('button', { name: 'Mar' }));
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  });

  it('closes, and lifts aria-hidden from the page, when focus goes back to its own input', async () => {
    const { container, user } = render(<DateTimePickerInput label="When" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await screen.findByRole('dialog', { name: 'Calendar' });
    expect(
      container.querySelector('[aria-hidden="true"]') ?? container.closest('[aria-hidden="true"]'),
    ).not.toBeNull();

    await user.click(container.querySelector('input') as HTMLInputElement);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());
    expect(document.querySelectorAll('[aria-hidden="true"]:not(svg)')).toHaveLength(0);
    expect(container.querySelector('input')).toHaveFocus();
  });

  it('keeps focus and the Tab trap inside after a year is picked from the year grid', async () => {
    const { user } = render(<DateTimePickerInput label="When" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await pickYearByKeyboard(user);

    // Back on the month grid, focus is on a month, not on <body>.
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    expect(document.activeElement).toHaveTextContent(/^[A-Z][a-z]{2}$/);
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on a press outside', async () => {
    const { user } = render(
      <div>
        <DateTimePickerInput label="When" />
        <button type="button">elsewhere</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await screen.findByRole('dialog', { name: 'Calendar' });

    // The modal calendar hides the page behind it from assistive tech, hence `hidden: true`.
    await user.click(screen.getByRole('button', { name: 'elsewhere', hidden: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());
  });
});

describe('DatePickerInput popover', () => {
  it('portals the calendar out of the field and closes on Escape', async () => {
    const { container, user } = render(<DatePickerInput label="Day" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));

    await waitFor(() => expect(document.querySelector('.react-day-picker')).not.toBeNull());
    const grid = document.querySelector('.react-day-picker') as HTMLElement;
    expect(container).not.toContainElement(grid);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('.react-day-picker')).toBeNull());
  });

  it('takes focus on open and gives it back to the calendar button on Escape', async () => {
    const { user } = render(<DatePickerInput label="Day" />);
    const opener = screen.getByRole('button', { name: 'Open calendar' });
    await user.click(opener);

    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('lands focus on an enabled day when the selected day is disabled', async () => {
    // Today is selected but not allowed: focus must not aim at it (a disabled button cannot take it).
    const { user } = render(<DatePickerInput label="Day" value={new Date()} disableToday />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBeDisabled();
    expect(active.closest('td')).not.toHaveAttribute('aria-selected', 'true');
  });

  it('closes when focus leaves it, and opening a second picker closes the first', async () => {
    const { user } = render(
      <div>
        <DatePickerInput label="First" />
        <DatePickerInput label="Second" />
      </div>,
    );
    const [first, second] = screen.getAllByRole('button', { name: 'Open calendar' });
    await user.click(first);
    await screen.findByRole('dialog', { name: 'Calendar' });

    await user.click(second);
    await waitFor(() =>
      expect(screen.getAllByRole('dialog', { name: 'Calendar' })).toHaveLength(1),
    );
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('closes when Tab leaves the non-modal calendar', async () => {
    const { user } = render(
      <div>
        <DatePickerInput label="Day" />
        <button type="button">after</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await screen.findByRole('dialog', { name: 'Calendar' });

    for (let i = 0; i < 30 && screen.queryByRole('dialog', { name: 'Calendar' }); i++) {
      await user.tab();
    }
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());
  });

  it('keeps focus inside when a month is picked from the month / year panel', async () => {
    const { user } = render(<DatePickerInput label="Day" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.click(screen.getByRole('button', { name: format(new Date(), 'MMMM yyyy') }));
    await user.click(await screen.findByRole('button', { name: 'Mar' }));
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  });

  it('keeps focus inside the calendar after a year is picked from the year grid', async () => {
    const { user } = render(<DatePickerInput label="Day" />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Calendar' });
    await pickYearByKeyboard(user);

    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    expect(document.activeElement).toHaveTextContent(/^[A-Z][a-z]{2}$/);
    // Still inside after a few Tabs through the month grid: the calendar is open, focus is not lost.
    for (let i = 0; i < 3; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  describe('onBlur', () => {
    const setup = () => {
      const onBlur = vi.fn();
      const view = render(
        <div>
          <DatePickerInput label="Day" onBlur={onBlur} />
          <button type="button">elsewhere</button>
        </div>,
      );
      return { onBlur, ...view };
    };

    it('is not reported while focus moves between the input, the button and the calendar', async () => {
      const { onBlur, user, container } = setup();
      await user.click(container.querySelector('input') as HTMLInputElement);
      await user.tab(); // the calendar button
      await user.keyboard('{Enter}');
      await screen.findByRole('dialog', { name: 'Calendar' });
      await user.keyboard('{Escape}'); // focus goes back to the calendar button
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());

      expect(onBlur).not.toHaveBeenCalled();
    });

    it('is reported once when the calendar closes by a press elsewhere', async () => {
      const { onBlur, user } = setup();
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      await screen.findByRole('dialog', { name: 'Calendar' });

      await user.click(screen.getByRole('button', { name: 'elsewhere' }));
      await waitFor(() => expect(onBlur).toHaveBeenCalledTimes(1));
    });

    it('is reported once when Tab carries focus out of the calendar', async () => {
      const { onBlur, user } = setup();
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      await screen.findByRole('dialog', { name: 'Calendar' });

      for (let i = 0; i < 30 && screen.queryByRole('dialog', { name: 'Calendar' }); i++) {
        await user.tab();
      }
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull());
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });
});
