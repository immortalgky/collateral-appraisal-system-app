/**
 * Locks the three ways the segmented date field could show one date while the form held another,
 * or shout "Invalid date" at someone who is still typing.
 */
import { describe, it, expect } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { useDateSegmentInput } from './useDateSegmentInput';

function Harness({
  initial = null,
  withTime = false,
  validate,
}: {
  initial?: Date | null;
  withTime?: boolean;
  validate?: (date: Date) => string | null;
}) {
  const [value, setValue] = useState<Date | null>(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const { error, inputProps, showValue } = useDateSegmentInput({
    value,
    withTime,
    inputRef,
    onCommit: setValue,
    validate,
  });
  const iso = (d: Date | null) =>
    d
      ? `${d.toLocaleDateString('en-CA')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : 'null';
  return (
    <>
      <input aria-label="date" ref={inputRef} {...inputProps} />
      <output data-testid="value">{iso(value)}</output>
      <output data-testid="error">{error ?? ''}</output>
      {/* Stands in for the calendar popover: it sets the form value and tells the field, exactly
          as DatePickerInput.handleDaySelect does. */}
      <button
        type="button"
        onClick={() => {
          setValue(new Date(2026, 8, 20));
          showValue(new Date(2026, 8, 20));
        }}
      >
        pick 20
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(new Date(2026, 8, 5));
          showValue(new Date(2026, 8, 5));
        }}
      >
        pick 5
      </button>
    </>
  );
}

const field = () => screen.getByLabelText('date') as HTMLInputElement;
const value = () => screen.getByTestId('value').textContent;
const error = () => screen.getByTestId('error').textContent;

describe('what reaches the form', () => {
  const noFutureDates = (date: Date) =>
    date > new Date(2026, 8, 6, 23, 59) ? 'Cannot select a future date' : null;

  it('clears a rejected value when the calendar re-picks the date already in force', async () => {
    const user = userEvent.setup();
    render(<Harness initial={new Date(2026, 8, 5)} validate={noFutureDates} />);

    await user.click(field());
    await user.keyboard('25');
    expect(error()).toBe('Cannot select a future date');

    // Picking what the form already holds emits nothing — no new value ever arrives — so the
    // field has to be told, or the rejected text and its message stay on screen.
    await user.click(screen.getByRole('button', { name: 'pick 5' }));

    expect(field().value).toBe('05/09/2026');
    expect(error()).toBe('');
    expect(value()).toBe('2026-09-05 00:00');
  });

  it('never publishes the date a half-typed segment happens to make', async () => {
    const user = userEvent.setup();
    render(<Harness initial={new Date(2026, 8, 3)} validate={noFutureDates} />);

    await user.click(field());
    // Retyping the day walks through 02 — complete, real and allowed — before reaching 25, which
    // the rule rejects. If the intermediate had been published, the form would be left holding a
    // date the user never chose while the field showed the one they did.
    await user.keyboard('25');

    expect(field().value).toBe('25/09/2026');
    expect(error()).toBe('Cannot select a future date');
    expect(value()).toBe('2026-09-03 00:00');
  });

  it('publishes a single-digit day once the caret leaves it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={new Date(2026, 8, 3)} />);

    await user.click(field());
    await user.keyboard('2');
    await user.tab();

    expect(value()).toBe('2026-09-02 00:00');
  });
});

describe('every way out of a segment', () => {
  const noPastDates = (date: Date) =>
    date < new Date(2026, 8, 6) ? 'Cannot select a past date' : null;

  it('publishes a single digit when Enter submits the form around it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={new Date(2026, 8, 16)} />);
    await user.click(field());

    // "1" cannot auto-advance — 10..19 are still reachable — and Enter never fires a blur, so
    // without settling here the form would save the 16th while the field read the 1st.
    await user.keyboard('1{Enter}');

    expect(field().value).toBe('01/09/2026');
    expect(value()).toBe('2026-09-01 00:00');
  });

  it('publishes a single digit when the caret arrows off the end of the field', async () => {
    const user = userEvent.setup();
    render(<Harness initial={new Date(2026, 8, 16)} />);
    await user.click(field());

    // ArrowLeft on the leftmost segment moves nowhere, but the segment is still finished with.
    await user.keyboard('1{ArrowLeft}');

    expect(value()).toBe('2026-09-01 00:00');
  });

  it('leaves a stored time of day alone when the field only shows the date', async () => {
    const user = userEvent.setup();
    // A server DateTime behind a date-only field. Focusing and tabbing out is not an edit, so
    // nothing may be published — publishing would truncate 09:30 to midnight, and where a server
    // offset had already pushed the instant to the evening before, walk the date back a day.
    render(<Harness initial={new Date(2026, 8, 1, 9, 30)} />);

    await user.click(field());
    await user.tab();

    expect(value()).toBe('2026-09-01 09:30');
    expect(error()).toBe('');
  });

  it('can be emptied with Backspace from the segment it opens on', async () => {
    const user = userEvent.setup();
    render(<Harness initial={new Date(2026, 8, 5)} />);

    // Focus lands on the day. Each press clears the segment it is on, then the nearest one that
    // still holds something — otherwise month and year would sit there untouched and blur would
    // put the whole date back.
    await user.click(field());
    await user.keyboard('{Backspace}{Backspace}{Backspace}');
    await user.tab();

    expect(field().value).toBe('');
    expect(value()).toBe('null');
  });

  it('does not judge a stored value the user never touched', async () => {
    const user = userEvent.setup();
    // A meeting that has already started, opened for editing under a no-past-dates rule.
    render(<Harness initial={new Date(2026, 8, 1)} validate={noPastDates} />);

    await user.click(field());
    await user.tab();

    expect(error()).toBe('');
    expect(value()).toBe('2026-09-01 00:00');
  });
});

describe('segmented date-time input', () => {
  it('refuses an out-of-range hour instead of rolling into the next day', async () => {
    const user = userEvent.setup();
    render(<Harness withTime />);
    await user.click(field());

    // "2" waits for a second digit (20..23 are still reachable), and "9" fills the segment — so
    // 29 lands in the hour. new Date(…, 29, …) does not complain, it becomes 05:00 the next day,
    // which would move an appointment by a day with nothing on screen saying so.
    await user.keyboard('060920262900');
    expect(value()).toBe('null');
    expect(error()).toBe('Invalid date');
  });

  it('takes a legal time', async () => {
    const user = userEvent.setup();
    render(<Harness withTime />);
    await user.click(field());

    await user.keyboard('060920261430');
    expect(value()).toBe('2026-09-06 14:30');
    expect(error()).toBe('');
  });
});

describe('segmented date input', () => {
  it('stays quiet while the year is being typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());

    await user.keyboard('0509');
    for (const digit of ['2', '0', '2']) {
      await user.keyboard(digit);
      // Every one of these is an impossible year on its own — and saying so mid-word helps nobody.
      expect(error()).toBe('');
    }
    await user.keyboard('6');
    expect(error()).toBe('');
    expect(value()).toBe('2026-09-05 00:00');
  });

  it('says so on blur when what was typed is still not a date', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());

    await user.keyboard('05092');
    await user.tab();
    expect(error()).toBe('Invalid date');
  });

  it('raises a lone 0 to the first of the month when the caret leaves', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());

    // "0" cannot advance on its own — 01..09 are still reachable — so it is fixed on the way out.
    await user.keyboard('0');
    await user.keyboard('{ArrowRight}');
    expect(field().value.startsWith('01/')).toBe(true);
  });

  it('rolls a half-typed value back on blur even when a segment had to be clamped', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());

    // Only the day was touched, and as a lone "0" at that. Clamping it to the 1st does not make
    // the field a date, so blur must still fall back to what the form holds — an empty field,
    // not "01/mm/yyyy" sitting there looking like a value.
    await user.keyboard('0');
    await user.tab();

    expect(field().value).toBe('');
    expect(value()).toBe('null');
    expect(error()).toBe('');
  });

  it('follows the form back to a date it committed earlier', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard('05092026');
    expect(value()).toBe('2026-09-05 00:00');

    await user.click(screen.getByRole('button', { name: 'pick 20' }));
    expect(field().value).toBe('20/09/2026');

    // Same date the field itself committed a moment ago: the guard that stops our own echo from
    // wiping a half-typed segment must not swallow this.
    await user.click(screen.getByRole('button', { name: 'pick 5' }));
    expect(field().value).toBe('05/09/2026');
  });
});
