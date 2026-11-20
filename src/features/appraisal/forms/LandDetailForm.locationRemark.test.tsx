import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '@/test/test-utils';
import { createLandFormDefault } from '../schemas/form';
import { allLandFields } from '../configs/fields';
import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import LandDetailForm from './LandDetailForm';

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({ defaults = {} }: { defaults?: Record<string, unknown> }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: { ...createLandFormDefault, ...defaults },
  });
  return (
    <PropertyNameInHeaderContext.Provider value>
      <FormProvider {...methods}>
        <LandDetailForm />
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};
const remark = () => document.querySelector('[data-field="landLocationRemark"]');
const verdict = (i: number) =>
  document.querySelectorAll<HTMLElement>('[data-field="isLandLocationVerified"] [role=radio]')[i];

describe('land location remark', () => {
  it('opens under the check row while the position is incorrect, four rows, up to 4000 characters', () => {
    render(<Harness defaults={{ isLandLocationVerified: false }} />);
    const box = remark()!.querySelector('textarea')!;
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveAttribute('maxlength', '4000');
    const row = document.querySelector('[data-field="isLandLocationVerified"]')!;
    expect(row.compareDocumentPosition(remark()!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(
      remark()!.compareDocumentPosition(document.querySelector('[data-field="street"]')!) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).not.toBe(0);
  });

  it('is hidden and cleared when the position is correct', async () => {
    const { user } = render(
      <Harness defaults={{ isLandLocationVerified: false, landLocationRemark: 'ผิดที่' }} />,
    );
    await user.click(verdict(1));
    expect(remark()).toBeNull();
    expect(methods.getValues('landLocationRemark')).toBeNull();
  });

  it('is optional: no required rule, and a blank value passes', () => {
    const [field] = allLandFields.filter(f => f.name === 'landLocationRemark');
    expect(field.requiredWhen).toBeUndefined();
    const schema = buildFormSchema(
      allLandFields.filter(f => ['isLandLocationVerified', 'landLocationRemark'].includes(f.name)),
    );
    const ok = (v: Record<string, unknown>) => schema.safeParse(v).success;
    expect(ok({ isLandLocationVerified: false, landLocationRemark: '' })).toBe(true);
    expect(ok({ isLandLocationVerified: false, landLocationRemark: 'ก'.repeat(4000) })).toBe(true);
    expect(ok({ isLandLocationVerified: false, landLocationRemark: 'ก'.repeat(4001) })).toBe(false);
  });

  it('has the check-by as chips, whose "other" is required only while 99 is among them', () => {
    const [by] = allLandFields.filter(f => f.name === 'landCheckMethodType');
    expect(by.type).toBe('checkbox-group');
    const schema = buildFormSchema(
      allLandFields.filter(f =>
        ['landCheckMethodType', 'landCheckMethodTypeOther'].includes(f.name),
      ),
    );
    const ok = (v: Record<string, unknown>) => schema.safeParse(v).success;
    expect(ok({ landCheckMethodType: ['01', '02'], landCheckMethodTypeOther: '' })).toBe(true);
    expect(ok({ landCheckMethodType: ['01', '99'], landCheckMethodTypeOther: '' })).toBe(false);
    expect(ok({ landCheckMethodType: ['01', '99'], landCheckMethodTypeOther: 'ดาวเทียม' })).toBe(
      true,
    );
  });
});
