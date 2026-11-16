import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import { vehicleInfoFields } from '../configs/fields';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const FIELD_LABEL_KEYS = {
  propertyName: 'propertyInfo.vehicleInfo.fields.propertyName',
  engineNo: 'propertyInfo.vehicleInfo.fields.engineNumber',
  chassisNo: 'propertyInfo.vehicleInfo.fields.chassisNumber',
  licensePlateNumber: 'propertyInfo.vehicleInfo.fields.licensePlateNumber',
  registrationNumber: 'propertyInfo.vehicleInfo.fields.registrationNumber',
  registrationDate: 'propertyInfo.vehicleInfo.fields.registrationDate',
  color: 'propertyInfo.vehicleInfo.fields.color',
  colorOther: 'propertyInfo.vehicleInfo.fields.colorOther',
  brand: 'propertyInfo.vehicleInfo.fields.brand',
  model: 'propertyInfo.vehicleInfo.fields.model',
  yearOfManufacture: 'propertyInfo.vehicleInfo.fields.yearOfManufacture',
  vehicleType: 'propertyInfo.vehicleInfo.fields.vehicleType',
  vehicleTypeOther: 'propertyInfo.vehicleInfo.fields.vehicleTypeOther',
  purchaseDate: 'propertyInfo.vehicleInfo.fields.purchaseDate',
  purchasePrice: 'propertyInfo.vehicleInfo.fields.purchasePrice',
  energyUse: 'propertyInfo.vehicleInfo.fields.energyUse',
  energyUseOther: 'propertyInfo.vehicleInfo.fields.energyUseOther',
  location: 'propertyInfo.vehicleInfo.fields.location',
} as const;

const VehicleDetailForm = () => {
  const { t } = useTranslation('appraisal');

  const vehicleFields = useMemo<FormField[]>(
    () =>
      vehicleInfoFields.map(field => {
        const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
        return key ? { ...field, label: t(key) } : field;
      }),
    [t],
  );

  const byName = new Map(vehicleFields.map(field => [field.name, field]));
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
    if (!field) throw new Error(`VehicleDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
  });
}

const GROUPS = [
  {
    titleKey: 'propertyInfo.vehicleInfo.groups.identification',
    icon: 'car',
    fields: [
      'propertyName',
      ['vehicleType', 'col-span-12'],
      'vehicleTypeOther',
      ['brand', 'col-span-4'],
      ['model', 'col-span-4'],
      ['yearOfManufacture', 'col-span-4'],
      'color',
      'colorOther',
      'energyUse',
      'energyUseRemark',
    ],
  },
  {
    titleKey: 'propertyInfo.vehicleInfo.groups.registration',
    icon: 'id-card',
    fields: [
      ['licensePlateNumber', 'col-span-6'],
      ['registrationNumber', 'col-span-6'],
      ['registrationDate', 'col-span-6'],
      ['engineNo', 'col-span-6'],
      ['chassisNo', 'col-span-6'],
    ],
  },
  {
    titleKey: 'propertyInfo.vehicleInfo.groups.purchase',
    icon: 'location-dot',
    fields: [['purchaseDate', 'col-span-6'], ['purchasePrice', 'col-span-6'], 'location'],
  },
] as const satisfies readonly { titleKey: string; icon: string; fields: readonly GroupEntry[] }[];

export default VehicleDetailForm;
