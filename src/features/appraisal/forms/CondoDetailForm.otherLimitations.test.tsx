import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import { createCondoFormDefault } from '../schemas/form';
import { allCondoFields, otherLegalLimitationsField } from '../configs/fields';
import { mapCondoFormDataToApiPayload, mapCondoPropertyResponseToForm } from '../utils/mappers';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import CondoDetailForm from './CondoDetailForm';

/**
 * The "Others" chip under "ข้อจำกัดที่พบ" (as on the land form): no column of its own, on while the
 * other-limitations text is not null. A pick writes '' (required), a drop writes null.
 */
let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({ response }: { response: Record<string, unknown> }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: {
      ...createCondoFormDefault,
      ...mapCondoPropertyResponseToForm(response as never),
    },
  });
  return (
    <PropertyNameInHeaderContext.Provider value>
      <FormProvider {...methods}>
        <CondoDetailForm />
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};
const text = () => document.querySelector('[data-field="otherLegalLimitations"]');
const chip = () => screen.getByRole('button', { name: 'Others' });

describe('condo: the "Others" limitation chip', () => {
  it('is off, with the text hidden, when the stored text is blank', () => {
    render(<Harness response={{ otherLegalLimitations: '  ' }} />);
    expect(chip()).toHaveAttribute('aria-pressed', 'false');
    expect(text()).toBeNull();
    expect(methods.getValues('otherLegalLimitations')).toBeNull();
  });

  it('comes on by itself when there is stored text, which shows', () => {
    render(<Harness response={{ otherLegalLimitations: 'ติดแนวท่อระบายน้ำ' }} />);
    expect(chip()).toHaveAttribute('aria-pressed', 'true');
    expect(text()!.querySelector('textarea')).toHaveValue('ติดแนวท่อระบายน้ำ');
  });

  it('is the last chip of the group, and the text is the last row of the section', () => {
    render(<Harness response={{ otherLegalLimitations: 'x' }} />);
    const chips = [...document.querySelectorAll('[data-field="limitationFlags"] button')].map(b =>
      b.textContent?.trim(),
    );
    expect(chips.at(-1)).toBe('Others');
    const remark = document.querySelector('[data-field="forestBoundaryRemark"]');
    const after = (a: Element | null, b: Element | null) =>
      !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(after(document.querySelector('[data-field="limitationFlags"]'), text())).toBe(true);
    // The remark of a chip that is off is not drawn; when it is, the text still comes after it.
    if (remark) expect(after(remark, text())).toBe(true);
  });

  it('does not make the form dirty just by loading a record with text', () => {
    render(<Harness response={{ otherLegalLimitations: 'ติดแนวท่อระบายน้ำ' }} />);
    expect(methods.formState.isDirty).toBe(false);
    expect(Object.keys(methods.formState.dirtyFields)).toEqual([]);
  });

  it('a pick opens the text empty; a drop hides and clears it', async () => {
    const { user } = render(<Harness response={{}} />);
    await user.click(chip());
    expect(methods.getValues('otherLegalLimitations')).toBe('');
    expect(text()).not.toBeNull();
    await user.type(text()!.querySelector('textarea')!, 'ติดคลอง');
    expect(methods.getValues('otherLegalLimitations')).toBe('ติดคลอง');
    await user.click(chip());
    expect(text()).toBeNull();
    expect(methods.getValues('otherLegalLimitations')).toBeNull();
  });

  it('requires the text while the chip is on, and nothing while it is off', () => {
    const [inForm] = allCondoFields.filter(f => f.name === 'otherLegalLimitations');
    expect(inForm).toBe(otherLegalLimitationsField);
    const schema = buildFormSchema([otherLegalLimitationsField]);
    const ok = (v: Record<string, unknown>) => schema.safeParse(v).success;
    expect(ok({ otherLegalLimitations: '' })).toBe(false);
    expect(ok({ otherLegalLimitations: 'ติดคลอง' })).toBe(true);
    expect(ok({ otherLegalLimitations: 'ก'.repeat(4001) })).toBe(false);
    expect(ok({ otherLegalLimitations: null })).toBe(true);
  });

  it('sends only the text: no key of its own for the chip', () => {
    const on = mapCondoFormDataToApiPayload(
      mapCondoPropertyResponseToForm({ otherLegalLimitations: 'ติดคลอง' } as never) as never,
    );
    expect(on).toMatchObject({ otherLegalLimitations: 'ติดคลอง' });
    const blankForm = mapCondoPropertyResponseToForm({} as never);
    expect(mapCondoFormDataToApiPayload(blankForm as never)).toMatchObject({
      otherLegalLimitations: null,
    });
    expect(Object.keys(blankForm).filter(k => /otherLegalLimitations/i.test(k))).toEqual([
      'otherLegalLimitations',
    ]);
    expect(createCondoFormDefault.otherLegalLimitations).toBeNull();
  });

  it('has only the chips and the "Others" text: no decree or remark for the line and the forest', () => {
    render(
      <Harness
        response={{
          isInExpropriationLine: true,
          isForestBoundary: true,
          otherLegalLimitations: 'x',
        }}
      />,
    );
    for (const f of ['royalDecree', 'expropriationLineRemark', 'forestBoundaryRemark'])
      expect(document.querySelector(`[data-field="${f}"]`)).toBeNull();
    const chips = document.querySelector('[data-field="limitationFlags"]')!;
    expect(chips.compareDocumentPosition(text()!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });
});
