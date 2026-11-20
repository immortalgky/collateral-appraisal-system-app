import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import { machineInfoFields } from '../configs/fields';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Literal key map. The strictly-typed `t()` rejects a key built by concatenation
// (`propertyInfo.machineryInfo.fields.${field.name}`), and FormFields renders `field.label`
// verbatim — so the label has to be translated before the config reaches it. Same shape as
// MachinerySummaryTab. Thai wording follows the appraisal book (partials/section-machine.html):
// the form and the printed page should call a field the same thing.
const FIELD_LABEL_KEYS = {
  propertyName: 'propertyInfo.machineryInfo.fields.propertyName',
  machineType: 'propertyInfo.machineryInfo.fields.machineType',
  brand: 'propertyInfo.machineryInfo.fields.brand',
  model: 'propertyInfo.machineryInfo.fields.model',
  series: 'propertyInfo.machineryInfo.fields.series',
  quantity: 'propertyInfo.machineryInfo.fields.quantity',
  manufacturer: 'propertyInfo.machineryInfo.fields.manufacturer',
  yearOfManufacture: 'propertyInfo.machineryInfo.fields.yearOfManufacture',
  purchaseDate: 'propertyInfo.machineryInfo.fields.purchaseDate',
  purchasePrice: 'propertyInfo.machineryInfo.fields.purchasePrice',
  isOwnerVerified: 'propertyInfo.machineryInfo.fields.isOwnerVerified',
  ownerName: 'propertyInfo.machineryInfo.fields.ownerName',
  registrationStatus: 'propertyInfo.machineryInfo.fields.registrationStatus',
  registrationNumber: 'propertyInfo.machineryInfo.fields.registrationNumber',
  installationStatus: 'propertyInfo.machineryInfo.fields.installationStatus',
  invoiceNumber: 'propertyInfo.machineryInfo.fields.invoiceNumber',
  isPriceCertified: 'propertyInfo.machineryInfo.fields.isPriceCertified',
  conditionUse: 'propertyInfo.machineryInfo.fields.conditionUse',
  isOperational: 'propertyInfo.machineryInfo.fields.isOperational',
  machineCondition: 'propertyInfo.machineryInfo.fields.machineCondition',
  machineAge: 'propertyInfo.machineryInfo.fields.machineAge',
  machineEfficiency: 'propertyInfo.machineryInfo.fields.machineEfficiency',
  usagePurpose: 'propertyInfo.machineryInfo.fields.usagePurpose',
  capacity: 'propertyInfo.machineryInfo.fields.capacity',
  location: 'propertyInfo.machineryInfo.fields.location',
  width: 'propertyInfo.machineryInfo.fields.width',
  length: 'propertyInfo.machineryInfo.fields.length',
  height: 'propertyInfo.machineryInfo.fields.height',
  machineDimensions: 'propertyInfo.machineryInfo.fields.machineDimensions',
  energyUse: 'propertyInfo.machineryInfo.fields.energyUse',
  machineTechnology: 'propertyInfo.machineryInfo.fields.machineTechnology',
  other: 'propertyInfo.machineryInfo.fields.other',
  machineParts: 'propertyInfo.machineryInfo.fields.machineParts',
  remark: 'propertyInfo.machineryInfo.fields.remark',
  appraiserOpinion: 'propertyInfo.machineryInfo.fields.appraiserOpinion',
} as const;

// boolean-toggle carries its two captions in `options`, which FormFields renders verbatim just
// like the label — so they need translating in the same pass. Literal keys for the same reason.
const FIELD_OPTION_KEYS = {
  isOwnerVerified: [
    'propertyInfo.machineryInfo.options.cannot',
    'propertyInfo.machineryInfo.options.can',
  ],
  isOperational: [
    'propertyInfo.machineryInfo.options.cannotUse',
    'propertyInfo.machineryInfo.options.canUse',
  ],
  registrationStatus: [
    'propertyInfo.machineryInfo.options.unregistered',
    'propertyInfo.machineryInfo.options.registered',
  ],
  isPriceCertified: [
    'propertyInfo.machineryInfo.options.notCertified',
    'propertyInfo.machineryInfo.options.certified',
  ],
} as const;

