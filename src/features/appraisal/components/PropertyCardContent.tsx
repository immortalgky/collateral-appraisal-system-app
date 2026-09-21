import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import Badge from '@shared/components/Badge';
import { PropertyTypeChip } from './PropertyTypeChip';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { isWithinThailand } from '@/shared/constants/mapConfig';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';

/** Property type codes that mean machinery. Exported so the grouped card asks the same
 * question rather than keeping a second copy that can drift. */
export const MACHINE_TYPES = new Set(['MAC', 'Machine', 'Machinery']);

/**
 * Property type codes that mean a building standing on someone's land.
 *
 * A building carries no address of its own — the tambon, amphoe and province belong to the land
 * underneath it — so its "location" is structurally empty and always will be. Where the other
 * types answer "where is it", a building answers "what is it".
 */
export const BUILDING_TYPES = new Set(['B', 'LSB']);

/**
 * The where-or-what value for a row: a building's type, everything else's location.
 *
 * Two slots became one because they never both apply: whichever is rendered, the other would be
 * blank. `PropertyDenseTable` and `PropertyStackSection` relabel the column to match when the
 * whole group is buildings; in a mixed group the column stays "location" and a building shows a
 * dash rather than "not recorded yet", which would blame the appraiser for a field that does not
 * exist on this form.
 */
export const PlaceValue = ({ property }: { property: PropertyItem }) => {
  const { t } = useTranslation('appraisal');

  if (BUILDING_TYPES.has(property.type)) {
    // Zero floors is what an untouched form saves, not a building with no storeys.
    const floors = property.numberOfFloors ? property.numberOfFloors : null;
    // "Other" is the master's shrug; the appraiser's own words say what the thing actually is.
    const otherText =
      property.buildingType === OTHER_BUILDING_TYPE ? property.buildingTypeOther : undefined;
    const hasType = !!property.buildingType;
    if (!hasType && floors == null) return <span className="text-gray-400">—</span>;
    return (
      <>
        {otherText ? (
          otherText
        ) : hasType ? (
          <ParameterDisplay
            group="BuildingType"
            code={property.buildingType!}
            fallback={property.buildingType!}
          />
        ) : null}
        {hasType && floors != null && ' · '}
        {floors != null && (
          <span className="tabular-nums">
            {t('properties.floorCount', { n: formatAreaNumber(floors) })}
          </span>
        )}
      </>
    );
  }

  return property.location && property.location !== '-' ? (
    <>{property.location}</>
  ) : (
    <span className="italic text-gray-400">{t('properties.notSet')}</span>
  );
};

/**
 * An exception worth noticing, written as plain words.
 *
 * It used to be a filled pill in amber or red. On a pile of eight machines that put eight
 * coloured badges down one column, and a screen where everything shouts says nothing — the flags
 * were competing with the type chips and the price button for the same attention. Grey text with
 * a small icon still reads as "something is off here" without turning the list into a warning
 * board; the icon carries which kind.
 */
