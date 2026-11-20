import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '@/test/test-utils';
import { createCondoFormDefault } from '../schemas/form';
import { allCondoFields } from '../configs/fields';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import CondoDetailForm from './CondoDetailForm';

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({ defaults = {} }: { defaults?: Record<string, unknown> }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: { ...createCondoFormDefault, ...defaults },
  });
  return (
    <PropertyNameInHeaderContext.Provider value>
      <FormProvider {...methods}>
        <CondoDetailForm />
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};
const remark = () => document.querySelector('[data-field="locationRemark"]');
const verdict = (i: number) =>
  document.querySelectorAll<HTMLElement>('[data-field="locationType"] [role=radio]')[i];

describe('condo unit location remark', () => {
  it('is not asked while the position is correct', () => {
    render(<Harness />);
    expect(methods.getValues('locationType')).toBe('1');
    expect(remark()).toBeNull();
  });

  it('opens under the toggle for code 2, four rows, up to 4000 characters, optional', () => {
    render(<Harness defaults={{ locationType: '2' }} />);
    const box = remark()!.querySelector('textarea')!;
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveAttribute('maxlength', '4000');
    const toggle = document.querySelector('[data-field="locationType"]')!;
    expect(toggle.compareDocumentPosition(remark()!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(
      0,
    );
    const [field] = allCondoFields.filter(f => f.name === 'locationRemark');
    expect(field.requiredWhen).toBeUndefined();
  });

  it('is hidden and cleared when the position goes back to correct', async () => {
    const { user } = render(
      <Harness defaults={{ locationType: '2', locationRemark: 'ชั้นไม่ตรงโฉนด' }} />,
    );
    // Incorrect is the left option, Correct the right one.
    await user.click(verdict(1));
    expect(methods.getValues('locationType')).toBe('1');
    expect(remark()).toBeNull();
    expect(methods.getValues('locationRemark')).toBeNull();
  });
});
