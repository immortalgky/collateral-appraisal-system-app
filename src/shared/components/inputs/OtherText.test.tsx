import { afterEach, describe, expect, it, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, userEvent } from '@/test/test-utils';
import { FormFields } from '../form/FormFields';
import type { FormField } from '../form/types';
import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

const options = [
  { value: '01', label: 'Alpha' },
  { value: '99', label: 'Other' },
];
const spec = { name: 'pickOther', is: '99', maxLength: 100, label: 'Other' };

function Harness({ children, defaults = {} }: { children: React.ReactNode; defaults?: object }) {
  const methods = useForm({ defaultValues: { picks: [], pick: '', pickOther: '', ...defaults } });
  return (
    <FormProvider {...methods}>
      <form>{children}</form>
      <output data-testid="values">{JSON.stringify(methods.watch())}</output>
    </FormProvider>
  );
}
const values = () => JSON.parse(screen.getByTestId('values').textContent!);

afterEach(() => vi.restoreAllMocks());

describe('inline "other" text in a chip', () => {
  it('opens in the selected chip, takes typing without toggling it, and writes the companion', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <CheckboxGroup name="picks" options={options} other={spec} />
      </Harness>,
    );
    expect(screen.queryByLabelText('Other')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Other' }));
    const input = await screen.findByLabelText('Other');
    await user.click(input);
    await user.type(input, 'a b{Enter}c');
    expect(values().pickOther).toBe('a bc');
    // Space and Enter were text: the chip is still selected.
    expect(values().picks).toEqual(['99']);
  });

  it('works in a single-select group and has no counter', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <RadioGroup
          value={'99'}
          onChange={() => {}}
          options={options}
          other={spec}
          variant="button"
        />
      </Harness>,
    );
    await user.type(screen.getByLabelText('Other'), 'xyz');
    expect(values().pickOther).toBe('xyz');
    expect(screen.queryByText(/\/100/)).toBeNull();
  });

  it('is at least as wide as the measured text (Thai does not follow `ch`)', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const w = 'mirror' in this.dataset || 'otherMirror' in this.dataset ? 180 : 0;
      return { width: w, height: 0, top: 0, left: 0, right: w, bottom: 0, x: 0, y: 0 } as DOMRect;
    });
    render(
      <Harness defaults={{ picks: ['99'], pickOther: 'ในเขตชลประทาน' }}>
        <CheckboxGroup name="picks" options={options} other={spec} />
      </Harness>,
    );
    // A saved text opens as a typed chip; clicking it brings the input back.
    await userEvent.setup().click(await screen.findByRole('button', { name: /Other: .*edit/ }));
    const input = (await screen.findByLabelText('Other')) as HTMLInputElement;
    expect(parseFloat(input.style.width)).toBeGreaterThanOrEqual(180);
  });
});

describe('FormFields pairing', () => {
  const fields: FormField[] = [
    { type: 'radio-group', name: 'pick', options, variant: 'button' },
    {
      type: 'textarea',
      name: 'pickOther',
      label: 'Other',
      maxLength: 100,
      showWhen: { field: 'pick', is: '99' },
    },
  ];

  it('draws the companion inside the chip, not as a textarea', async () => {
    const user = userEvent.setup();
    render(
      <Harness defaults={{ pick: '99' }}>
        <FormFields fields={fields} />
      </Harness>,
    );
    expect(screen.queryByRole('textbox', { name: /./ })).toBeInTheDocument();
    expect(document.querySelector('textarea')).toBeNull();
    await user.type(screen.getByLabelText('Other'), 'hello');
    expect(values().pickOther).toBe('hello');
  });

  it('leaves a long free-text companion as a textarea', () => {
    render(
      <Harness defaults={{ pick: '99' }}>
        <FormFields fields={[fields[0], { ...fields[1], maxLength: 4000 } as FormField]} />
      </Harness>,
    );
    expect(document.querySelector('textarea')).not.toBeNull();
  });
});

