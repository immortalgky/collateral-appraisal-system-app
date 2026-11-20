import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { useParameterStore } from '@/shared/store';
import { FormFields, FormLayoutProvider, FormSection, FormSheet } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import {
  environmentProblemFields,
  environmentProblemItems,
  expropriateField,
  expropriationFields,
  landBoundaryField,
} from './fields';

const LONG = 'น้ำท่วมขังสูงประมาณ 30 ซม. ช่วงฤดูฝน\nระบายออกช้า ประมาณ 2-3 วัน';

const Harness = ({ readOnly = false }: { readOnly?: boolean }) => {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: {
      hasFloodProblem: true,
      floodProblemRemark: LONG,
      hasPollutionProblem: false,
      pollutionType: [],
      pollutionTypeOther: '',
    },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <FormFields fields={environmentProblemFields} />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
};

describe('flood remark', () => {
  it('is a four-row textarea limited to 4000 characters, with a counter', () => {
    render(<Harness />);
    const box = screen.getByRole('textbox', { name: /Flood Remark/ });
    expect(box.tagName).toBe('TEXTAREA');
    expect(box).toHaveAttribute('maxlength', '4000');
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveValue(LONG);
    expect(screen.getByText(`${LONG.length}/4,000`)).toBeInTheDocument();
  });

  it('appears only while there is a flood problem', () => {
    const Off = () => {
      const methods = useForm<Record<string, unknown>>({
        defaultValues: { hasFloodProblem: false, floodProblemRemark: '' },
      });
      return (
        <FormProvider {...methods}>
          <FormFields fields={environmentProblemFields} />
        </FormProvider>
      );
    };
    render(<Off />);
    expect(screen.queryByRole('textbox', { name: /Flood Remark/ })).toBeNull();
  });

  it('reads as text on a read page, line break kept', () => {
    render(<Harness readOnly />);
    expect(document.querySelector('textarea')).toBeNull();
    const value = screen.getByText(/น้ำท่วมขังสูงประมาณ 30 ซม\./);
    expect(value.textContent).toBe(LONG);
    expect(value.className).toMatch(/whitespace-pre-line/);
  });
});

describe('other legal limitations', () => {
  const LIMIT = 'อยู่ในเขตควบคุมความสูงอาคารของสนามบิน และมีข้อกำหนดห้ามก่อสร้างเกิน 12 เมตร';
  const Limit = ({ readOnly = false }: { readOnly?: boolean }) => {
    const methods = useForm<Record<string, unknown>>({
      defaultValues: { otherLegalLimitations: LIMIT },
    });
    return (
      <FormReadOnlyContext.Provider value={readOnly}>
        <FormProvider {...methods}>
          <FormFields fields={landBoundaryField.filter(f => f.name === 'otherLegalLimitations')} />
        </FormProvider>
      </FormReadOnlyContext.Provider>
    );
  };

  it('is a four-row textarea of up to 4000 characters, full width, always shown and not required', () => {
    render(<Limit />);
    const box = screen.getByRole('textbox', { name: /Other Limitations Found/ });
    expect(box.tagName).toBe('TEXTAREA');
    expect(box).toHaveAttribute('maxlength', '4000');
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveValue(LIMIT);
    expect(document.querySelector('[data-field="otherLegalLimitations"]')?.className).toMatch(
      /col-span-12/,
    );
    const [field] = landBoundaryField.filter(f => f.name === 'otherLegalLimitations');
    expect(field.showWhen).toBeUndefined();
    expect(field.requiredWhen).toBeUndefined();
    const schema = buildFormSchema([field]);
    expect(schema.safeParse({ otherLegalLimitations: 'ก'.repeat(4000) }).success).toBe(true);
    expect(schema.safeParse({ otherLegalLimitations: 'ก'.repeat(4001) }).success).toBe(false);
    expect(schema.safeParse({ otherLegalLimitations: '' }).success).toBe(true);
  });

  it('reads as text on a read page', () => {
    render(<Limit readOnly />);
    expect(document.querySelector('textarea')).toBeNull();
    expect(screen.getByText(LIMIT)).toBeInTheDocument();
  });
});

