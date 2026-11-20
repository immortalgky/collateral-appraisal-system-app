import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, within } from '@/test/test-utils';
import {
  createBuildingFormDefault,
  createLandAndBuildingFormDefault,
  createLeaseAgreementBuildingFormDefault,
} from '../schemas/form';
import {
  mapBuildingPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
} from '../utils/mappers';
import BuildingDetailForm from './BuildingDetailForm';

/** `isAppraisable` is asked as "include the building in the valuation": exclude | include. */
const Harness = () => {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: { ...createBuildingFormDefault, isAppraisable: false },
  });
  return (
    <FormProvider {...methods}>
      <BuildingDetailForm />
      <output data-testid="value">{String(methods.watch('isAppraisable'))}</output>
    </FormProvider>
  );
};

describe('building: isAppraisable', () => {
  it('reads "Include building in valuation" with Exclude | Include, and still sets the same boolean', async () => {
    const { user } = render(<Harness />);
    const field = document.querySelector<HTMLElement>('[data-field="isAppraisable"]')!;
    expect(within(field).getByText(/Include building in valuation/)).toBeInTheDocument();
    expect(
      within(field)
        .getAllByRole('radio')
        .map(r => r.textContent),
    ).toEqual(['Exclude', 'Include']);
    await user.click(within(field).getByRole('radio', { name: 'Include' }));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
  });

  it('starts a new building as "Include", and leaves a saved answer as it was', () => {
    expect(createBuildingFormDefault.isAppraisable).toBe(true);
    expect(createLandAndBuildingFormDefault.isAppraisable).toBe(true);
    expect(createLeaseAgreementBuildingFormDefault.isAppraisable).toBe(true);
    // A new building's toggle reads Include.
    const Fresh = () => {
      const methods = useForm<Record<string, unknown>>({
        defaultValues: { ...createBuildingFormDefault },
      });
      return (
        <FormProvider {...methods}>
          <BuildingDetailForm />
        </FormProvider>
      );
    };
    render(<Fresh />);
    const field = document.querySelector<HTMLElement>('[data-field="isAppraisable"]')!;
    expect(within(field).getByRole('radio', { name: 'Include' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // A loaded record keeps what it saved: excluded stays excluded.
    expect(mapBuildingPropertyResponseToForm({ isAppraisable: false } as never).isAppraisable).toBe(
      false,
    );
    expect(mapBuildingPropertyResponseToForm({ isAppraisable: true } as never).isAppraisable).toBe(
      true,
    );
  });

  it('loads a never-answered (null) building as included, and keeps an explicit answer, on building and land and building', () => {
    for (const map of [
      mapBuildingPropertyResponseToForm,
      mapLandAndBuildingPropertyResponseToForm,
    ]) {
      expect(map({ isAppraisable: null } as never).isAppraisable).toBe(true);
      expect(map({} as never).isAppraisable).toBe(true);
      expect(map({ isAppraisable: false } as never).isAppraisable).toBe(false);
      expect(map({ isAppraisable: true } as never).isAppraisable).toBe(true);
    }
  });
});
