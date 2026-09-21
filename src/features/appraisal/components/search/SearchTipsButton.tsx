import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import SearchTips from './SearchTips';

interface SearchTipsButtonProps {
  /** Minimum characters the API accepts, quoted in the tips. */
  minLength: number;
  /** Text the screen reader gets for the search box — the same sentence this used to print. */
  hint: string;
  /** Id the search input's aria-describedby points at. */
  hintId: string;
}

/**
 * The search syntax, on demand.
 *
 * It used to be a permanent line of grey text under the search box, which cost the table a row on
 * every visit to teach a rule most users need once. Behind a button the rule is still one click
 * away — and named after the moment people actually look for it ("can't find what you're looking
 * for?") rather than after the syntax itself.
 *
 * The sentence still ships in the DOM as sr-only text, so `aria-describedby` on the input keeps
 * describing the box the way it did before.
 */
function SearchTipsButton({ minLength, hint, hintId }: SearchTipsButtonProps) {
  const { t } = useTranslation('appraisal');

  return (
    <>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
      <Popover className="relative shrink-0">
        <PopoverButton className="inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-500 outline-none transition-colors hover:border-gray-300 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-primary">
          {/* Its own hue, like the other controls on this row (export emerald, saved amber,
              columns indigo) — blue reads as "information" and is the one still free. */}
          <Icon style="solid" name="circle-question" className="size-3.5 text-blue-500" />
          {t('list.searchTips.trigger')}
        </PopoverButton>
        <PopoverPanel
          anchor="bottom end"
          className="z-50 mt-1.5 w-96 max-w-[90vw] rounded-xl border border-gray-200 bg-white p-3.5 shadow-lg"
        >
          <p className="text-sm font-medium text-gray-900">{t('list.searchTips.title')}</p>
          <SearchTips minLength={minLength} showCoverage className="mt-2" />
        </PopoverPanel>
      </Popover>
    </>
  );
}

export default SearchTipsButton;
