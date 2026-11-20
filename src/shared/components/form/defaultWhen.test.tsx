import { describe, expect, it } from 'vitest';
import '@/i18n';
import { act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import { useParameterStore } from '@/shared/store';
import {
  buildingInfoField,
  condoFields,
  condoFieldsTail,
  landFillField,
} from '@/features/appraisal/configs/fields';
import { FormFields } from './FormFields';
import { FormProvider } from './FormProvider';

const fields = landFillField.filter(f => ['landFillType', 'landFillPercent'].includes(f.name));
const LABELS = {
  '01': 'Vacant land',
  '02': 'Filled',
  '03': 'Not filled',
  '04': 'Partly filled',
  '99': 'Other',
};

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
function Harness({ defaults = {} }: { defaults?: Record<string, unknown> }) {
  methods = useForm<Record<string, unknown>>({
    defaultValues: { landFillType: '', landFillPercent: null, ...defaults },
  });
  return (
    <FormProvider methods={methods} schema={z.object({}).passthrough()} missingSummary={false}>
      <FormFields fields={fields} />
      <output data-testid="dirty">{String(!!methods.formState.dirtyFields.landFillPercent)}</output>
    </FormProvider>
  );
}

const seedOptions = () =>
  useParameterStore.getState().setParameters(
    Object.entries(LABELS).map(([code, description], i) => ({
      parId: i,
      group: 'Landfill',
      country: 'th',
      language: 'en',
      code,
      description,
      isActive: true,
      seqNo: i + 1,
    })) as never,
  );
const pick = (code: keyof typeof LABELS) => screen.getByRole('radio', { name: LABELS[code] });
/** The default is set right after the change finishes emitting. */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

describe('defaultWhen: the land fill percent follows the land condition', () => {
  it('is a single-value radio, and the config names its cases', () => {
    const type = fields.find(f => f.name === 'landFillType')!;
    expect(type.type).toBe('radio-group');
    const percent = fields.find(f => f.name === 'landFillPercent')!;
    expect(percent.defaultWhen).toEqual({
      field: 'landFillType',
      cases: [
        { is: '02', value: 100 },
        { is: '03', value: 0 },
      ],
    });
  });

  it('picking filled sets 100, over whatever the percent held', async () => {
    seedOptions();
    const { user } = render(<Harness defaults={{ landFillPercent: 60 }} />);
    await user.click(pick('02'));
    await settle();
    expect(methods.getValues('landFillPercent')).toBe(100);
    // And the box shows it.
    expect(screen.getByRole('textbox', { name: /Landfill/ })).toHaveValue('100.00');
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
  });

  it('picking not filled sets 0', async () => {
    seedOptions();
    const { user } = render(<Harness defaults={{ landFillPercent: 60 }} />);
    await user.click(pick('03'));
    await settle();
    expect(methods.getValues('landFillPercent')).toBe(0);
  });

  it('leaves the percent alone for any other option', async () => {
    seedOptions();
    const { user } = render(<Harness defaults={{ landFillPercent: 60 }} />);
    for (const code of ['01', '04', '99'] as const) {
      await user.click(pick(code));
      await settle();
      expect(methods.getValues('landFillPercent')).toBe(60);
    }
  });

  it('never fires on opening a record: a saved 02 with 70 stays 70', () => {
    seedOptions();
    render(<Harness />);
    // A record landing is a reset, with both values arriving in the same commit.
    act(() => methods.reset({ landFillType: '02', landFillPercent: 70 }));
    expect(methods.getValues('landFillPercent')).toBe(70);
    // Also when the saved percent is blank: opening does not fill it.
    act(() => methods.reset({ landFillType: '03', landFillPercent: null }));
    expect(methods.getValues('landFillPercent')).toBeNull();
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  it('can be edited after the default', async () => {
    seedOptions();
    const { user } = render(<Harness />);
    await user.click(pick('02'));
    await settle();
    const box = screen.getByRole('textbox', { name: /Landfill/ });
    await user.clear(box);
    await user.type(box, '55');
    expect(Number(methods.getValues('landFillPercent'))).toBe(55);
  });
});

describe('defaultWhen: "under construction" follows the building condition', () => {
  const CONDITIONS = { '01': 'Good', '02': 'Fair', '03': 'Poor', '04': 'Under construction' };
  const seed = () =>
    useParameterStore.getState().setParameters(
      Object.entries(CONDITIONS).map(([code, description], i) => ({
        parId: i,
        group: 'BuildingCondition',
        country: 'th',
        language: 'en',
        code,
        description,
        isActive: true,
        seqNo: i + 1,
      })) as never,
    );
  const Form = ({ items }: { items: typeof buildingInfoField }) => {
    methods = useForm<Record<string, unknown>>({
      defaultValues: { buildingConditionType: '', isUnderConstruction: false },
    });
    return (
      <FormProvider methods={methods} schema={z.object({}).passthrough()} missingSummary={false}>
        <FormFields fields={items} />
      </FormProvider>
    );
  };
  const both = (list: typeof buildingInfoField, extra: typeof buildingInfoField = []) =>
    [...list, ...extra].filter(f =>
      ['isUnderConstruction', 'buildingConditionType'].includes(f.name),
    );

  it.each([
    ['building', both(buildingInfoField)],
    ['condo', both(condoFields, condoFieldsTail)],
  ])('on the %s form: picking 04 turns the toggle on, any other leaves it', async (_, items) => {
    seed();
    expect(items.find(f => f.name === 'isUnderConstruction')?.defaultWhen).toEqual({
      field: 'buildingConditionType',
      cases: [{ is: '04', value: true }],
    });
    const { user } = render(<Form items={items} />);
    for (const code of ['01', '02', '03'] as const) {
      await user.click(screen.getByRole('radio', { name: CONDITIONS[code] }));
      await settle();
      expect(methods.getValues('isUnderConstruction')).toBe(false);
    }
    await user.click(screen.getByRole('radio', { name: CONDITIONS['04'] }));
    await settle();
    expect(methods.getValues('isUnderConstruction')).toBe(true);
    // The appraiser can still switch it off afterwards.
    await user.click(screen.getByRole('radio', { name: 'No' }));
    expect(methods.getValues('isUnderConstruction')).toBe(false);
  });
});
