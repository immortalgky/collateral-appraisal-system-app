import { useTranslation } from 'react-i18next';

import Badge from '@/shared/components/Badge';
import { formatNumber } from '@/shared/utils/formatUtils';

interface CondoDerivedHintProps {
  /** What was counted, e.g. the unit list's total. */
  derived: number;
  /** What the appraiser entered; null/undefined when the field is empty. */
  entered: number | null | undefined;
  /**
   * Puts the counted value into the field. It only sets the form value (dirty), never saves and
   * never locks the field. Leave it out on a read-only page: the figures still show, the button not.
   */
  onUse?: () => void;
}

/**
 * "From the unit list 1,414 · Matches | Differs +n · [Use this value]", the line under a field whose
 * number is also counted somewhere else (derived-vs-entered, decision Q3).
 *
 * Meant as a full-row child (`col-span-12`) of the section's 12-column grid, placed right after the
 * field's row: a small line under the field.
 */
export function CondoDerivedHint({ derived, entered, onUse }: CondoDerivedHintProps) {
  const { t } = useTranslation('blockProject');
  const diff = derived - (entered ?? 0);
  const matches = entered != null && diff === 0;

  return (
    <div className="col-span-12 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--palette-ink-2)">
      <span>{t('condoShell.derived.fromUnits')}</span>
      <b className="font-semibold tabular-nums text-(--palette-ink)">{formatNumber(derived)}</b>
      {entered != null &&
        (matches ? (
          <Badge tone="green" dot={false}>
            {t('condoShell.derived.match')}
          </Badge>
        ) : (
          <Badge tone="yellow" dot={false}>
            {t('condoShell.derived.differs', {
              diff: `${diff > 0 ? '+' : ''}${formatNumber(diff)}`,
            })}
          </Badge>
        ))}
      {onUse && !matches && (
        <button
          type="button"
          onClick={onUse}
          className="font-medium text-primary-700 underline hover:text-primary-800 dark:text-(--palette-accent-ink) dark:hover:text-(--palette-accent)"
        >
          {t('condoShell.derived.use')}
        </button>
      )}
    </div>
  );
}