const MachineryDetailForm = () => {
  const { t } = useTranslation('appraisal');

  // No auto-fill trigger here: the machinery form has a single name field, so there is no second
  // field to derive it from the way land derives one from its title numbers.
  const machineFields = useMemo<FormField[]>(
    () =>
      machineInfoFields.map(field => {
        const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
        const translated = key ? { ...field, label: t(key) } : field;

        const optionKeys = FIELD_OPTION_KEYS[field.name as keyof typeof FIELD_OPTION_KEYS];
        if (!optionKeys) return translated;
        return { ...translated, options: [t(optionKeys[0]), t(optionKeys[1])] } as FormField;
      }),
    [t],
  );

  const byName = new Map(machineFields.map(field => [field.name, field]));
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

type GroupEntry = string | [name: string, span: string, narrowSpan?: 3 | 4 | 6 | 12];

/** Picks translated fields by name; a span given here replaces the config's own col-span. */
function pick(byName: Map<string, FormField>, entries: GroupEntry[]): FormField[] {
  return entries.map(entry => {
    const [name, span, narrowSpan] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`MachineryDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim(), narrowSpan };
  });
}

/*
 * The screen's field order. The config was one 36-field section; these groups follow how a machine
 * is recorded: what it is, who owns it and how it was bought and installed, its condition, its size,
 * then notes and the appraiser's opinion (the source of that line in the book).
 */
const GROUPS = [
  {
    titleKey: 'propertyInfo.machineryInfo.groups.identification',
    icon: 'gears',
    fields: [
      'propertyName',
      // The type, the year and the count; then the four names (brand, model, series, maker).
      ['machineType', 'col-span-6'],
      ['yearOfManufacture', 'col-span-3'],
      ['quantity', 'col-span-3'],
      ['brand', 'col-span-3'],
      ['model', 'col-span-3'],
      ['series', 'col-span-3'],
      ['manufacturer', 'col-span-3'],
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.ownership',
    icon: 'scale-balanced',
    // Each check sits beside the text it governs (a toggle + field row); the purchase is a row of four; price
    // certification is a decision, not a detail of the purchase, so it ends the group.
    fields: [
      ['isOwnerVerified', 'col-span-3'],
      ['ownerName', 'col-span-9'],
      ['registrationStatus', 'col-span-3'],
      ['registrationNumber', 'col-span-9'],
      ['purchaseDate', 'col-span-3'],
      ['purchasePrice', 'col-span-3'],
      ['installationStatus', 'col-span-3'],
      ['invoiceNumber', 'col-span-3'],
      ['location', 'col-span-9'],
      ['isPriceCertified', 'col-span-3'],
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.condition',
    icon: 'gauge',
    fields: [
      // Whether it runs at all comes first, then how it is used, then its age, condition and
      // efficiency together (3 + 4 + 5), then the capacity, purpose, energy and technology in pairs.
      ['isOperational', 'col-span-3', 3],
      'conditionUse',
      ['machineAge', 'col-span-3'],
      ['machineCondition', 'col-span-4'],
      ['machineEfficiency', 'col-span-5'],
      ['capacity', 'col-span-6'],
      ['usagePurpose', 'col-span-6'],
      ['energyUse', 'col-span-6'],
      ['machineTechnology', 'col-span-6'],
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.dimensions',
    icon: 'ruler-combined',
    // Width, length and height stay three fields side by side (2 + 2 + 2), beside the free text.
    fields: [
      ['width', 'col-span-2'],
      ['length', 'col-span-2'],
      ['height', 'col-span-2'],
      ['machineDimensions', 'col-span-6'],
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.notes',
    icon: 'comment',
    fields: ['machineParts', ['other', 'col-span-12'], 'remark'],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.opinion',
    icon: 'user-pen',
    fields: [['appraiserOpinion', 'col-span-12']],
  },
] as const satisfies readonly { titleKey: string; icon: string; fields: readonly GroupEntry[] }[];

export default MachineryDetailForm;
