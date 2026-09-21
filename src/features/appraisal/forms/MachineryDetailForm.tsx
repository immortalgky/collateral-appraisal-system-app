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
    {!isLast && <div className="h-px bg-gray-200 col-span-full xl:col-span-5" />}
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

  return (
    <div className="cas-section-grid grid grid-cols-1 xl:grid-cols-5 gap-6">
      <SectionRow title={t('propertyInfo.machineryInfo.sectionTitle')} icon="building">
        <FormFields fields={machineFields} />
      </SectionRow>
    </div>
  );
};

export default MachineryDetailForm;
