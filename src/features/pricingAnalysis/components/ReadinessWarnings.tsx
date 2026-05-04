import { useTranslation } from 'react-i18next';
import type { RuleViolationDto } from '../types/readiness';

interface Props {
  violations: RuleViolationDto[];
  /** Optional title override. */
  title?: string;
}

/**
 * Group-level readiness banner. Renders nothing when the group is ready.
 * Drop this above the property list on the property-group detail page.
 */
export function ReadinessWarnings({ violations, title }: Props) {
  const { t } = useTranslation();
  if (violations.length === 0) return null;

  return (
    <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">
        {title ?? t('readiness.notReadyTitle', {
          defaultValue: 'This group is not ready for pricing analysis',
        })}
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {violations.map((v, idx) => (
          <li key={`${v.code}-${v.propertyId ?? 'group'}-${idx}`}>
            {t(`readiness.${v.code}`, { defaultValue: v.message })}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ChipProps {
  violations: RuleViolationDto[];
}

/**
 * Per-property chip cluster. Use inside each property card:
 *
 *   const chips = violationsByProperty.get(property.id) ?? [];
 *   <PropertyReadinessChips violations={chips} />
 */
export function PropertyReadinessChips({ violations }: ChipProps) {
  const { t } = useTranslation();
  if (violations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {violations.map((v, idx) => (
        <span
          key={`${v.code}-${idx}`}
          className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
        >
          {t(`readiness.${v.code}.short`, {
            defaultValue: t(`readiness.${v.code}`, { defaultValue: v.code }),
          })}
        </span>
      ))}
    </div>
  );
}