const setPollution = () =>
  useParameterStore.getState().setParameters(
    [
      ['01', 'กลิ่น'],
      ['99', 'อื่นๆ'],
    ].map(([code, description], i) => ({
      parId: i,
      group: 'Pollution',
      country: 'th',
      language: 'en',
      code,
      description,
      isActive: true,
      seqNo: i + 1,
    })) as never,
  );

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Items = ({ defaults = {} }: { defaults?: Record<string, unknown> }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: {
      hasFloodProblem: false,
      floodProblemRemark: '',
      hasPollutionProblem: false,
      pollutionType: [],
      pollutionTypeOther: '',
      pollutionProblemRemark: '',
      hasOtherEnvironmentProblem: false,
      otherEnvironmentProblemRemark: '',
      ...defaults,
    },
  });
  return (
    <FormLayoutProvider layout="standard">
      <FormProvider {...methods}>
        <FormSheet>
          <FormSection title="Environment">
            <FormFields fields={environmentProblemItems} />
          </FormSection>
        </FormSheet>
      </FormProvider>
    </FormLayoutProvider>
  );
};
const chip = (label: string) => screen.getByRole('button', { name: label });
const field = (name: string) => document.querySelector(`[data-field="${name}"]`);

describe('the problem chips', () => {
  it('are one row of three, each its own boolean, none selected by default', () => {
    render(<Items />);
    const names = ['Flood Problem', 'Pollution Problem', 'Other Environment Problem'];
    for (const n of names) expect(chip(n)).toHaveAttribute('aria-pressed', 'false');
    expect(chip(names[0]).parentElement).toBe(chip(names[2]).parentElement);
    // Nothing opens until a chip is on.
    for (const n of [
      'floodProblemRemark',
      'pollutionType',
      'pollutionProblemRemark',
      'otherEnvironmentProblemRemark',
    ])
      expect(field(n)).toBeNull();
  });

  it('write true when picked and false (not null) when put back', async () => {
    const { user } = render(<Items />);
    await user.click(chip('Other Environment Problem'));
    expect(methods.getValues('hasOtherEnvironmentProblem')).toBe(true);
    await user.click(chip('Other Environment Problem'));
    expect(methods.getValues('hasOtherEnvironmentProblem')).toBe(false);
    // Untouched chips keep the false the form started with.
    expect(methods.getValues('hasFloodProblem')).toBe(false);
  });

  it('open their blocks in chip order: flood remark, pollution chips and remark, other remark', () => {
    setPollution();
    render(
      <Items
        defaults={{
          hasFloodProblem: true,
          hasPollutionProblem: true,
          pollutionType: ['99'],
          pollutionTypeOther: 'ควันโรงงาน',
          hasOtherEnvironmentProblem: true,
        }}
      />,
    );
    const order = [
      'environmentProblems',
      'floodProblemRemark',
      'pollutionType',
      'pollutionProblemRemark',
      'otherEnvironmentProblemRemark',
    ].map(n => field(n)!);
    order.forEach(el => expect(el).not.toBeNull());
    for (let i = 1; i < order.length; i++)
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    // The "other" pollution type is typed in its chip, not a row of its own.
    expect(screen.getByText('ควันโรงงาน')).toBeInTheDocument();
    expect(field('pollutionTypeOther')?.querySelector('textarea') ?? null).toBeNull();
  });
});

