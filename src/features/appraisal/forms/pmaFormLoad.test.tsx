import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, render, screen, waitFor } from '@/test/test-utils';
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
  loaded?: Record<string, unknown>;
  schema: never;
  capture: Capture;
}) {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: defaults as Record<string, unknown>,
    resolver: zodResolver(schema),
  });
  capture.current = methods;
  // Read in render, as the pages do (badge, Save buttons, guard). react-hook-form only keeps
  // formState fields a render has subscribed to; unread, isDirty and dirtyFields stay at their
  // defaults and every assertion on them would pass whatever the form did.
  void methods.formState.isDirty;
  void methods.formState.dirtyFields;
  // Same order as CondoPMAPage / LandBuildingPMAPage: the form is on screen and the page's effect
  // resets it from the mapped response.
  // Create mode has no record, so nothing resets the form.
  useEffect(() => {
    if (loaded) methods.reset(loaded);
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

/** Settle effects, then read the dirty state as the last render saw it. */
async function dirtyState(form: UseFormReturn<Record<string, unknown>>) {
  await new Promise(r => setTimeout(r, 0));
  return { dirtyFields: form.formState.dirtyFields, isDirty: form.formState.isDirty };
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

// The area sits on the first title, where the mapper reads it — non-zero, so the form's derived
// Total Sq.Wa (1×400 + 2×100 + 3 = 603) is actually exercised.
const landBuildingResponse = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 750_000,
  buildingInsurancePrice: 0,
  titles: [{ titleNumber: 'T1', rai: 1, ngan: 2, squareWa: 3 }],
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
    expect(form.formState.isDirty).toBe(false);
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
    expect(form.formState.isDirty).toBe(false);
  });

  it('condo: leaves the forced-sale price alone when code, not the user, sets the selling price', async () => {
    const form = await openLoaded(
      CondoPMAForm,
      createCondoPMAFormDefault,
      mapCondoPMAPropertyResponseToForm(condoResponse as never) as never,
      makeCondoPMAForm(t) as never,
    );

    await act(async () => {
      form.setValue('sellingPrice', 2_000_000);
    });
    await new Promise(r => setTimeout(r, 0));

    expect(form.getValues('forcedSalePrice')).toBe(750_000);
  });

  it('land+building: an edit put back leaves nothing to save, for the guard and the badge alike', async () => {
    const form = await openLoaded(
      LandBuildingPMAForm,
      createLandAndBuildingPMAFormDefault,
      mapLandAndBuildingPMAPropertyResponseToForm(landBuildingResponse as never) as never,
      makeLandAndBuildingPMAForm(t) as never,
    );
    expect(form.getValues('totalSquareWa')).toBe(603);

    await act(async () => {
      form.setValue('buildingInsurancePrice', 5, { shouldDirty: true });
    });
    // Proves a render ran in between; otherwise the final read could be the clean state from load.
    expect(await dirtyState(form)).toEqual({
      dirtyFields: { buildingInsurancePrice: true },
      isDirty: true,
    });

    await act(async () => {
      form.setValue('buildingInsurancePrice', 0, { shouldDirty: true });
    });
    // The guard reads dirtyFields; the badge and Save buttons read isDirty. They must agree.
    expect(await dirtyState(form)).toEqual({ dirtyFields: {}, isDirty: false });
  });

  it('land+building: an area edit put back leaves nothing to save either', async () => {
    // The area drives the derived Total Sq.Wa, which the form writes in an effect after the edit.
    const form = await openLoaded(
      LandBuildingPMAForm,
      createLandAndBuildingPMAFormDefault,
      mapLandAndBuildingPMAPropertyResponseToForm(landBuildingResponse as never) as never,
      makeLandAndBuildingPMAForm(t) as never,
    );

    await act(async () => {
      form.setValue('areaRai', 2, { shouldDirty: true });
    });
    const edited = await dirtyState(form);
    expect(edited.isDirty).toBe(true);
    expect(edited.dirtyFields).toMatchObject({ areaRai: true });
    expect(form.getValues('totalSquareWa')).toBe(1003);

    await act(async () => {
      form.setValue('areaRai', 1, { shouldDirty: true });
    });
    expect(await dirtyState(form)).toEqual({ dirtyFields: {}, isDirty: false });
    expect(form.getValues('totalSquareWa')).toBe(603);
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

  describe('create mode (nothing loaded)', () => {
    async function openFresh(Form: React.ComponentType, defaults: object, schema: never) {
      const capture: Capture = { current: null };
      render(<Harness Form={Form} defaults={defaults} schema={schema} capture={capture} />);
      await waitFor(() => expect(capture.current).not.toBeNull());
      return capture.current!;
    }

    it('condo: an untouched new form is clean', async () => {
      const form = await openFresh(
        CondoPMAForm,
        createCondoPMAFormDefault,
        makeCondoPMAForm(t) as never,
      );
      expect(await dirtyState(form)).toEqual({ dirtyFields: {}, isDirty: false });
    });

    it('land+building: an untouched new form is clean', async () => {
      const form = await openFresh(
        LandBuildingPMAForm,
        createLandAndBuildingPMAFormDefault,
        makeLandAndBuildingPMAForm(t) as never,
      );
      expect(await dirtyState(form)).toEqual({ dirtyFields: {}, isDirty: false });
    });
  });
});
