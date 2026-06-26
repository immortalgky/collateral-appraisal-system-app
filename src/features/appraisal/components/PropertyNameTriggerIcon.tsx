import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * Property types that drive which source fields are used to fill propertyName.
 *
 *  L  / LSL  → titles[].titleNumber  (joined by ", ")
 *  B  / LSB  → buildingNumber + modelName
 *  U  / LSU  → condoName + modelName
 *  LB / LS   → [L formula] + " " + [B formula]
 *  MAC       → machineName
 */
export type PropertyType = 'L' | 'LSL' | 'B' | 'LSB' | 'U' | 'LSU' | 'LB' | 'LS' | 'MAC';

interface PropertyNameFillTriggerIconProps {
  propertyType: PropertyType;
}

function buildLandPart(values: Record<string, any>): string {
  const titles: Array<Record<string, any>> = values.titles ?? [];
  return titles
    .map(t => (t.titleNumber ?? '').toString().trim())
    .filter(Boolean)
    .join(', ');
}

function buildBuildingPart(values: Record<string, any>): string {
  const parts = [
    (values.buildingNumber ?? '').toString().trim(),
    (values.modelName ?? '').toString().trim(),
  ].filter(Boolean);
  return parts.join(' ');
}

function buildCondoPart(values: Record<string, any>): string {
  const parts = [
    (values.condoName ?? '').toString().trim(),
    (values.modelName ?? '').toString().trim(),
  ].filter(Boolean);
  return parts.join(' ');
}

function buildMachinePart(values: Record<string, any>): string {
  return (values.machineName ?? '').toString().trim();
}

function derivePropertyName(propertyType: PropertyType, values: Record<string, any>): string {
  switch (propertyType) {
    case 'L':
    case 'LSL':
      return buildLandPart(values);

    case 'B':
    case 'LSB':
      return buildBuildingPart(values);

    case 'U':
    case 'LSU':
      return buildCondoPart(values);

    case 'LB':
    case 'LS': {
      const landPart = buildLandPart(values);
      const buildingPart = buildBuildingPart(values);
      return [landPart, buildingPart].filter(Boolean).join(' ');
    }

    case 'MAC':
      return buildMachinePart(values);

    default:
      return '';
  }
}

export function PropertyNameTriggerIcon({ propertyType }: PropertyNameFillTriggerIconProps) {
  const { getValues, setValue } = useFormContext();
  const { t } = useTranslation('appraisal');
  const label = t('forms.propertyName.autoFillLabel');

  const handleClick = () => {
    const values = getValues();
    const derived = derivePropertyName(propertyType, values);
    if (derived) {
      setValue('propertyName', derived, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={e => e.preventDefault()}
      title={label}
      aria-label={label}
      className="pointer-events-auto p-1 -m-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
        />
      </svg>
    </button>
  );
}
