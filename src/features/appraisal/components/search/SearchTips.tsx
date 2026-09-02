import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';

interface SearchTipsProps {
  /** Minimum characters the API accepts, quoted in the last tip. */
  minLength: number;
  /**
   * Also list what the all-fields search covers.
   *
   * Off by default, and off in the empty state: the coverage list answers "what CAN I search for",
   * which is a question about the box, not about why this result set came back empty. It belongs
   * where someone goes looking for it — the toolbar's "can't find it?" button.
   */
  showCoverage?: boolean;
  className?: string;
}

/** Field groups the all-fields search covers. Icons echo the scope picker's own vocabulary. */
const COVERAGE = [
  { key: 'numbers', icon: 'hashtag' },
  { key: 'people', icon: 'user' },
  { key: 'properties', icon: 'building' },
  { key: 'places', icon: 'location-dot' },
] as const;

/**
 * The rules of the search box plus what it actually looks at, written once.
 *
 * Rendered in two places — the "can't find it?" popover above the table and the empty state inside
 * it — because those are the two moments someone asks the question. Keeping it one component means
 * the two can never drift into saying different things.
 *
 * The coverage list exists because "all fields" is a promise nobody can verify: it searches fifteen
 * columns across five tables, and someone who does not know a title deed number is in there will
 * never think to type one. The groups mirror AppraisalSearchPredicate's arms — keep them in step.
 */
function SearchTips({ minLength, showCoverage = false, className = '' }: SearchTipsProps) {
  const { t } = useTranslation('appraisal');

  const tips = [
    t('list.searchTips.prefix'),
    t('list.searchTips.wildcard'),
    t('list.searchTips.scoped'),
    t('list.searchTips.minLength', { count: minLength }),
  ];

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <ul className="flex flex-col gap-2 text-xs text-gray-600">
        {tips.map(tip => (
          <li key={tip} className="flex gap-2 text-left">
            <Icon
              style="solid"
              name="circle-check"
              className="mt-0.5 size-3 shrink-0 text-primary-300"
            />
            <span>{tip}</span>
          </li>
        ))}
      </ul>

      {showCoverage && (
        <div className="border-t border-gray-100 pt-2.5">
          <p className="mb-1.5 text-left text-[11px] font-medium text-gray-500">
            {t('list.searchTips.coverageTitle')}
          </p>
          <ul className="flex flex-col gap-1.5 text-[11px] text-gray-500">
            {COVERAGE.map(({ key, icon }) => (
              <li key={key} className="flex gap-2 text-left">
                <Icon style="solid" name={icon} className="mt-0.5 size-3 shrink-0 text-gray-300" />
                <span>{t(`list.searchTips.coverage.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchTips;
