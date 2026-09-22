import { FormFields, type FormField } from '@/shared/components/form';
import { machineInfoFields } from '../configs/fields';
import { Icon } from '@/shared/components';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="cas-section-head col-span-full xl:col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-full xl:col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="cas-section-rule h-px bg-gray-200 col-span-full xl:col-span-5" />}
  </>
);

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
    <div className="cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-6">
      {GROUPS.map((g, i) => (
        <SectionRow
          key={g.titleKey}
          title={t(g.titleKey)}
          icon={g.icon}
          isLast={i === GROUPS.length - 1}
        >
          <FormFields fields={group(...g.fields)} />
        </SectionRow>
      ))}
    </div>
  );
};

type GroupEntry = string | [name: string, span: string];

/** Picks translated fields by name; a span given here replaces the config's own col-span. */
function pick(byName: Map<string, FormField>, entries: GroupEntry[]): FormField[] {
  return entries.map(entry => {
    const [name, span] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`MachineryDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
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
      ['machineType', 'col-span-6'],
      ['quantity', 'col-span-6'],
      ['brand', 'col-span-4'],
      ['model', 'col-span-4'],
      ['series', 'col-span-4'],
      ['manufacturer', 'col-span-6'],
      ['yearOfManufacture', 'col-span-6'],
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.ownership',
    icon: 'scale-balanced',
    // Price certification gets a row of its own: it is a decision, not a detail of the purchase.
    fields: [
      ['isOwnerVerified', 'col-span-4'],
      ['ownerName', 'col-span-8'],
      ['registrationStatus', 'col-span-4'],
      ['registrationNumber', 'col-span-8'],
      ['purchaseDate', 'col-span-4'],
      ['purchasePrice', 'col-span-8'],
      ['installationStatus', 'col-span-4'],
      ['invoiceNumber', 'col-span-8'],
      'location',
      ['isPriceCertified', 'col-span-12'],
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.condition',
    icon: 'gauge',
    fields: [
      'conditionUse',
      ['isOperational', 'col-span-4'],
      ['machineAge', 'col-span-4'],
      ['machineCondition', 'col-span-4'],
      ['machineEfficiency', 'col-span-6'],
      ['capacity', 'col-span-6'],
      ['usagePurpose', 'col-span-6'],
      ['energyUse', 'col-span-6'],
      'machineTechnology',
    ],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.dimensions',
    icon: 'ruler-combined',
    fields: ['width', 'length', 'height', 'machineDimensions'],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.notes',
    icon: 'comment',
    fields: ['machineParts', 'other', 'remark'],
  },
  {
    titleKey: 'propertyInfo.machineryInfo.groups.opinion',
    icon: 'user-pen',
    fields: [['appraiserOpinion', 'col-span-12']],
  },
] as const satisfies readonly { titleKey: string; icon: string; fields: readonly GroupEntry[] }[];

export default MachineryDetailForm;
