import type { z } from 'zod';
import {
  createBuildingForm,
  createCondoForm,
  createLandAndBuildingForm,
  createLandAndBuildingFormDefault,
  createLandForm,
  createLandFormDefault,
  createLeaseAgreementBuildingForm,
  createLeaseAgreementBuildingFormDefault,
  createLeaseAgreementCondoForm,
  createLeaseAgreementCondoFormDefault,
  createLeaseAgreementLandAndBuildingForm,
  createLeaseAgreementLandAndBuildingFormDefault,
  createLeaseAgreementLandForm,
  createLeaseAgreementLandFormDefault,
  createMachineryForm,
  type createLandAndBuildingFormType,
  type createLandFormType,
  type createLeaseAgreementBuildingFormType,
  type createLeaseAgreementCondoFormType,
  type createLeaseAgreementLandAndBuildingFormType,
  type createLeaseAgreementLandFormType,
} from '../schemas/form';
import {
  mapBuildingFormDataToApiPayload,
  mapBuildingPropertyResponseToForm,
  mapCondoFormDataToApiPayload,
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
  mapMachineryPropertyResponseToForm,
} from './mappers';

/**
 * How each property page turns a saved record into form values and form values into the PUT body.
 *
 * The create/edit pages and the data-correction screen both call these, so the two cannot drift:
 * the correction endpoint accepts exactly what the page's own PUT does. A page keeps everything
 * else (its `useForm`, tabs, photos, navigation); only the record <-> form <-> payload steps live
 * here.
 */

type Values = Record<string, unknown>;
/** A property-detail GET body. Typed loosely: each mapper reads only the members it knows. */
type PropertyRecord = object;

const asValues = (raw: PropertyRecord) => raw as Values;

/** The lease block a lease-capable page carries beside the base property values. */
const leaseBlock = (raw: PropertyRecord) => ({
  leaseAgreement: asValues(raw).leaseAgreement ?? null,
  rentalInfo: asValues(raw).rentalInfo ?? null,
});

/** Turns the base property payload into the lease page's: the lease block rides on top. */
const withLease =
  (toApi: (rest: Values) => Values) =>
  (data: Values): Values => {
    const { leaseAgreement, rentalInfo, ...rest } = data;
    return { ...toApi(rest), leaseAgreement, rentalInfo };
  };

// ── Land ────────────────────────────────────────────────────────────────

export const landToForm = (raw: PropertyRecord): createLandFormType =>
  ({
    ...createLandFormDefault,
    ...mapLandPropertyResponseToForm(raw as never),
    isRentedOut: asValues(raw).isRentedOut ?? false,
    ...leaseBlock(raw),
  }) as unknown as createLandFormType;

export const landToPayload = withLease(rest => rest);

// ── Land and building ───────────────────────────────────────────────────

export const landBuildingToForm = (raw: PropertyRecord): createLandAndBuildingFormType =>
  ({
    ...createLandAndBuildingFormDefault,
    ...mapLandAndBuildingPropertyResponseToForm(raw as never),
    isRentedOut: asValues(raw).isRentedOut ?? false,
    ...leaseBlock(raw),
  }) as unknown as createLandAndBuildingFormType;

// ── Condo ───────────────────────────────────────────────────────────────

/**
 * buildingInsurancePrice is server-derived (rate x usableArea): display only, never sent back.
 * The return type is the mapper's own (untyped), which is what the page's update hook accepts.
 */
export const condoToPayload = (data: Values) => {
  const rest = { ...data };
  delete rest.buildingInsurancePrice;
  return mapCondoFormDataToApiPayload(rest as never);
};

// ── Lease agreement variants ────────────────────────────────────────────

export const leaseLandToForm = (raw: PropertyRecord): createLeaseAgreementLandFormType =>
  ({
    ...createLeaseAgreementLandFormDefault,
    ...mapLandPropertyResponseToForm(raw as never),
    ...leaseBlock(raw),
  }) as unknown as createLeaseAgreementLandFormType;

export const leaseBuildingToForm = (raw: PropertyRecord): createLeaseAgreementBuildingFormType =>
  ({
    ...createLeaseAgreementBuildingFormDefault,
    ...mapBuildingPropertyResponseToForm(raw as never),
    ...leaseBlock(raw),
  }) as unknown as createLeaseAgreementBuildingFormType;

export const leaseLandBuildingToForm = (
  raw: PropertyRecord,
): createLeaseAgreementLandAndBuildingFormType =>
  ({
    ...createLeaseAgreementLandAndBuildingFormDefault,
    ...mapLandAndBuildingPropertyResponseToForm(raw as never),
    ...leaseBlock(raw),
  }) as unknown as createLeaseAgreementLandAndBuildingFormType;

export const leaseCondoToForm = (raw: PropertyRecord): createLeaseAgreementCondoFormType =>
  ({
    ...createLeaseAgreementCondoFormDefault,
    ...mapCondoPropertyResponseToForm(raw as never),
    ...leaseBlock(raw),
  }) as unknown as createLeaseAgreementCondoFormType;

export const leaseLandToPayload = withLease(rest => rest);
export const leaseBuildingToPayload = withLease(rest =>
  mapBuildingFormDataToApiPayload(rest as never),
);
export const leaseLandBuildingToPayload = withLease(rest =>
  mapLandAndBuildingFormDataToApiPayload(rest as never),
);
// The lease condo page never stripped buildingInsurancePrice, so neither does this.
export const leaseCondoToPayload = withLease(rest => mapCondoFormDataToApiPayload(rest as never));

// ── Registry, by property type code ─────────────────────────────────────

export interface PropertyFormRecipe {
  /** What the page validates with. */
  schema: z.ZodTypeAny;
  toForm: (raw: PropertyRecord) => Values;
  /** The PUT body, from the resolver's values (or `getValues()`, as a draft save passes). */
  toPayload: (values: Values) => unknown;
}

export const PROPERTY_FORM_RECIPES: Record<string, PropertyFormRecipe> = {
  L: { schema: createLandForm, toForm: landToForm, toPayload: landToPayload },
  B: {
    schema: createBuildingForm,
    toForm: raw => mapBuildingPropertyResponseToForm(raw as never),
    toPayload: data => mapBuildingFormDataToApiPayload(data as never),
  },
  LB: {
    schema: createLandAndBuildingForm,
    toForm: landBuildingToForm,
    toPayload: data => mapLandAndBuildingFormDataToApiPayload(data as never),
  },
  U: {
    schema: createCondoForm,
    toForm: raw => mapCondoPropertyResponseToForm(raw as never),
    toPayload: condoToPayload,
  },
  MAC: {
    schema: createMachineryForm,
    toForm: raw => mapMachineryPropertyResponseToForm(raw as never),
    // The machinery page sends the form values as they are.
    toPayload: data => data,
  },
  LSL: {
    schema: createLeaseAgreementLandForm,
    toForm: leaseLandToForm,
    toPayload: leaseLandToPayload,
  },
  LSB: {
    schema: createLeaseAgreementBuildingForm,
    toForm: leaseBuildingToForm,
    toPayload: leaseBuildingToPayload,
  },
  LS: {
    schema: createLeaseAgreementLandAndBuildingForm,
    toForm: leaseLandBuildingToForm,
    toPayload: leaseLandBuildingToPayload,
  },
  LSU: {
    schema: createLeaseAgreementCondoForm,
    toForm: leaseCondoToForm,
    toPayload: leaseCondoToPayload,
  },
};
