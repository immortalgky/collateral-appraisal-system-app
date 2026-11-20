import { describe, expect, it } from 'vitest';
import '@/i18n';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import { expropriateField } from './expropriationSample.fixture';
import { FormFields } from './FormFields';
import { FormLayoutProvider } from './FormLayoutProvider';
import { FormProvider } from './FormProvider';
import { FormSection, FormSheet } from './FormSheet';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { booleanChips } from './types';
import { PART_WIDTH } from './partWidth';

const byName = (n: string) => expropriateField.find(f => f.name === n)!;
const items = [
  booleanChips('limitationFlags', 'Limitations Found', [
    byName('isExpropriated'),
    byName('isInExpropriationLine'),
  ]),
  {
    ...byName('royalDecree'),
    wrapperClassName: `col-span-12 ${PART_WIDTH.half}`,
  },
  byName('expropriationRemark'),
  byName('expropriationLineRemark'),
];

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
function Harness({
  layout = 'standard',
  readOnly = false,
  defaults = {},
}: {
  layout?: 'standard' | 'compact';
  readOnly?: boolean;
  defaults?: Record<string, unknown>;
}) {
  methods = useForm<Record<string, unknown>>({
    defaultValues: {
      isExpropriated: false,
      isInExpropriationLine: false,
      royalDecree: '',
      expropriationRemark: '',
      expropriationLineRemark: '',
      ...defaults,
    },
  });
  return (
    <PageReadOnlyContext.Provider value={readOnly}>
      <FormLayoutProvider layout={layout}>
        <FormProvider methods={methods} schema={z.object({}).passthrough()} missingSummary={false}>
          <FormSheet>
            <FormSection title="Limits">
              <FormFields fields={items} />
            </FormSection>
          </FormSheet>
        </FormProvider>
      </FormLayoutProvider>
    </PageReadOnlyContext.Provider>
  );
}

const chip = (name: RegExp) => screen.getByRole('button', { name });
const field = (n: string) => document.querySelector(`[data-field="${n}"]`);
const EXPROPRIATED = /Is Expropriate|ระวางเวนคืน/;
const IN_LINE = /In Line Expropriate|แนวเวนคืน/;

describe('boolean chips', () => {
  it('draws a chip per boolean, all unselected while the booleans are false', () => {
    render(<Harness />);
    expect(chip(EXPROPRIATED)).toHaveAttribute('aria-pressed', 'false');
    expect(chip(IN_LINE)).toHaveAttribute('aria-pressed', 'false');
    expect(field('limitationFlags')).not.toBeNull();
    expect(field('royalDecree')).toBeNull();
  });

  it('keeps a part-width field at that width in Standard', async () => {
    const { user } = render(<Harness />);
    await user.click(chip(EXPROPRIATED));
    expect(field('royalDecree')).toHaveClass('col-span-12', 'w-[calc(50%-0.5714rem)]');
  });

  it('sets the boolean true on pick and false (not null) on drop', async () => {
    const { user } = render(<Harness />);
    await user.click(chip(EXPROPRIATED));
    expect(methods.getValues('isExpropriated')).toBe(true);
    expect(chip(EXPROPRIATED)).toHaveAttribute('aria-pressed', 'true');
    expect(field('royalDecree')).not.toBeNull();
    expect(field('expropriationRemark')).not.toBeNull();
    await user.click(chip(EXPROPRIATED));
    expect(methods.getValues('isExpropriated')).toBe(false);
  });

  it('shows a stored null as unselected and writes nothing on load', () => {
    render(<Harness defaults={{ isExpropriated: null }} />);
    expect(chip(EXPROPRIATED)).toHaveAttribute('aria-pressed', 'false');
    expect(methods.getValues('isExpropriated')).toBeNull();
    expect(methods.formState.isDirty).toBe(false);
  });

  it('clears what a chip opened when it is dropped; the shared decree only when both are off', async () => {
    const { user } = render(
      <Harness
        defaults={{
          isExpropriated: true,
          isInExpropriationLine: true,
          royalDecree: 'พ.ร.ฎ. 2565',
          expropriationRemark: 'ระวาง',
          expropriationLineRemark: 'แนว',
        }}
      />,
    );
    await user.click(chip(EXPROPRIATED));
    expect(methods.getValues('expropriationRemark')).toBeNull();
    expect(field('expropriationRemark')).toBeNull();
    // The line chip still holds the decree open.
    expect(methods.getValues('royalDecree')).toBe('พ.ร.ฎ. 2565');
    expect(methods.getValues('expropriationLineRemark')).toBe('แนว');
    await user.click(chip(IN_LINE));
    expect(methods.getValues('royalDecree')).toBeNull();
    expect(methods.getValues('expropriationLineRemark')).toBeNull();
    expect(field('royalDecree')).toBeNull();
  });

  it('on a read page draws only the selected chips, not interactive', () => {
    render(<Harness readOnly defaults={{ isInExpropriationLine: true }} />);
    expect(screen.queryByRole('button', { name: EXPROPRIATED })).toBeNull();
    expect(chip(IN_LINE)).toBeDisabled();
    expect(chip(IN_LINE)).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps Compact as one label/value pair with the chips, then the opened fields as pairs', async () => {
    const { user } = render(<Harness layout="compact" />);
    await user.click(chip(EXPROPRIATED));
    const names = [...document.querySelectorAll('[data-field]')].map(e =>
      e.getAttribute('data-field'),
    );
    expect(names).toEqual(['limitationFlags', 'royalDecree', 'expropriationRemark']);
    // A part-width cell is for Standard's grid: the Compact pair drops it.
    expect(document.querySelector('[data-field="royalDecree"]')!.className).not.toMatch(
      /w-1\/2|w-full/,
    );
  });
});
