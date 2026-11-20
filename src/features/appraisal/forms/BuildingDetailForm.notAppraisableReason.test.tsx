import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, within } from '@/test/test-utils';
import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import {
  createBuildingFormDefault,
  createLandAndBuildingFormDefault,
  createLeaseAgreementBuildingFormDefault,
} from '../schemas/form';
import { allBuildingFields } from '../configs/fields';
import {
  mapBuildingFormDataToApiPayload,
  mapBuildingPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
} from '../utils/mappers';
import BuildingDetailForm from './BuildingDetailForm';

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({ defaults = {} }: { defaults?: Record<string, unknown> }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: { ...createBuildingFormDefault, ...defaults },
  });
  return (
    <FormProvider {...methods}>
      <BuildingDetailForm />
    </FormProvider>
  );
};
const reason = () => document.querySelector('[data-field="notAppraisableReason"]');
const include = () =>
  within(document.querySelector<HTMLElement>('[data-field="isAppraisable"]')!).getByRole('radio', {
    name: 'Include',
  });
const exclude = () =>
  within(document.querySelector<HTMLElement>('[data-field="isAppraisable"]')!).getByRole('radio', {
    name: 'Exclude',
  });

describe('building: reason not appraised', () => {
  it('is hidden while the building is included', () => {
    render(<Harness defaults={{ isAppraisable: true }} />);
    expect(reason()).toBeNull();
  });

  it('shows under the toggle, four rows, up to 4000 characters, while it is excluded', async () => {
    const { user } = render(<Harness defaults={{ isAppraisable: true }} />);
    await user.click(exclude());
    const box = reason()!.querySelector('textarea')!;
    expect(box).toHaveAttribute('rows', '4');
    expect(box).toHaveAttribute('maxlength', '4000');
    const toggle = document.querySelector('[data-field="isAppraisable"]')!;
    expect(toggle.compareDocumentPosition(reason()!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(
      0,
    );
  });

  it('is cleared and hidden when switched back to include', async () => {
    const { user } = render(
      <Harness defaults={{ isAppraisable: false, notAppraisableReason: 'อาคารรื้อถอนแล้ว' }} />,
    );
    expect(reason()).not.toBeNull();
    await user.click(include());
    expect(reason()).toBeNull();
    expect(methods.getValues('notAppraisableReason')).toBeNull();
  });

  it('is required while the building is excluded, and not when it is included', () => {
    const schema = buildFormSchema(
      allBuildingFields.filter(f => ['isAppraisable', 'notAppraisableReason'].includes(f.name)),
    );
    const ok = (v: Record<string, unknown>) => schema.safeParse(v).success;
    expect(ok({ isAppraisable: false, notAppraisableReason: '' })).toBe(false);
    expect(ok({ isAppraisable: false, notAppraisableReason: 'รื้อถอนแล้ว' })).toBe(true);
    expect(ok({ isAppraisable: false, notAppraisableReason: 'ก'.repeat(4001) })).toBe(false);
    expect(ok({ isAppraisable: true, notAppraisableReason: '' })).toBe(true);
  });

  it('loads, falls back to blank and goes back out, on building, land and building and lease', () => {
    for (const map of [
      mapBuildingPropertyResponseToForm,
      mapLandAndBuildingPropertyResponseToForm,
    ]) {
      expect(
        map({ isAppraisable: false, notAppraisableReason: 'รื้อถอนแล้ว' } as never),
      ).toMatchObject({
        notAppraisableReason: 'รื้อถอนแล้ว',
      });
      expect(map({} as never)).toMatchObject({ notAppraisableReason: '' });
    }
    expect(createBuildingFormDefault.notAppraisableReason).toBe('');
    expect(createLandAndBuildingFormDefault.notAppraisableReason).toBe('');
    expect(createLeaseAgreementBuildingFormDefault.notAppraisableReason).toBe('');
    const form = mapBuildingPropertyResponseToForm({
      notAppraisableReason: 'รื้อถอนแล้ว',
    } as never);
    expect(mapBuildingFormDataToApiPayload(form as never)).toMatchObject({
      notAppraisableReason: 'รื้อถอนแล้ว',
    });
  });
});
