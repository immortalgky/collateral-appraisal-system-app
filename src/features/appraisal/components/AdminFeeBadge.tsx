import { useTranslation } from 'react-i18next';

interface AdminFeeBadgeProps {
  /** The chip's text: who set the amount ("set by admin" / "edited by admin"). */
  label: string;
  /** What the system would have charged, already formatted; omit when there is no such figure. */
  systemAmount?: string;
}

/** The chip marking an amount an admin set, with the system's own figure beside it when known. */
export default function AdminFeeBadge({ label, systemAmount }: AdminFeeBadgeProps) {
  const { t } = useTranslation('appraisal');
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-(--palette-gray-500)">
      <span className="inline-flex w-max items-center rounded-full bg-primary-100 dark:bg-primary-500/20 px-1.5 py-px font-semibold whitespace-nowrap text-primary-800 dark:text-primary-300">
        {label}
      </span>
      {systemAmount !== undefined && t('fee.systemAmount', { amount: systemAmount })}
    </span>
  );
}
