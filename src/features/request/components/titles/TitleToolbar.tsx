import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import type { TitleChip, TitleFilter } from '../../utils/titleList';

export interface ChipOption {
  chip: TitleChip;
  count: number;
}

interface TitleToolbarProps {
  filter: TitleFilter;
  onChange: (filter: TitleFilter) => void;
  chips: readonly ChipOption[];
  shown: number;
  total: number;
  /** Drag is off because the rows on screen are a filtered view; say how to get it back. */
  dragHint: boolean;
}

/** Literal keys: the strictly-typed `t()` rejects a key built from the chip name. */
const CHIP_KEYS = {
  all: 'titleSection.filter.all',
  incomplete: 'titleSection.filter.incomplete',
  land: 'titleSection.filter.land',
  landBuilding: 'titleSection.filter.landBuilding',
  building: 'titleSection.filter.building',
  condo: 'titleSection.filter.condo',
  vehicle: 'titleSection.filter.vehicle',
  machine: 'titleSection.filter.machine',
  vessel: 'titleSection.filter.vessel',
} as const;

/**
 * Search and filter for a long list. Each part works on a read-only request too: finding a title
 * is not editing one, and the shared input would otherwise disable itself with the form.
 */
export function TitleToolbar({
  filter,
  onChange,
  chips,
  shown,
  total,
  dragHint,
}: TitleToolbarProps) {
  const { t } = useTranslation('request');
  const active = filter.query.trim() !== '' || filter.chip !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-3">
      <FormReadOnlyContext.Provider value={false}>
        <div className="w-full max-w-72">
          <Input
            type="search"
            value={filter.query}
            onChange={event => onChange({ ...filter, query: event.target.value })}
            placeholder={t('titleSection.filter.search')}
            aria-label={t('titleSection.filter.search')}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>
      </FormReadOnlyContext.Provider>

      <div
        role="group"
        aria-label={t('titleSection.filter.group')}
        className="flex flex-wrap gap-1.5"
      >
        {chips.map(({ chip, count }) => (
          <button
            key={chip}
            type="button"
            aria-pressed={filter.chip === chip}
            onClick={() => onChange({ ...filter, chip })}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
              filter.chip === chip
                ? 'border-primary bg-primary font-medium text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {t(CHIP_KEYS[chip])}
            <span
              className={clsx(
                'text-xs tabular-nums',
                filter.chip === chip ? 'text-white/80' : 'text-gray-400',
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div
        className="ml-auto flex flex-wrap items-center gap-x-3 text-xs text-gray-500"
        role="status"
      >
        {dragHint && (
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <Icon style="solid" name="grip-vertical" className="size-3" />
            {t('titleSection.dnd.blocked')}
          </span>
        )}
        <span className="tabular-nums">{t('titleSection.filter.showing', { shown, total })}</span>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ query: '', chip: 'all' })}
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            {t('titleSection.filter.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
