import { useTranslation } from 'react-i18next';
import { MenuItem } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import {
  getPropertyIcon,
  getTypeDotColor,
  PROPERTY_BASE_ORDER,
  PROPERTY_TYPES,
  typeToBase,
  type PropertyBase,
} from '../utils/propertyTypeConfig';

type PropertyTypeDef = (typeof PROPERTY_TYPES)[number];

/** Short label for the lease column: the twin's name plus "(lease)", not the full "Lease Agreement…" name. */
const BASE_LABEL_CODE: Record<PropertyBase, string> = {
  land: 'L',
  building: 'B',
  landBuilding: 'LB',
  condo: 'U',
  other: '',
};

/** The type sitting in one cell of the four-by-two grid: a base kind, held outright or leased. */
const gridDef = (base: PropertyBase, tenure: 'own' | 'lease'): PropertyTypeDef | undefined =>
  PROPERTY_TYPES.find(
    p =>
      typeToBase[p.code] === base &&
      (tenure === 'own' ? !p.code.startsWith('LS') : p.code.startsWith('LS')),
  );

/**
 * Everything the grid does not show, rather than a hand-written list of the ones known today.
 *
 * The row used to be `['MAC', 'VEH', 'VES']`. A type added to PROPERTY_TYPES later would have
 * appeared nowhere in this picker — no error, just impossible to add from the Properties tab.
 * Deriving it from the grid's complement means every type lands somewhere, whether or not anyone
 * remembered to give it a tenure.
 */
const GRID_CODES = new Set(
  PROPERTY_BASE_ORDER.flatMap(base => [gridDef(base, 'own'), gridDef(base, 'lease')]).map(
    def => def?.code,
  ),
);
const OTHER_TYPES = PROPERTY_TYPES.filter(p => !GRID_CODES.has(p.code));

interface PropertyTypePickerProps {
  /** Called with the chosen type; the caller decides whether to navigate. */
  onPick: (propertyType: PropertyTypeDef) => void;
}

/**
 * The property-type chooser.
 *
 * The old one was a flat list of eleven, sorted by their English names, every row wearing the
 * same teal tile and a chevron that promised a submenu it did not have. Sorting by English split
 * each freehold type from its lease twin and left four rows all starting "Lease Agreement…",
 * which had to be read to the end to tell apart.
 *
 * The eleven are really a four-by-two grid — the same four things, held two ways — plus three
 * others. Laid out that way the whole set fits without scrolling, and the lease column can drop
 * the repeated prefix because its header carries it.
 */
export const PropertyTypePicker = ({ onPick }: PropertyTypePickerProps) => {
  const { t } = useTranslation('appraisal');

  const option = (def: PropertyTypeDef | undefined, opts: { short?: boolean; chip?: boolean }) => {
    if (!def) return null;
    const unavailable = !def.route;
    const labelCode = opts.short ? BASE_LABEL_CODE[typeToBase[def.code] ?? 'other'] : def.code;
    const icon = getPropertyIcon(def.code);

    return (
      <MenuItem key={def.code} disabled={unavailable}>
        {({ focus }) => (
          <button
            type="button"
            disabled={unavailable}
            onClick={() => onPick(def)}
            className={clsx(
              'flex items-center gap-2.5 text-left w-full',
              opts.chip
                ? 'rounded-full border border-gray-200 bg-white px-2.5 py-1 w-auto'
                : 'px-3 py-1.5',
              unavailable
                ? 'opacity-45 cursor-not-allowed'
                : clsx(
                    'cursor-pointer',
                    focus && (opts.chip ? 'border-gray-400 bg-gray-100' : 'bg-gray-50'),
                  ),
            )}
          >
            <span
              className={clsx(
                'flex items-center justify-center rounded-md shrink-0 border',
                opts.chip ? 'size-[1.3rem]' : 'size-[1.6rem]',
                // A dashed tile marks a lease. It only reinforces what the column header and the
                // label already say, so nothing is lost if the dashes are hard to see.
                opts.short ? 'border-dashed border-current/40' : 'border-transparent',
                getTypeDotColor(def.code).replace('bg-', 'text-'),
              )}
              style={{ backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)' }}
            >
              <Icon
                name={icon.name}
                style={icon.style}
                className={opts.chip ? 'text-[0.82rem]' : 'text-[0.95rem]'}
              />
            </span>

            <span className="flex-1 min-w-0 truncate text-xs text-gray-700">
              <ParameterDisplay group="PropertyType" code={labelCode} fallback={def.type} />
              {opts.short && ` ${t('properties.picker.leaseSuffix')}`}
            </span>

            {unavailable && (
              <span className="shrink-0 rounded-full bg-warning/10 px-1.5 text-[10px] font-semibold text-warning-content">
                {t('properties.picker.soon')}
              </span>
            )}
            <span className="shrink-0 rounded bg-gray-100 px-1 text-[10px] font-bold tracking-wide text-gray-400">
              {def.code}
            </span>
          </button>
        )}
      </MenuItem>
    );
  };

  const column = (tenure: 'own' | 'lease') =>
    PROPERTY_BASE_ORDER.map(base => option(gridDef(base, tenure), { short: tenure === 'lease' }));

  return (
    <div className="w-[30rem] max-w-[80vw]">
      <div className="px-3 py-2 border-b border-gray-100">
        <h4 className="text-xs font-bold text-gray-800">{t('properties.picker.title')}</h4>
      </div>

      <div className="grid grid-cols-2">
        <div>
          <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50">
            {t('properties.picker.own')}
          </div>
          <div className="py-1">{column('own')}</div>
        </div>
        <div className="border-l border-gray-100">
          <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50">
            {t('properties.picker.lease')}
          </div>
          <div className="py-1">{column('lease')}</div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/60">
        <div className="px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {t('properties.picker.other')}
        </div>
        <div className="flex flex-wrap gap-1.5 px-3 py-2">
          {OTHER_TYPES.map(def => option(def, { chip: true }))}
        </div>
      </div>
    </div>
  );
};

export default PropertyTypePicker;
