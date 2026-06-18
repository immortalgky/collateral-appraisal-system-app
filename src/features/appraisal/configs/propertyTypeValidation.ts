import type { FormField } from '@/shared/components/form';
import type { z } from 'zod';
import {
  allBuildingFields,
  allCondoFields,
  allLandBuildingFields,
  allLandFields,
  allLeaseAgreementFields,
  allMachineryFields,
  rentalScheduleField,
} from './fields';
import {
  mapBuildingPropertyResponseToForm,
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
  mapMachineryPropertyResponseToForm,
} from '../utils/mappers';
import {
  createBuildingForm,
  createCondoForm,
  createLandAndBuildingForm,
  createLandForm,
  createLeaseAgreementForm,
  createMachineryForm,
  rentalInfoFormSchema,
} from '../schemas/form';

/** One slice of a property's validation (a schema applied to part of the mapped data). */
export interface ValidationSlice {
  /** Section label, used for a fallback message when a failure has no field path. */
  label: string;
  schema: z.ZodTypeAny;
  /** Picks the portion of the mapped data this schema validates. */
  pick: (mapped: Record<string, unknown>) => unknown;
}

/**
 * Mandatory-field validation config for a property type.
 * Self-contained: carries its own detail endpoint and the exact schemas the data-entry
 * form uses, so it does not depend on the (machinery-inconsistent) propertyTypeConfig maps.
 */
export interface PropertyTypeValidationConfig {
  /** Detail endpoint segment, e.g. "building-detail". */
  detailEndpoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapResponseToForm: (response: any) => Record<string, unknown>;
  validations: ValidationSlice[];
  /** Field configs used to turn failing field names into human labels. */
  labelFields: FormField[];
}

const identity = (mapped: Record<string, unknown>) => mapped;

/**
 * Builds a lease config: the underlying property schema PLUS a required lease-agreement tab
 * and a required rental-info tab (decision: the agreement tab is mandatory for lease types).
 */
function leaseConfig(
  detailEndpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseMap: (response: any) => Record<string, unknown>,
  baseSchema: z.ZodTypeAny,
  baseFields: FormField[],
): PropertyTypeValidationConfig {
  return {
    detailEndpoint,
    mapResponseToForm: response => ({
      ...baseMap(response),
      leaseAgreement: response?.leaseAgreement ?? null,
      rentalInfo: response?.rentalInfo ?? null,
    }),
    validations: [
      { label: 'property detail', schema: baseSchema, pick: identity },
      {
        label: 'lease agreement',
        schema: createLeaseAgreementForm,
        pick: mapped => mapped.leaseAgreement,
      },
      { label: 'rental info', schema: rentalInfoFormSchema, pick: mapped => mapped.rentalInfo },
    ],
    labelFields: [...baseFields, ...allLeaseAgreementFields, ...rentalScheduleField],
  };
}

const MACHINERY_CONFIG: PropertyTypeValidationConfig = {
  detailEndpoint: 'machinery-detail',
  mapResponseToForm: mapMachineryPropertyResponseToForm,
  validations: [{ label: 'detail', schema: createMachineryForm, pick: identity }],
  labelFields: allMachineryFields,
};

/**
 * Per-property-type mandatory-field configuration, keyed by backend property type code.
 *
 * Reuses the exact composed schemas (schemas/form.ts) and response→form mappers (utils/mappers.ts)
 * the detail forms use, so validation stays in lock-step with data entry.
 *
 * Machine / Vehicle / Vessel all map to machinery (the FE has no separate vehicle/vessel detail
 * endpoint, fields, or mapper — they are machinery). Lease variants validate the underlying
 * property detail PLUS the (required) lease-agreement and rental-info tabs.
 */
export const PROPERTY_TYPE_VALIDATION: Record<string, PropertyTypeValidationConfig> = {
  L: {
    detailEndpoint: 'land-detail',
    mapResponseToForm: mapLandPropertyResponseToForm,
    validations: [{ label: 'detail', schema: createLandForm, pick: identity }],
    labelFields: allLandFields,
  },
  B: {
    detailEndpoint: 'building-detail',
    mapResponseToForm: mapBuildingPropertyResponseToForm,
    validations: [{ label: 'detail', schema: createBuildingForm, pick: identity }],
    labelFields: allBuildingFields,
  },
  LB: {
    detailEndpoint: 'land-and-building-detail',
    mapResponseToForm: mapLandAndBuildingPropertyResponseToForm,
    validations: [{ label: 'detail', schema: createLandAndBuildingForm, pick: identity }],
    labelFields: allLandBuildingFields,
  },
  U: {
    detailEndpoint: 'condo-detail',
    mapResponseToForm: mapCondoPropertyResponseToForm,
    validations: [{ label: 'detail', schema: createCondoForm, pick: identity }],
    labelFields: allCondoFields,
  },
  MAC: MACHINERY_CONFIG,
  VEH: MACHINERY_CONFIG,
  VES: MACHINERY_CONFIG,
  LSL: leaseConfig(
    'lease-agreement-land-detail',
    mapLandPropertyResponseToForm,
    createLandForm,
    allLandFields,
  ),
  LSB: leaseConfig(
    'lease-agreement-building-detail',
    mapBuildingPropertyResponseToForm,
    createBuildingForm,
    allBuildingFields,
  ),
  LS: leaseConfig(
    'lease-agreement-land-building-detail',
    mapLandAndBuildingPropertyResponseToForm,
    createLandAndBuildingForm,
    allLandBuildingFields,
  ),
  LSU: leaseConfig(
    'lease-agreement-condo-detail',
    mapCondoPropertyResponseToForm,
    createCondoForm,
    allCondoFields,
  ),
};

/** Maps display names → backend codes, so the lookup is robust to either form. */
const DISPLAY_TO_CODE: Record<string, string> = {
  Lands: 'L',
  Building: 'B',
  Condominium: 'U',
  'Land and building': 'LB',
  Machine: 'MAC',
  Machinery: 'MAC',
  Vehicle: 'VEH',
  Vessel: 'VES',
  'Lease Agreement Lands': 'LSL',
  'Lease Agreement Building': 'LSB',
  'Lease Agreement Land and building': 'LS',
  'Lease Agreement Condo': 'LSU',
};

/** Normalises a backend code or display name to the canonical code used as the registry key. */
export const normalizeTypeCode = (typeOrCode: string): string =>
  PROPERTY_TYPE_VALIDATION[typeOrCode] ? typeOrCode : (DISPLAY_TO_CODE[typeOrCode] ?? typeOrCode);

export const getPropertyTypeValidationConfig = (
  typeOrCode: string,
): PropertyTypeValidationConfig | undefined =>
  PROPERTY_TYPE_VALIDATION[normalizeTypeCode(typeOrCode)];
