import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollateralTypeName } from '../components/titles/titleHooks';
import { titleNumberOf, type CarryForwardTitle } from '../utils/carryForward';
import {
  isMovableTitle,
  splitByGroup,
  summariseTitleNumber,
  titleFamily,
} from '../utils/titleList';

const condoNumber = (value: string) => {
  const { first, rest } = summariseTitleNumber(value);
  return rest > 0 ? `${first} +${rest}` : first;
};

/**
 * How a title is named wherever the maker picks a section (document list, assignment dialog, move
 * and restore choosers): "โฉนด 12345 · ที่ดิน (#2)", the number, the collateral type and the
 * title's place in its own table, so two titles that share a number still read apart and the
 * "#n" is the one the title table shows. A licence plate or a registration stands on its own; with
 * no number yet it is "รายการที่ 2 · ที่ดิน". The type is named the way the title list names it
 * (`useCollateralTypeName`: the code until the parameter table has loaded).
 */
export const useTitleLabel = () => {
  const { t } = useTranslation('request');
  const collateralTypeName = useCollateralTypeName();
  // Every title's label in one pass: the ranks come from a single split of the list, so a section
  // build is O(n) however many titles there are, and nothing is cached across renders. The function
  // itself only changes with the language or the parameter table, so callers can memoise on it.
  return useCallback(
    (titles: readonly CarryForwardTitle[]): string[] => {
      const ranks: number[] = [];
      const { estate, movable } = splitByGroup(titles);
      for (const group of [estate, movable]) group.forEach((at, i) => (ranks[at] = i + 1));
      return titles.map((title, index) => {
        const rank = ranks[index];
        const raw = (title ? titleNumberOf(title) : null)?.trim();
        // A condo's number field can hold hundreds of land-deed numbers: name it by the first and
        // how many more there are, never by the whole list.
        const number =
          raw && titleFamily(title?.collateralType) === 'condo' ? condoNumber(raw) : raw;
        const typeName = title?.collateralType ? collateralTypeName(title.collateralType) : '';
        const withType = (base: string) => (typeName ? `${base} · ${typeName}` : base);
        if (!number) return withType(t('docCard.titleFallback', { n: rank }));
        const base = isMovableTitle(title ?? {}) ? number : t('docCard.titleLabel', { number });
        return `${withType(base)} (#${rank})`;
      });
    },
    [t, collateralTypeName],
  );
};
