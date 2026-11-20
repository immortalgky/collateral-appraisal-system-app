import { describe, expect, it } from 'vitest';
import '@/i18n';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import { expropriateField } from './expropriationSample.fixture';
import { FormFields } from './FormFields';
import { FormLayoutProvider } from './FormLayoutProvider';
import { FormProvider } from './FormProvider';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { FormSection, FormSheet } from './FormSheet';
import { flowGroup, type FormFieldItem } from './types';

/** "Expropriated" and "in the expropriation line": two toggles, the decree and the remarks they open. */
const byName = (n: string) => expropriateField.find(f => f.name === n)!;
const items = [
  flowGroup(
    [byName('isExpropriated'), byName('isInExpropriationLine')],
    [
      { ...byName('royalDecree'), wrapperClassName: 'col-span-3' },
      byName('expropriationRemark'),
      byName('expropriationLineRemark'),
    ],
  ),
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

const block = () => document.querySelector('[data-flow-follow]');
const decree = () => document.querySelector('[data-field="royalDecree"]');
const yes = (field: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-field="${field}"] [role=radio]`)].find(
    r => r.textContent === 'Yes',
  )!;

describe('flow group: a toggle row and the block it opens', () => {
  it('draws no follow-up block while every toggle is No', () => {
    render(<Harness />);
    expect(block()).toBeNull();
    expect(decree()).toBeNull();
    // The toggles are there, at their own width in a wrapping row.
    expect(document.querySelector('[data-field="isExpropriated"]')!.parentElement).toHaveClass(
      'flex',
      'flex-wrap',
    );
  });

  it('opens the decree and the remark with either answer (an OR), and the remark of the other stays shut', async () => {
    const { user } = render(<Harness />);
    await user.click(yes('isInExpropriationLine'));
    expect(block()).not.toBeNull();
    expect(decree()).not.toBeNull();
    expect(document.querySelector('[data-field="expropriationLineRemark"]')).not.toBeNull();
    expect(document.querySelector('[data-field="expropriationRemark"]')).toBeNull();
    await user.click(yes('isExpropriated'));
    expect(document.querySelector('[data-field="expropriationRemark"]')).not.toBeNull();
    // One decree for both.
    expect(document.querySelectorAll('[data-field="royalDecree"]')).toHaveLength(1);
  });

  it('hides the decree and clears it when both toggles go back to No', async () => {
    const { user } = render(
      <Harness defaults={{ isExpropriated: true, royalDecree: 'พ.ร.ฎ. 2565' }} />,
    );
    expect(screen.getByDisplayValue('พ.ร.ฎ. 2565')).toBeInTheDocument();
    const no = [
      ...document.querySelectorAll<HTMLElement>('[data-field="isExpropriated"] [role=radio]'),
    ].find(r => r.textContent === 'No')!;
    await user.click(no);
    expect(decree()).toBeNull();
    expect(block()).toBeNull();
    expect(methods.getValues('royalDecree')).toBeNull();
  });

  it('clears the remark too when the last toggle that opened it goes No (the block hides, it does not unmount)', async () => {
    const { user } = render(
      <Harness defaults={{ isExpropriated: true, expropriationRemark: 'ที่ดินถูกเวนคืน' }} />,
    );
    const no = [
      ...document.querySelectorAll<HTMLElement>('[data-field="isExpropriated"] [role=radio]'),
    ].find(r => r.textContent === 'No')!;
    await user.click(no);
    expect(block()).toBeNull();
    expect(methods.getValues('expropriationRemark')).toBeNull();
  });

  it('hides a stored decree while both are No (edit and read pages), without clearing it on load', () => {
    for (const readOnly of [false, true]) {
      const { unmount } = render(
        <Harness readOnly={readOnly} defaults={{ royalDecree: 'พ.ร.ฎ. 2565' }} />,
      );
      expect(decree()).toBeNull();
      expect(block()).toBeNull();
      // Clearing runs on a visible -> hidden change, not on load: the stored value is left as it is.
      expect(methods.getValues('royalDecree')).toBe('พ.ร.ฎ. 2565');
      unmount();
    }
  });

  it('on a read page with nothing stored draws no block', () => {
    render(<Harness readOnly />);
    expect(block()).toBeNull();
  });

  it('keeps Compact as label/value pairs, with no tinted block, and the same show rules', async () => {
    const { user } = render(<Harness layout="compact" />);
    expect(block()).toBeNull();
    expect(decree()).toBeNull();
    await user.click(yes('isExpropriated'));
    expect(decree()).not.toBeNull();
    expect(block()).toBeNull();
  });
});

describe('flow group: a chip group in the row keeps its in-chip "other"', () => {
  const chips: FormFieldItem[] = [
    flowGroup(
      [
        byName('isExpropriated'),
        {
          type: 'radio-group',
          label: 'Check By',
          name: 'checkBy',
          variant: 'button',
          options: [
            { value: '01', label: 'Plot' },
            { value: '99', label: 'Other' },
          ],
        },
      ],
      [
        {
          type: 'textarea',
          label: 'Other',
          name: 'checkByOther',
          showWhen: { field: 'checkBy', is: '99' },
          maxLength: 100,
        },
      ],
    ),
  ];

  function ChipHarness() {
    methods = useForm<Record<string, unknown>>({
      defaultValues: { isExpropriated: false, checkBy: '99', checkByOther: 'by drone' },
    });
    return (
      <FormLayoutProvider layout="standard">
        <FormProvider methods={methods} schema={z.object({}).passthrough()} missingSummary={false}>
          <FormSheet>
            <FormSection title="Location">
              <FormFields fields={chips} />
            </FormSection>
          </FormSheet>
        </FormProvider>
      </FormLayoutProvider>
    );
  }

  it('edits the text in the chip and draws no block or textarea for it', () => {
    render(<ChipHarness />);
    expect(screen.getByText('by drone')).toBeInTheDocument();
    expect(document.querySelector('[data-field="checkByOther"]')).toBeNull();
    expect(block()).toBeNull();
  });
});