describe('the "other" chip: typing, typed, editing again', () => {
  const checkbox = (defaults: object = {}, extra: object = {}) =>
    render(
      <Harness defaults={defaults}>
        <CheckboxGroup name="picks" options={options} other={spec} {...extra} />
      </Harness>,
    );
  const radio = (defaults: object = {}) =>
    render(
      <Harness defaults={defaults}>
        <RadioGroup
          name="pick"
          value={(defaults as { pick?: string }).pick ?? ''}
          onChange={() => {}}
          options={options}
          other={spec}
          variant="button"
        />
      </Harness>,
    );

  it('picking it opens an input with a placeholder and focus, and no "other:" label', async () => {
    const user = userEvent.setup();
    checkbox();
    await user.click(screen.getByRole('button', { name: 'Other' }));
    const input = screen.getByLabelText('Other');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('placeholder', 'Specify other...');
    expect(screen.queryByText('Other:')).toBeNull();
  });

  it('typing then leaving turns it into a selected chip with the text and a pencil', async () => {
    const user = userEvent.setup();
    checkbox();
    await user.click(screen.getByRole('button', { name: 'Other' }));
    await user.type(screen.getByLabelText('Other'), 'น้ำเงินทแยงขาว');
    expect(screen.getByLabelText('Other')).toBeInTheDocument();
    await user.tab();
    await user.tab();
    const chip = screen.getByRole('button', { name: 'Other: น้ำเงินทแยงขาว, edit' });
    expect(chip).toHaveTextContent('น้ำเงินทแยงขาว');
    expect(chip).toHaveAttribute('title', 'น้ำเงินทแยงขาว');
    expect(chip.querySelector('use')?.getAttribute('xlink:href')).toMatch(/#pen$/);
    expect(screen.queryByLabelText('Other')).toBeNull();
    expect(values().picks).toEqual(['99']);
    expect(values().pickOther).toBe('น้ำเงินทแยงขาว');
  });

  it('clicking the typed chip brings the input back, focused, caret at the end', async () => {
    const user = userEvent.setup();
    checkbox({ picks: ['99'], pickOther: 'abc' });
    await user.click(screen.getByRole('button', { name: 'Other: abc, edit' }));
    const input = screen.getByLabelText('Other') as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(3);
    await user.type(input, 'd');
    expect(values().pickOther).toBe('abcd');
  });

  it('Enter on the typed chip edits it too', async () => {
    const user = userEvent.setup();
    checkbox({ picks: ['99'], pickOther: 'abc' });
    screen.getByRole('button', { name: 'Other: abc, edit' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Other')).toHaveFocus();
  });

  it('a blank text stays selected and stays an input after leaving', async () => {
    const user = userEvent.setup();
    checkbox();
    await user.click(screen.getByRole('button', { name: 'Other' }));
    await user.tab();
    await user.tab();
    expect(screen.getByLabelText('Other')).toBeInTheDocument();
    expect(values().picks).toEqual(['99']);
  });

  it('emptying a typed text and leaving keeps it selected, as an input', async () => {
    const user = userEvent.setup();
    checkbox({ picks: ['99'], pickOther: 'abc' });
    await user.click(screen.getByRole('button', { name: 'Other: abc, edit' }));
    await user.clear(screen.getByLabelText('Other'));
    await user.tab();
    await user.tab();
    expect(screen.getByLabelText('Other')).toBeInTheDocument();
    expect(values().picks).toEqual(['99']);
  });

  it('the × deselects it and drops its text, with the text still being typed', async () => {
    const user = userEvent.setup();
    checkbox({ picks: ['99'], pickOther: '' });
    await user.type(screen.getByLabelText('Other'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Remove other' }));
    expect(values().picks).toEqual([]);
    expect(screen.queryByLabelText('Other')).toBeNull();
  });

  it('a saved text opens as the typed chip without taking focus', () => {
    checkbox({ picks: ['99'], pickOther: 'abc' });
    expect(screen.getByRole('button', { name: 'Other: abc, edit' })).not.toHaveFocus();
    expect(screen.queryByLabelText('Other')).toBeNull();
  });

  it('disabled shows the typed chip, no pencil, and cannot be edited', async () => {
    const user = userEvent.setup();
    checkbox({ picks: ['99'], pickOther: 'abc' }, { disabled: true });
    // Disabled: the name carries the caption and the text, and no "edit".
    const chip = screen.getByRole('button', { name: 'Other: abc' });
    expect(chip).toBeDisabled();
    expect(chip.querySelector('use')).toBeNull();
    await user.click(chip);
    expect(screen.queryByLabelText('Other')).toBeNull();
  });

  it('disabled with "other" picked and no text shows the option\'s own caption, not an empty chip', () => {
    checkbox({ picks: ['99'], pickOther: '' }, { disabled: true });
    const chip = screen.getByRole('button', { name: 'Other' });
    expect(chip).toBeDisabled();
    expect(chip).toHaveTextContent('Other');
  });

  it('disabled with no text and no option caption falls back to the fixed "Other" caption', () => {
    render(
      <Harness defaults={{ picks: ['99'], pickOther: '' }}>
        <CheckboxGroup
          name="picks"
          options={[
            { value: '01', label: 'Alpha' },
            { value: '99', label: '' },
          ]}
          other={spec}
          disabled
        />
      </Harness>,
    );
    const chip = screen.getByRole('button', { name: 'Other' });
    expect(chip).toBeDisabled();
    expect(chip).toHaveTextContent('Other');
  });

  it('keeps the exclusive rule: a chip that stands alone still clears the other chip', async () => {
    const user = userEvent.setup();
    render(
      <Harness defaults={{ picks: ['99'], pickOther: 'abc' }}>
        <CheckboxGroup name="picks" options={options} other={spec} exclusiveValues={['01']} />
      </Harness>,
    );
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(values().picks).toEqual(['01']);
  });

  it('Space and Enter on the typed chip edit it, in a checkbox group and in a radio group', async () => {
    const user = userEvent.setup();
    for (const key of ['[Space]', '{Enter}']) {
      const { unmount } = radio({ pick: '99', pickOther: 'abc' });
      screen.getByRole('radio', { name: 'Other: abc, edit' }).focus();
      await user.keyboard(key);
      expect(screen.getByLabelText('Other')).toHaveFocus();
      unmount();
    }
    for (const key of ['[Space]', '{Enter}']) {
      const { unmount } = checkbox({ picks: ['99'], pickOther: 'abc' });
      screen.getByRole('button', { name: 'Other: abc, edit' }).focus();
      await user.keyboard(key);
      expect(screen.getByLabelText('Other')).toHaveFocus();
      unmount();
    }
  });

  it('works the same in a radio group: typed chip, edit, and the × clears the choice', async () => {
    const user = userEvent.setup();
    radio({ pick: '99', pickOther: 'abc' });
    const chip = screen.getByRole('radio', { name: 'Other: abc, edit' });
    expect(chip).toHaveAttribute('aria-checked', 'true');
    await user.click(chip);
    expect(screen.getByLabelText('Other')).toHaveFocus();
  });
});
