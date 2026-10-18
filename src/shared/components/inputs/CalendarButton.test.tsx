import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import DatePickerInput from './DatePickerInput';
import DateTimePickerInput from './DateTimePickerInput';
import DateRangeInput from './DateRangeInput';

const fields = [
  ['DatePickerInput', <DatePickerInput key="d" label="Date" />],
  ['DateTimePickerInput', <DateTimePickerInput key="t" label="Date time" />],
  ['DateRangeInput', <DateRangeInput key="r" from="" to="" onChange={() => {}} />],
] as const;

describe.each(fields)('%s calendar button', (_name, field) => {
  it('is a real, labelled button that opens the calendar', async () => {
    await i18n.changeLanguage('en');
    const { user } = render(field);
    const button = screen.getByRole('button', { name: 'Open calendar' });
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);
    expect(await screen.findByRole('dialog', { name: 'Calendar' })).toBeInTheDocument();
  });

  it('is named in Thai in a Thai UI', async () => {
    await i18n.changeLanguage('th');
    render(field);
    expect(screen.getByRole('button', { name: 'เปิดปฏิทิน' })).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });
});

describe('a disabled date field', () => {
  it('has a calendar button that cannot be focused or opened', async () => {
    await i18n.changeLanguage('en');
    const { user } = render(<DatePickerInput label="Date" disabled />);
    const button = screen.getByRole('button', { name: 'Open calendar' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull();
  });
});