export const PropertyFlag = ({ icon, children }: { icon: string; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap text-[0.66rem] text-gray-500">
    <Icon name={icon} className="text-[0.55rem] text-gray-400" style="solid" />
    {children}
  </span>
);

/** BuildingType parameter code for "other", whose meaning lives in `buildingTypeOther`. */
const OTHER_BUILDING_TYPE = '99';

/** ConditionUse codes: the everyday case, and the one that needs the loudest chip. */
const IN_USE_CONDITION = '01';
const NOT_FOUND_CONDITION = '03';

/**
 * `compact` and `md` are the Properties tab's row; `stack` is that row squeezed into aligned
 * columns for a pile of same-type properties. `xs` and `sm` are older, denser layouts used
 * elsewhere — Pricing Analysis renders `sm` — and are deliberately left alone.
 */
type CardSize = 'xs' | 'compact' | 'sm' | 'md' | 'stack';

interface PropertyCardContentProps {
  property: PropertyItem;
  onClick?: () => void;
  /** Show the right-arrow chevron indicator */
  showArrow?: boolean;
  /** Card size variant — 'sm' for compact lists, 'md' for standard cards */
  size?: CardSize;
  /**
   * When provided, the corner pin opens the in-app map instead of external
   * Google Maps. Disabled (greyed) when the property has no coordinates.
   */
  onLocationClick?: () => void;
}

/**
 * Column tracks for the stacked layout. Every row in a stack renders its own grid with these
 * exact tracks, which is what makes the values line up down the pile — and lets the section
 * header reuse the same string so its labels sit over the right columns.
 */
/**
 * Brand and model, the only thing that tells two machines apart on screen.
 *
 * A pile of machinery repeats one name down the whole column — eight rows of
 * "เครื่องผลิตเม็ดพลาสติก" — so the identifying detail has to come from somewhere else. It
 * replaced the width x length x height column, which on real data reads "1.00 x 1.00 x 1.00"
 * because nobody measures a machine to fill in a form.
 */
export const brandModel = (property: PropertyItem): string =>
  [property.brand, property.model].filter(Boolean).join(' ');

export const STACK_GRID_MACHINE =
  'grid grid-cols-[2.75rem_minmax(6rem,1.4fr)_minmax(4.5rem,0.9fr)_minmax(5rem,0.9fr)_minmax(5rem,0.9fr)_1rem] gap-2 items-center';
export const STACK_GRID_PROPERTY =
  'grid grid-cols-[2.75rem_minmax(6rem,1.1fr)_minmax(4.5rem,0.7fr)_minmax(7rem,1.5fr)_minmax(6rem,1fr)_1rem] gap-2 items-center';

/**
 * True when the property has real coordinates inside Thailand. Must match the
 * filter in PropertiesMapModal so the pin is only enabled for properties that
 * will actually appear on the map.
 */
function hasCoordinates(property: PropertyItem): boolean {
  return (
    property.latitude != null &&
    property.longitude != null &&
    isWithinThailand(property.latitude, property.longitude)
  );
}

/** Coordinates worth printing — (0, 0) means "never filled in", not "off the coast of Africa". */
function coordinateText(property: PropertyItem): string | null {
  if (property.latitude == null || property.longitude == null) return null;
  if (property.latitude === 0 && property.longitude === 0) return null;
  return `${property.latitude.toFixed(6)}, ${property.longitude.toFixed(6)}`;
}

const sizeConfig = {
  xs: {
    image: 'w-10 h-10',
    title: 'text-[11px] line-clamp-1',
    text: 'text-[10px]',
    iconSize: 'text-[8px]',
    padding: 'px-2 py-1',
    gap: 'gap-1',
  },
  sm: {
    image: 'w-20 min-h-[80px]',
    title: 'text-xs line-clamp-2',
    text: 'text-[10px]',
    iconSize: 'text-[8px]',
    padding: 'p-2',
    gap: 'gap-0.5 mt-1',
  },
} as const;

/** One line of facts, separated by dots. Absent facts are dropped, not spelled out. */
function MetaLine({ parts, title }: { parts: ReactNode[]; title?: string }) {
  const shown = parts.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <p className="text-[11px] text-gray-500 truncate" title={title}>
      {shown.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="mx-1.5 text-gray-400">·</span>}
          {part}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Only the exceptions get a chip. "In use" is the normal case and would just repeat itself down
 * a list of machines; not-found, out-of-use and not-appraised are what the appraiser needs to
 * spot while grouping. Everything else lives in the meta line.
 */
function useExceptionChips(property: PropertyItem) {
  const { t } = useTranslation('appraisal');
  const chips: ReactNode[] = [];

  if (property.conditionUse && property.conditionUse !== IN_USE_CONDITION) {
    const notFound = property.conditionUse === NOT_FOUND_CONDITION;
    chips.push(
      <PropertyFlag key="condition" icon={notFound ? 'magnifying-glass' : 'circle-pause'}>
        <ParameterDisplay
          group="ConditionUse"
          code={property.conditionUse}
          fallback={property.conditionUse}
        />
      </PropertyFlag>,
    );
  }
  if (property.isPriceCertified === false) {
    chips.push(
      <PropertyFlag key="not-appraised" icon="triangle-exclamation">
        {t('properties.machineryChips.notPriceCertified')}
      </PropertyFlag>,
    );
  }
  return chips;
}

/** The right-hand numeric column: the one figure worth comparing between rows at a glance. */
function AreaCell({ property, className }: { property: PropertyItem; className?: string }) {
  const { t } = useTranslation('appraisal');
  if (property.areaValue == null) {
    return <div className={`text-right text-xs text-gray-400 ${className ?? ''}`}>—</div>;
  }
  const isWa = property.areaUnit === 'wa';
  return (
    <div className={`text-right leading-tight ${className ?? ''}`}>
      <div className="text-[13px] font-semibold text-gray-900 tabular-nums">
        {isWa ? toRaiNganWa(property.areaValue) : formatAreaNumber(property.areaValue)}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">
        {t(isWa ? 'properties.units.raiNganWa' : 'properties.units.sqm')}
      </div>
    </div>
  );
}

/** Thumbnail with its two overlays: the map pin, and how many photos are behind it. */
function Thumbnail({
  property,
  className,
  onLocationClick,
  showOverlays = true,
}: {
  property: PropertyItem;
  className: string;
  onLocationClick?: () => void;
  showOverlays?: boolean;
}) {
  const { t } = useTranslation('appraisal');
  const located = hasCoordinates(property);

  return (
    <div className={`relative bg-gray-100 flex-shrink-0 overflow-hidden ${className}`}>
      {property.image ? (
        <>
          <img
            src={property.image}
            alt={property.address}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon name="image" className="text-gray-400 text-lg" />
        </div>
      )}

      {showOverlays &&
        (onLocationClick ? (
          located ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onLocationClick();
              }}
              className="absolute top-1 left-1 p-0.5 bg-white rounded-full shadow-sm hover:shadow-md hover:scale-110 transition-all"
              title={t('properties.map.pinView')}
            >
              <Icon name="location-dot" className="text-green-500 text-[8px]" style="solid" />
            </button>
          ) : (
            <span
              className="absolute top-1 left-1 p-0.5 bg-white/80 rounded-full shadow-sm cursor-not-allowed"
              title={t('properties.map.pinNoLocation')}
            >
              <Icon name="location-dot" className="text-gray-400 text-[8px]" style="solid" />
            </span>
          )
        ) : (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute top-1 left-1 p-0.5 bg-white rounded-full shadow-sm hover:shadow-md hover:scale-110 transition-all"
            title={t('properties.openInGoogleMaps')}
          >
            <Icon name="location-dot" className="text-green-500 text-[8px]" style="solid" />
          </a>
        ))}

      {showOverlays && property.photos && property.photos.length > 0 && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/50 text-white rounded-full text-[10px] px-1">
          <Icon name="camera" className="text-[9px]" style="solid" />
          <span>{property.photos.length}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Presentational component for rendering a property card's visual content.
 * Used by PropertyCard (with drag-and-drop) and pricing analysis (without).
 */
export function PropertyCardContent({
  property,
  onClick,
  showArrow = true,
  size = 'sm',
  onLocationClick,
}: PropertyCardContentProps) {
  const { t } = useTranslation('appraisal');
  const isMachine = MACHINE_TYPES.has(property.type);
  const exceptions = useExceptionChips(property);

  // ── The Properties tab row ────────────────────────────────────────────────────────────────
  if (size === 'compact' || size === 'md') {
    const coords = coordinateText(property);
    const metaParts: ReactNode[] = isMachine
      ? [
          brandModel(property) || null,
          property.registrationNumber ? (
            <span key="reg" className="tabular-nums">
              {property.registrationNumber}
            </span>
          ) : (
            <span key="unreg" className="italic text-gray-400">
              {t('properties.machineryChips.unregistered')}
            </span>
          ),
        ]
      : [
          <PlaceValue key="place" property={property} />,
          coords ? (
            <span key="coords" className="tabular-nums">
              {coords}
            </span>
          ) : null,
        ];

    return (
      <div
        onClick={onClick}
        className={`flex flex-1 items-center gap-3 min-w-0 py-2 pr-3 ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <Thumbnail
          property={property}
          onLocationClick={onLocationClick}
          className={
            size === 'md' ? 'w-[7.5rem] h-[4.6rem] rounded-lg' : 'w-[6.6rem] h-[4.1rem] rounded-lg'
          }
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className="text-[13px] font-semibold text-gray-900 truncate"
              title={property.address}
            >
              {property.address}
            </h3>
            <PropertyTypeChip code={property.type} className="shrink-0" />
          </div>

          <MetaLine parts={metaParts} title={property.location} />

          {exceptions.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1">{exceptions}</div>
          )}
        </div>

        <AreaCell property={property} className="shrink-0" />

        {showArrow && (
          <Icon name="chevron-right" className="text-gray-400 text-xs shrink-0" style="solid" />
        )}
      </div>
    );
  }

  // ── One row inside a pile of same-type properties ─────────────────────────────────────────
  if (size === 'stack') {
    const gridClass = isMachine ? STACK_GRID_MACHINE : STACK_GRID_PROPERTY;
    const coords = coordinateText(property);

    return (
      <div
        onClick={onClick}
        className={`flex-1 min-w-0 py-1.5 pr-3 ${gridClass} ${onClick ? 'cursor-pointer' : ''}`}
      >
        <Thumbnail property={property} className="w-11 h-8 rounded" showOverlays={false} />

        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate" title={property.address}>
            {property.address}
          </div>
          {exceptions.length > 0 && <div className="flex gap-1 mt-0.5">{exceptions}</div>}
        </div>

        {isMachine ? (
          <>
            <div className="text-[11px] text-gray-500 truncate tabular-nums">
              {property.registrationNumber || <span className="text-gray-400">—</span>}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {property.registrationStatus
                ? t('properties.machineryChips.registered')
                : t('properties.machineryChips.unregistered')}
            </div>
            <div className="text-[11px] text-gray-500 truncate" title={brandModel(property)}>
              {brandModel(property) || <span className="text-gray-400">—</span>}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] text-gray-500 truncate tabular-nums text-right">
              {property.areaValue == null ? (
                <span className="text-gray-400">—</span>
              ) : property.areaUnit === 'wa' ? (
                toRaiNganWa(property.areaValue)
              ) : (
                formatAreaNumber(property.areaValue)
              )}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              <PlaceValue property={property} />
            </div>
            <div className="text-[11px] text-gray-500 truncate tabular-nums">
              {coords ?? (
                <span className="italic text-gray-400">{t('properties.coordsNotSet')}</span>
              )}
            </div>
          </>
        )}

        <Icon name="chevron-right" className="text-gray-400 text-[10px]" style="solid" />
      </div>
    );
  }

  // ── Legacy dense layouts, used outside the Properties tab (Pricing Analysis renders 'sm') ──
  const cfg = sizeConfig[size];
  const located = hasCoordinates(property);

  return (
    <div
      onClick={onClick}
      className={`flex flex-1 ${onClick ? 'cursor-pointer hover:bg-gray-50/50' : ''} transition-colors`}
    >
      <div
        className={`relative ${cfg.image} bg-gray-100 flex-shrink-0 ${size === 'xs' ? 'rounded' : ''}`}
      >
        {property.image ? (
          <>
            <img
              src={property.image}
              alt={property.address}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover ${size === 'xs' ? 'rounded' : ''}`}
            />
            {size !== 'xs' && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon
              name="image"
              className={`text-gray-400 ${size === 'xs' ? 'text-sm' : 'text-2xl'}`}
            />
          </div>
        )}
        {size !== 'xs' &&
          (onLocationClick ? (
            located ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onLocationClick();
                }}
                className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm hover:shadow-md hover:scale-110 transition-all"
                title={t('properties.map.pinView')}
              >
                <Icon name="location-dot" className="text-green-500 text-[10px]" style="solid" />
              </button>
            ) : (
              <span
                className="absolute top-2 left-2 p-1 bg-white/80 rounded-full shadow-sm cursor-not-allowed"
                title={t('properties.map.pinNoLocation')}
              >
                <Icon name="location-dot" className="text-gray-400 text-[10px]" style="solid" />
              </span>
            )
          ) : (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm hover:shadow-md hover:scale-110 transition-all"
              title={t('properties.openInGoogleMaps')}
            >
              <Icon name="location-dot" className="text-green-500 text-[10px]" style="solid" />
            </a>
          ))}
        {size !== 'xs' && property.photos && property.photos.length > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white rounded-full text-[10px] px-1.5 py-0.5">
            <Icon name="camera" className="text-[9px]" style="solid" />
            <span>{property.photos.length}</span>
          </div>
        )}
      </div>

      <div
        className={`flex-1 ${cfg.padding} flex ${size === 'xs' ? 'flex-row items-center gap-2' : 'flex-col justify-between'} min-w-0`}
      >
        {size === 'xs' ? (
          <>
            <h3
              className={`font-medium text-gray-900 ${cfg.title} min-w-0 flex-1`}
              title={property.address}
            >
              {property.address}
            </h3>
            <Badge type="property" value={property.type} size="xs" dot={false} className="shrink-0">
              <ParameterDisplay
                group="PropertyType"
                code={property.type}
                fallback={property.type}
              />
            </Badge>
            <div className={`flex items-center gap-1 ${cfg.text} text-gray-500 shrink-0`}>
              <Icon
                name="ruler-combined"
                className={`text-gray-400 ${cfg.iconSize}`}
                style="solid"
              />
              <span>{property.area}</span>
            </div>
          </>
        ) : (
          <div>
            <h3 className={`font-medium text-gray-900 ${cfg.title}`} title={property.address}>
              {property.address}
            </h3>

            <Badge type="property" value={property.type} size="xs" dot={false} className="mt-0.5">
              <ParameterDisplay
                group="PropertyType"
                code={property.type}
                fallback={property.type}
              />
            </Badge>

            {isMachine ? (
              <>
                {(property.brand || property.model) && (
                  <div className={`flex items-center gap-1 ${cfg.text} text-gray-500 mt-1`}>
                    <Icon name="tag" className={`text-gray-400 ${cfg.iconSize}`} style="solid" />
                    <span>{[property.brand, property.model].filter(Boolean).join(' ')}</span>
                  </div>
                )}
                {property.registrationNumber && (
                  <div className={`flex items-center gap-1 ${cfg.text} text-gray-400 mt-0.5`}>
                    <Icon name="hashtag" className={cfg.iconSize} style="solid" />
                    <span>{property.registrationNumber}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={`flex items-center ${cfg.gap} ${cfg.text} text-gray-500 mt-1`}>
                  <div className="flex items-center gap-1">
                    <Icon
                      name="ruler-combined"
                      className={`text-gray-400 ${cfg.iconSize}`}
                      style="solid"
                    />
                    <span>{property.area}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-1 ${cfg.text} text-gray-400 mt-0.5`}>
                  <Icon name="location-dot" className={cfg.iconSize} style="solid" />
                  {property.location && property.location !== '-' ? (
                    <span className="truncate" title={property.location}>
                      {property.location}
                    </span>
                  ) : (
                    <span className="italic">{t('properties.notSet')}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showArrow && (
        <div className="flex items-center pr-3">
          <Icon name="chevron-right" className="text-gray-400 text-sm" style="solid" />
        </div>
      )}
    </div>
  );
}
