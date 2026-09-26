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
 * Opening a PMA page must leave the form exactly as loaded, and "unsaved" must mean a field really
 * differs from what was saved. The pages mount the form once the record arrives and reset() it from
 * the mapped response in the same commit, so the form's own effects run around that reset.
 *
 * The pages read one dirty signal, dirtyFields, for the leave guard, the unsaved badge and both Save
 * buttons, so that is what these tests check. (react-hook-form's whole-form isDirty can be re-emitted
 * stale after a derived write; the pages no longer read it.)
 */

const t = ((k: string) => k) as never;

type Form = UseFormReturn<Record<string, unknown>>;
type Capture = { current: Form | null };

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
  // Read in render, as the pages do. react-hook-form only keeps formState fields a render has
  // subscribed to; unread, dirtyFields stays {} and every assertion on it would pass whatever the
  // form did.
  void methods.formState.dirtyFields;
  // Same order as CondoPMAPage / LandBuildingPMAPage: the form is on screen and the page's effect
  // resets it from the mapped response. Create mode has no record, so nothing resets the form.
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

/** Settle effects, then read the dirty fields as the last render saw them. */
async function dirtyFields(form: Form) {
  await new Promise(r => setTimeout(r, 0));
  return form.formState.dirtyFields;
}

async function typeInto(displayed: RegExp, text: string) {
  const { default: userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  const input = screen.getByDisplayValue(displayed);
  await user.clear(input);
  await user.type(input, text);
  await user.tab();
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

const openCondo = (response: object = condoResponse) =>
  openLoaded(
    CondoPMAForm,
    createCondoPMAFormDefault,
    mapCondoPMAPropertyResponseToForm(response as never) as never,
    makeCondoPMAForm(t) as never,
  );

const openLandBuilding = (response: object = landBuildingResponse) =>
  openLoaded(
    LandBuildingPMAForm,
    createLandAndBuildingPMAFormDefault,
    mapLandAndBuildingPMAPropertyResponseToForm(response as never) as never,
    makeLandAndBuildingPMAForm(t) as never,
  );

describe('PMA forms', () => {
  describe('on load', () => {
    it('condo: keeps a hand-set forced-sale price and nothing is dirty', async () => {
      const form = await openCondo();

      expect(form.getValues('forcedSalePrice')).toBe(750_000);
      expect(form.formState.dirtyFields).toEqual({});
    });

    it('land+building: keeps a hand-set forced-sale price and nothing is dirty', async () => {
      const form = await openLandBuilding();

      expect(form.getValues('forcedSalePrice')).toBe(750_000);
      expect(form.getValues('totalSquareWa')).toBe(603);
      expect(form.formState.dirtyFields).toEqual({});
    });
  });

  describe('forced-sale proposal', () => {
    it('condo: leaves forced-sale alone when code, not the user, sets the selling price', async () => {
      const form = await openCondo();

      await act(async () => {
        form.setValue('sellingPrice', 2_000_000);
      });
      await new Promise(r => setTimeout(r, 0));

      expect(form.getValues('forcedSalePrice')).toBe(750_000);
    });

    it('condo: proposes 70% when the user changes the selling price', async () => {
      const form = await openCondo();

      await typeInto(/1,000,000/, '2000000');

      await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(1_400_000));
    });

    it('land+building: a typed edit elsewhere leaves a hand-set price alone; the selling price proposes 70% as an edit', async () => {
      // Only an edit to the selling price may propose 70%, and the proposal is itself a change to
      // save. Every value is unique so each input can be found by what it shows.
      const form = await openLandBuilding({
        ...landBuildingResponse,
        buildingInsurancePrice: 123_456,
      });

      await typeInto(/123,456/, '200000');
      await waitFor(() => expect(form.getValues('buildingInsurancePrice')).toBe(200_000));
      expect(form.getValues('forcedSalePrice')).toBe(750_000);

      await typeInto(/1,000,000/, '2000000');
      await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(1_400_000));
      expect(await dirtyFields(form)).toMatchObject({ sellingPrice: true, forcedSalePrice: true });
    });
  });

  describe('an edit put back leaves nothing to save', () => {
    it('land+building: a plain field', async () => {
      const form = await openLandBuilding();

      await act(async () => {
        form.setValue('buildingInsurancePrice', 5, { shouldDirty: true });
      });
      // Proves a render ran in between; otherwise the final read could be the clean state from load.
      expect(await dirtyFields(form)).toEqual({ buildingInsurancePrice: true });

      await act(async () => {
        form.setValue('buildingInsurancePrice', 0, { shouldDirty: true });
      });
      expect(await dirtyFields(form)).toEqual({});
    });

    it('land+building: an area field, which drives the derived Total Sq.Wa', async () => {
      const form = await openLandBuilding();

      await act(async () => {
        form.setValue('areaRai', 2, { shouldDirty: true });
      });
      expect(await dirtyFields(form)).toMatchObject({ areaRai: true });
      expect(form.getValues('totalSquareWa')).toBe(1003);

      await act(async () => {
        form.setValue('areaRai', 1, { shouldDirty: true });
      });
      expect(await dirtyFields(form)).toEqual({});
      expect(form.getValues('totalSquareWa')).toBe(603);
    });

    it('condo: the selling price typed back takes its proposal back with it', async () => {
      // Loaded at exactly 70% so that "back" is the saved state.
      const form = await openCondo({ ...condoResponse, forcedSalePrice: 700_000 });

      await typeInto(/1,000,000/, '2000000');
      await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(1_400_000));
      expect(await dirtyFields(form)).toMatchObject({ sellingPrice: true, forcedSalePrice: true });

      await typeInto(/2,000,000/, '1000000');
      await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(700_000));
      expect(await dirtyFields(form)).toEqual({});
    });

    it('condo: the same, after a Save that failed validation', async () => {
      // After a failed submit react-hook-form re-validates on every change and re-emits the dirty
      // state only once the resolver has run — the case in which a stale whole-form isDirty used to
      // come back. The title number is left empty so the submit fails.
      const form = await openCondo({ ...condoResponse, forcedSalePrice: 700_000, titleNumber: '' });
      await act(async () => {
        await form.handleSubmit(() => {})();
      });
      expect(form.formState.isSubmitted).toBe(true);
      expect(form.formState.isSubmitSuccessful).toBe(false);

      await typeInto(/1,000,000/, '2000000');
      await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(1_400_000));
      await typeInto(/2,000,000/, '1000000');
      await waitFor(() => expect(form.getValues('forcedSalePrice')).toBe(700_000));
      expect(await dirtyFields(form)).toEqual({});
    });
  });

  describe('create mode (nothing loaded)', () => {
    async function openFresh(Form: React.ComponentType, defaults: object, schema: never) {
      const capture: Capture = { current: null };
      render(<Harness Form={Form} defaults={defaults} schema={schema} capture={capture} />);
      await waitFor(() => expect(capture.current).not.toBeNull());
      return capture.current!;
    }

    it('condo: an untouched new form has nothing dirty', async () => {
      const form = await openFresh(
        CondoPMAForm,
        createCondoPMAFormDefault,
        makeCondoPMAForm(t) as never,
      );
      expect(await dirtyFields(form)).toEqual({});
    });

    it('land+building: an untouched new form has nothing dirty', async () => {
      const form = await openFresh(
        LandBuildingPMAForm,
        createLandAndBuildingPMAFormDefault,
        makeLandAndBuildingPMAForm(t) as never,
      );
      expect(await dirtyFields(form)).toEqual({});
    });
  });
});
