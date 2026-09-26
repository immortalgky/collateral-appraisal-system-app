import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen, waitFor } from '@/test/test-utils';
import { FormProvider } from '@/shared/components/form';
import CondoPMAForm from './CondoPMAForm';
import LandBuildingPMAForm from './LandBuildingPMAForm';
import {
  createCondoPMAFormDefault,
  createLandAndBuildingPMAFormDefault,
  makeCondoPMAForm,
  makeLandAndBuildingPMAForm,
} from '../schemas/form';
import {
  mapCondoPMAPropertyResponseToForm,
  mapLandAndBuildingPMAPropertyResponseToForm,
} from '../utils/mappers';

/**
 * Opening a PMA page must leave the form exactly as loaded. The pages mount the form once the
 * record arrives and reset() it from the mapped response in the same commit, so the form's own
 * effects run around that reset. Two of them wrote to the form on load: the forced-sale price was
 * recomputed as 70% of the selling price, overwriting the saved value (which the appraiser may set
 * by hand) and marking the form dirty; and the unsaved-changes guard, once it actually worked, then
 * warned on pages nobody had touched.
 */

const t = ((k: string) => k) as never;

type Capture = { current: UseFormReturn<Record<string, unknown>> | null };

function Harness({
  Form,
  defaults,
  loaded,
  schema,
  capture,
}: {
  Form: React.ComponentType;
  defaults: object;
  loaded: Record<string, unknown>;
  schema: never;
  capture: Capture;
}) {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: defaults as Record<string, unknown>,
    resolver: zodResolver(schema),
  });
  capture.current = methods;
  // Same order as CondoPMAPage / LandBuildingPMAPage: the form is on screen and the page's effect
  // resets it from the mapped response.
  useEffect(() => {
    methods.reset(loaded);
  }, [methods, loaded]);
  return (
    <FormProvider methods={methods} schema={schema}>
      <Form />
    </FormProvider>
  );
}

async function openLoaded(
  Form: React.ComponentType,
  defaults: object,
  loaded: Record<string, unknown>,
  schema: never,
) {
  const capture: Capture = { current: null };
  render(
    <Harness Form={Form} defaults={defaults} loaded={loaded} schema={schema} capture={capture} />,
  );
  await waitFor(() => expect(capture.current!.getValues('sellingPrice')).toBe(loaded.sellingPrice));
  // Let any effect that reacts to the reset settle.
  await new Promise(r => setTimeout(r, 0));
  return capture.current!;
}

const condoResponse = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 750_000, // set by hand, not 70%
  buildingInsurancePrice: 0,
  titleNumber: '123',
  condoName: 'A',
  roomNumber: '1',
  floorNumber: '2',
  buildingNumber: 'B',
  condoRegistrationNumber: 'R',
};

const landBuildingResponse = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 750_000,
  buildingInsurancePrice: 0,
  titles: [],
  areaRai: 1,
  areaNgan: 2,
  areaSquareWa: 3,
};

describe('PMA forms on load', () => {
  it('condo: keeps a hand-set forced-sale price and stays clean', async () => {
    const form = await openLoaded(
      CondoPMAForm,
      createCondoPMAFormDefault,
      mapCondoPMAPropertyResponseToForm(condoResponse as never) as never,
      makeCondoPMAForm(t) as never,
    );

    expect(form.getValues('forcedSalePrice')).toBe(750_000);
    expect(form.formState.dirtyFields).toEqual({});
  });

  it('land+building: keeps a hand-set forced-sale price and has no dirty field', async () => {
    const form = await openLoaded(
      LandBuildingPMAForm,
      createLandAndBuildingPMAFormDefault,
      mapLandAndBuildingPMAPropertyResponseToForm(landBuildingResponse as never) as never,
      makeLandAndBuildingPMAForm(t) as never,
    );

    expect(form.getValues('forcedSalePrice')).toBe(750_000);
    expect(form.formState.dirtyFields).toEqual({});
  });

  it('condo: leaves the forced-sale price alone when code, not the user, sets the selling price', async () => {
    const form = await openLoaded(
      CondoPMAForm,
      createCondoPMAFormDefault,
      mapCondoPMAPropertyResponseToForm(condoResponse as never) as never,
      makeCondoPMAForm(t) as never,
    );

    form.setValue('sellingPrice', 2_000_000);
    await new Promise(r => setTimeout(r, 0));

    expect(form.getValues('forcedSalePrice')).toBe(750_000);
  });

  it('condo: still proposes 70% when the user changes the selling price', async () => {
    const form = await openLoaded(
      CondoPMAForm,
      createCondoPMAFormDefault,
      mapCondoPMAPropertyResponseToForm(condoResponse as never) as never,
      makeCondoPMAForm(t) as never,
    );

    const { user } = await import('@testing-library/user-event').then(m => ({
      user: m.default.setup(),
    }));
    const input = screen.getByDisplayValue(/1,000,000/);
    await user.clear(input);
    await user.type(input, '2000000');
    await user.tab();

    await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(1_400_000));
  });
});
