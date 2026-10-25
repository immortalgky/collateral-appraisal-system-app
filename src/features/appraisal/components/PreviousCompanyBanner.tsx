import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { PreviousCompany } from '../types/administration';

interface PreviousCompanyBannerProps {
  previousCompany: PreviousCompany;
  /** The form currently has this company chosen as the external assignee. */
  isSelected: boolean;
  /** The system chose it when it seeded a fresh row (as opposed to the admin picking it). */
  isPreselected?: boolean;
  /**
   * The company is in the list the manual picker offers for this request's customer segment:
   * true / false once the list is known, undefined while it is not (no claim is made then).
   */
  isEligible?: boolean;
  /** Its Thai name when known (the defaults response carries only the English one). */
  companyNameLocal?: string | null;
  /**
   * Nothing can be changed any more (an assignment already made, or a view-only page): only the
   * facts are shown, without the hints about what to do or what will be asked.
   */
  readOnly?: boolean;
}

/**
 * Tells the admin which company did the prior inspection and what the page did about it.
 * One slim line: teal normally, amber when the MOU is not active or the company is not offered.
 */
export default function PreviousCompanyBanner({
  previousCompany,
  isSelected,
  isPreselected = false,
  isEligible,
  companyNameLocal,
  readOnly = false,
}: PreviousCompanyBannerProps) {
  const { t, i18n } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();
  const detail = [
    t('administration.previousCompany.book', { appraisalNumber: previousCompany.appraisalNumber }),
    previousCompany.inspectionNumber != null
      ? t('administration.previousCompany.inspection', { n: previousCompany.inspectionNumber })
      : null,
    previousCompany.completedAt
      ? formatLocaleDate(previousCompany.completedAt, i18n.language)
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // Only claims what is true: "chosen for you" if the system did it, "you will be asked" while the
  // company is the current selection, and nothing about availability while that is not known.
  const hint = readOnly
    ? null
    : !previousCompany.mouActive
      ? t('administration.previousCompany.hintMouInactive')
      : isEligible === false
        ? t('administration.previousCompany.hintNotEligible')
        : isEligible && isSelected
          ? isPreselected
            ? t('administration.previousCompany.hintSelected')
            : t('administration.previousCompany.hintAvailable')
          : null;
  const warn = !readOnly && (!previousCompany.mouActive || isEligible === false);

  return (
    <div
      role="status"
      className={clsx(
        'flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-3 py-1.5 text-xs',
        warn
          ? 'border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) text-amber-800 dark:text-amber-300'
          : 'border-primary-200 dark:border-primary-500/30 bg-(--palette-accent-wash) text-(--palette-accent-ink)',
      )}
    >
      <span className="font-semibold">
        {t('administration.previousCompany.title', {
          company: localizeCompanyName(previousCompany.companyName, companyNameLocal),
        })}
      </span>
      <span className="text-(--palette-gray-500)">{detail}</span>
      {hint && <span className="basis-full">{hint}</span>}
    </div>
  );
}