describe('the other-problem remark', () => {
  const [remark] = environmentProblemFields.filter(f => f.name === 'otherEnvironmentProblemRemark');

  it('is a four-row textarea of up to 4000 characters, required while its chip is on', () => {
    expect(remark.requiredWhen).toEqual({ field: 'hasOtherEnvironmentProblem', is: true });
    expect(remark.showWhen).toEqual({ field: 'hasOtherEnvironmentProblem', is: true });
    const schema = buildFormSchema(
      environmentProblemFields.filter(f =>
        ['hasOtherEnvironmentProblem', 'otherEnvironmentProblemRemark'].includes(f.name),
      ),
    );
    const on = { hasOtherEnvironmentProblem: true };
    expect(schema.safeParse({ ...on, otherEnvironmentProblemRemark: '' }).success).toBe(false);
    expect(
      schema.safeParse({ ...on, otherEnvironmentProblemRemark: 'ก'.repeat(4000) }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...on, otherEnvironmentProblemRemark: 'ก'.repeat(4001) }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ hasOtherEnvironmentProblem: false, otherEnvironmentProblemRemark: '' })
        .success,
    ).toBe(true);
    render(<Items defaults={{ hasOtherEnvironmentProblem: true }} />);
    const box = field('otherEnvironmentProblemRemark')!.querySelector('textarea')!;
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveAttribute('maxlength', '4000');
  });

  it('hides and clears when its chip goes off', async () => {
    const { user } = render(
      <Items
        defaults={{ hasOtherEnvironmentProblem: true, otherEnvironmentProblemRemark: 'เสียงรถไฟ' }}
      />,
    );
    await user.click(chip('Other Environment Problem'));
    expect(field('otherEnvironmentProblemRemark')).toBeNull();
    expect(methods.getValues('otherEnvironmentProblemRemark')).toBeNull();
  });
});

describe('royal decree length', () => {
  it.each([
    ['land', expropriateField],
    ['condo', expropriationFields],
  ])('takes up to 200 characters on the %s form, from the config into its schema', (_, fields) => {
    const decree = fields.filter(f => f.name === 'royalDecree');
    expect(decree.map(f => (f as { maxLength?: number }).maxLength)).toEqual([200]);
    const schema = buildFormSchema(decree);
    expect(schema.safeParse({ royalDecree: 'พ'.repeat(200) }).success).toBe(true);
    expect(schema.safeParse({ royalDecree: 'พ'.repeat(201) }).success).toBe(false);
  });
});

describe('flood and pollution remarks, 4000 characters', () => {
  const remark = (name: string) => environmentProblemFields.filter(f => f.name === name);

  it.each(['floodProblemRemark', 'pollutionProblemRemark'])(
    '%s accepts 4000 and rejects 4001, from the config into its schema',
    name => {
      const schema = buildFormSchema(remark(name));
      expect(schema.safeParse({ [name]: 'ก'.repeat(4000) }).success).toBe(true);
      expect(schema.safeParse({ [name]: 'ก'.repeat(4001) }).success).toBe(false);
    },
  );

  it('the pollution remark is not required', () => {
    const [field] = remark('pollutionProblemRemark');
    expect(field.requiredWhen).toBeUndefined();
    expect(
      buildFormSchema(remark('pollutionProblemRemark')).safeParse({ pollutionProblemRemark: '' })
        .success,
    ).toBe(true);
  });
});

describe('pollution remark under the pollution chips', () => {
  const on = {
    hasPollutionProblem: true,
    pollutionType: ['99'],
    pollutionTypeOther: 'ควันโรงงาน',
    pollutionProblemRemark: 'ควันลอยเข้าบ้านทุกเย็น',
  };

  it('shows below the chips, four lines tall, while pollution is picked', () => {
    setPollution();
    render(<Items defaults={on} />);
    const remark = document.querySelector('[data-field="pollutionProblemRemark"] textarea')!;
    expect(remark).toHaveAttribute('rows', '4');
    expect(remark).toHaveValue('ควันลอยเข้าบ้านทุกเย็น');
  });

  it('hides and clears when the pollution chip goes off', async () => {
    const { user } = render(<Items defaults={on} />);
    await user.click(chip('Pollution Problem'));
    expect(field('pollutionProblemRemark')).toBeNull();
    expect(methods.getValues('pollutionProblemRemark')).toBeNull();
  });
});
