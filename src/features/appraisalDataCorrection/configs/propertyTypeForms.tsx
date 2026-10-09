import type { ReactNode } from 'react';
import { z } from 'zod';
import { PROPERTY_FORM_RECIPES } from '@/features/appraisal/utils/propertyFormRecipes';
import { getDetailEndpoint } from '@/features/appraisal/utils/propertyTypeConfig';
import Section from '@/shared/components/sections/Section';
import type { FormField } from '@/shared/components/form';
import { vehicleCorrectionFields, vesselCorrectionFields } from './generatedFields';
import GeneratedDetailForm from '../components/GeneratedDetailForm';
import FormSectionHeader from '../components/FormSectionHeader';
import {
  PropertyBodyFrame,
  PropertyTabs,
  type EditorContext,
  type TabLayout,
} from '../components/PropertyTabs';

/**
 * The correction screen edits a property with the property page's own form bodies, tabs, schema,
 * record-to-form mapper and payload mapper (`appraisal/utils/propertyFormRecipes`), so a change
 * to a property form is made once. What this file owns is which tabs each type has — the order and
 * conditions of its `Create*Page`.
 *
 * Nothing the page's own payload carries is left out. Construction inspection and the
 * lease/rental blocks each have their tab, so they are editable rather than merely passed
 * through; the update they are sent to is a full overwrite.
 *
 * Vehicle and vessel are the one exception — no create/edit screen has ever existed for them,
 * so their fields are generated from the backend DTO. See `GeneratedDetailForm`.
 */

export type { EditorContext };

/**
 * What `useGetPropertyDetail` hands back: the detail endpoint's JSON, untyped, because one hook
 * serves eleven different response shapes.
 */
export type PropertyDetailPayload = Record<string, unknown>;

export interface PropertyTypeForm {
  /** Zod schema the create/edit screen validates with. */
  schema: z.ZodTypeAny;
  /** Turns the property-detail API response into form values — the screen's own mapper. */
  toForm: (raw: PropertyDetailPayload) => Record<string, unknown>;
  /** The body the screen's own PUT sends, from the validated form values. */
  toPayload: (values: Record<string, unknown>) => unknown;
  /** Route suffix of the detail endpoint: `PUT …/data-correction/{suffix}` takes the same body. */
  suffix: string;
  /**
   * The tab bar and panels. Rendered straight into the editor's scroll container: the bar is
   * `sticky`, and a sticky element only sticks inside its parent.
   */
  render: (context: EditorContext) => ReactNode;
}

/** Tabs per type, as the pages order them (see each `Create*Page`'s `editorTabs`). */
const LAYOUTS: Record<string, TabLayout> = {
  L: { panels: ['land', 'lease-agreement', 'rental-info'], rentedOutOnly: true },
  B: { panels: ['building', 'construction'] },
  LB: {
    panels: ['land', 'building', 'construction', 'lease-agreement', 'rental-info'],
    landType: 'LB',
    buildingType: 'LB',
    rentedOutOnly: true,
  },
  U: { panels: ['condo', 'construction'], condo: true },
  MAC: { panels: ['machinery'] },
  LSL: { panels: ['land', 'lease-agreement', 'rental-info'] },
  LSB: { panels: ['building', 'construction', 'lease-agreement', 'rental-info'] },
  LS: {
    panels: ['land', 'building', 'construction', 'lease-agreement', 'rental-info'],
    landType: 'LS',
    buildingType: 'LS',
  },
  LSU: { panels: ['condo', 'construction', 'lease-agreement', 'rental-info'], condo: true },
};

/**
 * Vehicle and vessel have no create screen and therefore no schema. `FormFields` only reads a
 * schema to pull constraints such as maxLength off it, so an empty object schema is a truthful
 * "no constraints declared" rather than a placeholder.
 */
const GENERATED_FORM_SCHEMA = z.object({}).passthrough();

/**
 * Vehicle and vessel take a flat detail: the generated fields, nothing else. The GET names the
 * ownership flag `verifiableOwner` where the PUT calls it `isOwnerVerified`, and carries ids and
 * the property envelope the PUT has no use for — the form holds only what the PUT accepts.
 */
const generatedForm = (title: string, fields: FormField[], suffix: string): PropertyTypeForm => {
  const names = fields.map(f => f.name);
  return {
    schema: GENERATED_FORM_SCHEMA,
    suffix,
    toForm: raw => ({
      ...Object.fromEntries(names.map(name => [name, raw[name] ?? null])),
      isOwnerVerified: raw.verifiableOwner ?? false,
    }),
    toPayload: values => Object.fromEntries(names.map(name => [name, values[name] ?? null])),
    render: () => (
      <PropertyBodyFrame>
        <div className="flex flex-col gap-6 min-w-0 max-w-full">
          <FormSectionHeader tone="generated" titleKey={title} />
          <Section className="flex flex-col gap-6 min-w-0 overflow-hidden">
            <GeneratedDetailForm fields={fields} />
          </Section>
        </div>
      </PropertyBodyFrame>
    ),
  };
};

/**
 * Built once, so a property type resolves to the same object on every render: the editor keys its
 * form defaults on it, and a fresh object each call would reset the form endlessly.
 */
const PROPERTY_TYPE_FORMS: Record<string, PropertyTypeForm> = {
  ...Object.fromEntries(
    Object.entries(LAYOUTS).map(([code, layout]) => [
      code,
      {
        ...PROPERTY_FORM_RECIPES[code],
        suffix: getDetailEndpoint(code)!,
        render: (context: EditorContext) => <PropertyTabs layout={layout} context={context} />,
      },
    ]),
  ),
  VEH: generatedForm('Vehicle Information', vehicleCorrectionFields, 'vehicle-detail'),
  VES: generatedForm('Vessel Information', vesselCorrectionFields, 'vessel-detail'),
};

export const getPropertyTypeForm = (typeCode: string): PropertyTypeForm | undefined =>
  PROPERTY_TYPE_FORMS[typeCode];
