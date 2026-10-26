import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  useProvinceName,
  usePropertyTypeLabels,
  useSearchFieldLabel,
} from '@/shared/hooks/useCodeLabels';
import Icon from '@shared/components/Icon';
import type { SearchAppraisal } from '@shared/types/search';

const statusStyles: Record<string, string> = {
  pending: 'bg-(--palette-warn-wash) text-yellow-700 dark:text-yellow-300',
  approved: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300',
  rejected: 'bg-(--palette-req-wash) text-(--palette-req)',
  active: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
  completed: 'bg-(--palette-surface-3) text-(--palette-gray-600)',
};

interface Props {
  item: SearchAppraisal;
  /** Flat keyboard index. Also the DOM id aria-activedescendant points at. */
  index: number;
  isHighlighted: boolean;
  /** Fields already shown in the group header — no need to repeat them on the row. */
  suppressField?: string;
  onClick: () => void;
}

export default function SearchResultItem({
  item,
  index,
  isHighlighted,
  suppressField,
  onClick,
}: Props) {
  const { t } = useTranslation('nav');
  const provinceName = useProvinceName();
  const propertyTypeLabels = usePropertyTypeLabels();
  const fieldLabel = useSearchFieldLabel();

  // No appraisal number yet means the request has not been turned into an appraisal.
  const isRequestOnly = !item.appraisalNumber;
  const title = item.appraisalNumber ?? item.requestNumber ?? '—';
  const statusStyle = item.status
    ? (statusStyles[item.status.toLowerCase()] ??
      'bg-(--palette-surface-3) text-(--palette-gray-600)')
    : null;

  const badges = item.matchedOn.filter(m => m.field !== suppressField).slice(0, 3);

  // The API returns storage codes here — `propertyTypes` is "B, L" and `province` is a geocode
  // like "71". Resolve both, so the row reads "Wichian Thirakorn · สิ่งปลูกสร้าง, ที่ดินเปล่า ·
  // กาญจนบุรี" instead of "Wichian Thirakorn · B, L · 71".
  const subtitle = [
    item.customerName,
    propertyTypeLabels(item.propertyTypes),
    provinceName(item.province),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      id={`search-result-${index}`}
      role="option"
      aria-selected={isHighlighted}
      onClick={onClick}
      className={clsx(
        'flex items-start gap-3 w-full px-3 py-2.5 text-left rounded-lg transition-colors',
        isHighlighted ? 'bg-primary-50' : 'hover:bg-gray-50 dark:hover:bg-base-300',
      )}
    >
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
          isRequestOnly ? 'bg-(--palette-surface-3)' : 'bg-blue-50 dark:bg-blue-500/10',
        )}
      >
        <Icon
          name={isRequestOnly ? 'pen-to-square' : 'file-lines'}
          style="solid"
          className={clsx('size-4', isRequestOnly ? 'text-(--palette-gray-500)' : 'text-blue-500')}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-base-content tabular-nums">
            {title}
          </span>
          {item.status && statusStyle && (
            <span
              className={clsx('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', statusStyle)}
            >
              {item.status}
            </span>
          )}
          {isRequestOnly && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-(--palette-surface-3) text-(--palette-gray-500) shrink-0">
              {t('search.noAppraisalNumber')}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        )}

        {badges.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {badges.map(m => (
              <span
                key={`${m.field}-${m.value}`}
                className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-base-300 bg-gray-50 dark:bg-base-300 text-xs text-gray-600 dark:text-gray-300"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-(--palette-gray-400)">
                  {fieldLabel(m.field)}
                </span>
                <span className="truncate max-w-[14rem]">{m.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
