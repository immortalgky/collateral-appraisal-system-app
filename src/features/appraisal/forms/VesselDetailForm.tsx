import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import { vesselInfoFields } from '../configs/fields';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const FIELD_LABEL_KEYS = {
  propertyName: 'propertyInfo.vesselInfo.fields.propertyName',
  model: 'propertyInfo.vesselInfo.fields.model',
  yearOfManufacture: 'propertyInfo.vesselInfo.fields.yearOfManufacture',
  vesselType: 'propertyInfo.vesselInfo.fields.vesselType',
  vesselTypeOther: 'propertyInfo.vesselInfo.fields.vesselTypeOther',
  capacity: 'propertyInfo.vesselInfo.fields.capacity',
  numberOfEngines: 'propertyInfo.vesselInfo.fields.numberOfEngines',
  hullNumber: 'propertyInfo.vesselInfo.fields.hullNumber',
  registrationNumber: 'propertyInfo.vesselInfo.fields.registrationNumber',
  purchaseDate: 'propertyInfo.vesselInfo.fields.purchaseDate',
  purchasePrice: 'propertyInfo.vesselInfo.fields.purchasePrice',
  grossTonnage: 'propertyInfo.vesselInfo.fields.grossTonnage',
  netTonnage: 'propertyInfo.vesselInfo.fields.netTonnage',
  location: 'propertyInfo.vesselInfo.fields.location',
  conditionUse: 'propertyInfo.vesselInfo.fields.conditionUse',
} as const;

const VesselDetailForm = () => {
  const { t } = useTranslation('appraisal');

  const vesselFields = useMemo<FormField[]>(
    () =>
      vesselInfoFields.map(field => {
        const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
        return key ? { ...field, label: t(key) } : field;
      }),
    [t],
  );

  const byName = new Map(vesselFields.map(field => [field.name, field]));
  const group = (...entries: GroupEntry[]) => pick(byName, entries);

  return (
    <FormSheet>
      {GROUPS.map(g => (
        <FormSection key={g.titleKey} title={t(g.titleKey)} icon={g.icon}>
          <FormFields fields={group(...g.fields)} />
        </FormSection>
      ))}
    </FormSheet>
  );
};

type GroupEntry = string | [name: string, span: string];

function pick(byName: Map<string, FormField>, entries: GroupEntry[]): FormField[] {
  return entries.map(entry => {
    const [name, span] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    if (!field) throw new Error(`VesselDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
  });
}

const GROUPS = [
  {
    titleKey: 'propertyInfo.vesselInfo.groups.identification',
    icon: 'ship',
    fields: [
      'propertyName',
      ['vesselType', 'col-span-12'],
      'vesselTypeOther',
      ['model', 'col-span-6'],
      ['yearOfManufacture', 'col-span-6'],
      ['hullNumber', 'col-span-6'],
      ['registrationNumber', 'col-span-6'],
    ],
  },
  {
    titleKey: 'propertyInfo.vesselInfo.groups.engineAndTonnage',
    icon: 'gauge',
    fields: [
      ['enginePower', 'col-span-6'],
      ['numberOfEngines', 'col-span-6'],
      ['grossTonnage', 'col-span-6'],
      ['netTonnage', 'col-span-6'],
    ],
  },
  {
    titleKey: 'propertyInfo.vesselInfo.groups.purchase',
    icon: 'location-dot',
    fields: [
      ['purchaseDate', 'col-span-6'],
      ['purchasePrice', 'col-span-6'],
      'location',
      'conditionUse',
    ],
  },
] as const satisfies readonly { titleKey: string; icon: string; fields: readonly GroupEntry[] }[];

export default VesselDetailForm;
