import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { useParameterStore } from '@/shared/store';
import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import { createLandFormDefault } from '../schemas/form';
import { allLandFields } from '../configs/fields';
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
const remark = () => document.querySelector('[data-field="evictionRemark"]');
const mockEviction = () =>
  useParameterStore.getState().setParameters(
    [
      ['03', 'High-voltage line'],
      ['04', 'Underground railway'],
      ['99', 'Other'],
    ].map(([code, description], i) => ({
      parId: i,
      group: 'Eviction',
      country: 'th',
      language: 'en',
      code,
      description,
      isActive: true,
      seqNo: i + 1,
    })) as never,
  );

describe('right restriction details', () => {
  it('is not asked until a chip is picked, then opens after the "other" text, four rows, 4000 characters', async () => {
    mockEviction();
    const { user } = render(<Harness />);
    expect(remark()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'High-voltage line' }));
    const box = remark()!.querySelector('textarea')!;
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveAttribute('maxlength', '4000');
    const chips = document.querySelector('[data-field="evictionType"]')!;
    expect(chips.compareDocumentPosition(remark()!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('stays while any chip is left and is hidden and cleared with the last one', async () => {
    mockEviction();
    const { user } = render(
      <Harness defaults={{ evictionType: ['03', '04'], evictionRemark: 'แนวเสาไฟฟ้า' }} />,
    );
    await user.click(screen.getByRole('button', { name: 'High-voltage line' }));
    expect(remark()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Underground railway' }));
    expect(remark()).toBeNull();
    expect(methods.getValues('evictionRemark')).toBeNull();
  });

  it('is optional and takes up to 4000 characters', () => {
    const [field] = allLandFields.filter(f => f.name === 'evictionRemark');
    expect(field.requiredWhen).toBeUndefined();
    const schema = buildFormSchema(allLandFields.filter(f => f.name === 'evictionRemark'));
    expect(schema.safeParse({ evictionRemark: '' }).success).toBe(true);
    expect(schema.safeParse({ evictionRemark: 'ก'.repeat(4000) }).success).toBe(true);
    expect(schema.safeParse({ evictionRemark: 'ก'.repeat(4001) }).success).toBe(false);
  });
});
