import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { FieldLabel, PickerButton } from './AdministrationFields';

/** The test i18n returns keys, so the "Search" text is the key. */

describe('PickerButton accessible name', () => {
  it('reads the field label first, then its own placeholder and "Search"', () => {
    render(
      <>
        <FieldLabel id="company-label" required>
          Company
        </FieldLabel>
        <PickerButton
          placeholder="Select external company"
          onClick={vi.fn()}
          labelledBy="company-label"
        />
      </>,
    );

    const name = screen.getByRole('button').getAttribute('aria-labelledby');
    expect(name).toMatch(/^company-label .+/);
    expect(
      screen.getByRole('button', { name: /^Company \*? ?Select external company .*search/i }),
    ).toBeInTheDocument();
  });

  it('is named by its own text when no label is given', () => {
    render(<PickerButton placeholder="Select staff" onClick={vi.fn()} />);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('button', { name: /Select staff/ })).toBeInTheDocument();
  });
});
