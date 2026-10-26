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
