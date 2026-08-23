import type { ReactNode } from 'react';
import { z } from 'zod';
import LandDetailForm from '../forms/LandDetailForm';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import CondoDetailForm from '../forms/CondoDetailForm';
import MachineryDetailForm from '../forms/MachineryDetailForm';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import {
  createLandForm,
  createLandFormDefault,
  createBuildingForm,
  createBuildingFormDefault,
  createCondoForm,
  createCondoFormDefault,
  createLandAndBuildingForm,
  createLandAndBuildingFormDefault,
  createMachineryForm,
  createMachineryFormDefault,
} from '@/features/appraisal/schemas/form';
import {
  mapLandPropertyResponseToForm,
  mapBuildingPropertyResponseToForm,
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
  mapMachineryPropertyResponseToForm,
} from '@/features/appraisal/utils/mappers';
import Section from '@/shared/components/sections/Section';
import { vehicleCorrectionFields, vesselCorrectionFields } from './generatedFields';
import GeneratedDetailForm from '../components/GeneratedDetailForm';
import FormSectionHeader, { type SectionTone } from '../components/FormSectionHeader';
import TitleDeedForm from '../forms/TitleDeedForm';

/**
 * The correction screen owns its forms outright — `../forms/*` and `../configs/fields.ts` are
 * this feature's copies, not the appraisal feature's.
 *
 * This was not the first approach: an earlier version pulled the field *configs* out of
 * `appraisal/configs/fields.ts` and reassembled them here, which meant re-deriving layout,
 * section headings, labels, field order and dropdown parameter groups by hand — all of which
 * already exist, correct, in the form components. Anything rebuilt here drifts from the screen
 * the appraiser actually knows.
 *
 * The detail form components turned out to be reusable as-is: they take no props beyond an
 * optional prefix/propertyType, read everything through `useFormContext`, and make no API or
 * route calls. `usePageReadOnly()` returns its `false` default outside the appraisal route
 * tree, so they render editable here.
 *
 * Vehicle and vessel are the one exception — no create/edit screen has ever existed for them,
 * so their fields are generated from the backend DTO. See `GeneratedDetailForm`.
 */
/**
 * What `useGetPropertyDetail` hands back: the detail endpoint's JSON, untyped, because one hook
 * serves eleven different response shapes. Each mapper below is cast to accept it — they read
 * only the members their own property type has, and a missing one falls back to its default.
 */
export type PropertyDetailPayload = Record<string, unknown>;

export interface PropertyTypeForm {
  /** Zod schema the create/edit screen validates with — absent for the generated forms. */
  schema: z.ZodType<Record<string, unknown>>;
  /** Blank form values, used as the base before seeding the record. */
  defaults: Record<string, unknown>;
  /**
   * Turns the property-detail API response into form values — the screen's own mapper.
   *
   * Typed against the untyped payload `useGetPropertyDetail` returns rather than each mapper's
   * specific response type, since one registry entry has to hold all of them.
   */
  toForm: (raw: PropertyDetailPayload) => Record<string, unknown>;
  /** The create/edit screen's own form body, section headers included. */
  render: () => ReactNode;
}

/**
 * Vehicle and vessel have no create screen and therefore no schema. `FormFields` only reads a
 * schema to pull constraints such as maxLength off it, so an empty object schema is a truthful
 * "no constraints declared" rather than a placeholder.
 */
const GENERATED_FORM_SCHEMA = z.object({}).passthrough() as unknown as z.ZodType<
  Record<string, unknown>
>;

/**
 * The create screens wrap every detail form in exactly this — a flex column that lets the form
 * lay out its own internal grid. An earlier version wrapped them in `grid grid-cols-12`, which
 * fought the `xl:col-span-1 / xl:col-span-4` split the forms use for their label rail and
 * squeezed every field into one narrow column.
 */
const block = (tone: SectionTone, titleKey: string, body: ReactNode) => (
  <div className="flex flex-col gap-6 min-w-0 max-w-full">
    <FormSectionHeader tone={tone} titleKey={titleKey} />
    <Section className="flex flex-col gap-6 min-w-0 overflow-hidden">{body}</Section>
  </div>
);

/** Land titles come before the land detail on the create screens; keep that order. */
const landBlock = (propertyType: 'L' | 'LB') =>
  block(
    'land',
    'createPage.landSection',
    <>
      <TitleDeedForm />
      <LandDetailForm propertyType={propertyType} />
    </>,
  );

export const PROPERTY_TYPE_FORMS: Record<string, PropertyTypeForm> = {
  L: {
    schema: createLandForm,
    defaults: createLandFormDefault as Record<string, unknown>,
    toForm: mapLandPropertyResponseToForm as PropertyTypeForm['toForm'],
    render: () => landBlock('L'),
  },
  B: {
    schema: createBuildingForm,
    defaults: createBuildingFormDefault as Record<string, unknown>,
    toForm: mapBuildingPropertyResponseToForm as PropertyTypeForm['toForm'],
    render: () =>
      block('building', 'createPage.buildingSection', <BuildingDetailForm propertyType="B" />),
  },
  LB: {
    schema: createLandAndBuildingForm,
    defaults: createLandAndBuildingFormDefault as Record<string, unknown>,
    toForm: mapLandAndBuildingPropertyResponseToForm as PropertyTypeForm['toForm'],
    render: () => (
      <>
        {landBlock('LB')}
        {block('building', 'createPage.buildingSection', <BuildingDetailForm propertyType="LB" />)}
      </>
    ),
  },
  U: {
    schema: createCondoForm,
    defaults: createCondoFormDefault as Record<string, unknown>,
    toForm: mapCondoPropertyResponseToForm as PropertyTypeForm['toForm'],
    render: () => block('condo', 'createPage.condoSection', <CondoDetailForm />),
  },
  MAC: {
    schema: createMachineryForm,
    defaults: createMachineryFormDefault as Record<string, unknown>,
    toForm: mapMachineryPropertyResponseToForm as PropertyTypeForm['toForm'],
    render: () => block('machinery', 'createPage.machinerySection', <MachineryDetailForm />),
  },
  VEH: {
    schema: GENERATED_FORM_SCHEMA,
    defaults: {},
    toForm: raw => ({ ...raw }),
    render: () =>
      block(
        'generated',
        'Vehicle Information',
        <GeneratedDetailForm fields={vehicleCorrectionFields} />,
      ),
  },
  VES: {
    schema: GENERATED_FORM_SCHEMA,
    defaults: {},
    toForm: raw => ({ ...raw }),
    render: () =>
      block(
        'generated',
        'Vessel Information',
        <GeneratedDetailForm fields={vesselCorrectionFields} />,
      ),
  },
};

/**
 * Lease-agreement property types (LSL/LSB/LS/LSU) are the underlying property plus a lease
 * block, matching how the create screens compose them.
 */
const LEASE_BASE: Record<string, string> = { LSL: 'L', LSB: 'B', LS: 'LB', LSU: 'U' };

export function getPropertyTypeForm(typeCode: string): PropertyTypeForm | undefined {
  const direct = PROPERTY_TYPE_FORMS[typeCode];
  if (direct) return direct;

  const base = PROPERTY_TYPE_FORMS[LEASE_BASE[typeCode]];
  if (!base) return undefined;

  return {
    ...base,
    toForm: raw => ({ ...base.toForm(raw), leaseAgreement: raw?.leaseAgreement ?? {} }),
    render: () => (
      <>
        {base.render()}
        {block(
          'lease',
          'createPage.leaseAgreementSection',
          <LeaseAgreementForm namePrefix="leaseAgreement" />,
        )}
      </>
    ),
  };
}
