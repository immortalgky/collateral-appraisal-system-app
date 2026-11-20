import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import { createLandFormDefault } from '../schemas/form';
import { otherLegalLimitationsField } from '../configs/fields';
import { mapLandPropertyResponseToForm } from '../utils/mappers';
import { landToPayload } from '../utils/propertyFormRecipes';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import LandDetailForm from './LandDetailForm';

/**
 * The "Others" chip under "ข้อจำกัดที่พบ" has no column of its own: it is on while the other-limitations
 * text is not null. A pick writes '' (required), a drop writes null (hidden, cleared).
 */
let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({ response }: { response: Record<string, unknown> }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: {
      ...createLandFormDefault,
      ...mapLandPropertyResponseToForm(response as never),
    },
  });
  return (
    <PropertyNameInHeaderContext.Provider value>
      <FormProvider {...methods}>
        <LandDetailForm />
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};
const text = () => document.querySelector('[data-field="otherLegalLimitations"]');
const chip = () => screen.getByRole('button', { name: 'Others' });

describe('land: the "Others" limitation chip', () => {
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

  it('is the last chip of the group, and the text opens at the end of the section', () => {
    render(<Harness response={{ otherLegalLimitations: 'x' }} />);
    const chips = screen
      .getAllByRole('button')
      .filter(b => b.hasAttribute('aria-pressed'))
      .map(b => b.textContent);
    expect(chips.at(-1)).toBe('Others');
  });

  it('does not make the form dirty just by loading a record with text', () => {
    render(<Harness response={{ otherLegalLimitations: 'ติดแนวท่อระบายน้ำ' }} />);
    expect(methods.formState.isDirty).toBe(false);
    expect(Object.keys(methods.formState.dirtyFields)).toEqual([]);
  });

  it('a pick opens the text empty and required; a drop hides and clears it', async () => {
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
    const schema = buildFormSchema([otherLegalLimitationsField]);
    const ok = (v: Record<string, unknown>) => schema.safeParse(v).success;
    expect(ok({ otherLegalLimitations: '' })).toBe(false);
    expect(ok({ otherLegalLimitations: 'ติดคลอง' })).toBe(true);
    expect(ok({ otherLegalLimitations: 'ก'.repeat(4001) })).toBe(false);
    expect(ok({ otherLegalLimitations: null })).toBe(true);
  });

  it('sends only the text: no key of its own for the chip', () => {
    const on = landToPayload(
      mapLandPropertyResponseToForm({ otherLegalLimitations: 'ติดคลอง' } as never) as never,
    );
    expect(on).toMatchObject({ otherLegalLimitations: 'ติดคลอง' });
    const off = landToPayload(mapLandPropertyResponseToForm({} as never) as never);
    expect(off).toMatchObject({ otherLegalLimitations: null });
    const known = Object.keys(mapLandPropertyResponseToForm({} as never));
    expect(known.filter(k => /otherLegalLimitations/i.test(k))).toEqual(['otherLegalLimitations']);
  });
});
