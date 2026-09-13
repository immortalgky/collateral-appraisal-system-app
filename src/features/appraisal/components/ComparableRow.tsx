import type { KeyboardEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { PropertyTypeChip } from './PropertyTypeChip';
import { PropertyFlag } from './PropertyCardContent';
import { ComparableActionsMenu } from './ComparableActionsMenu';
import { DotJoin, PlotLocationText, PriceUnitLabel, UsedInBadge } from './MarketsLabels';
import { useMarketFormatters } from '../hooks/useMarketFormatters';
import { getPropertyIcon } from '../utils/propertyTypeConfig';
import { toRaiNganWa } from '../utils/areaFormat';
import {
  comparablePoint,
  daysSince,
  parsePlotLocation,
  STALE_AFTER_DAYS,
  thumbnailUrl,
  unitPriceOf,
  usedInMethods,
  type Comparable,
} from '../utils/marketComparableFormat';

interface ComparableRowProps {
  comparable: Comparable;
  index: number;
  /** Distance to the nearest property in the appraisal, when both have coordinates. */
  distanceKm: number | null;
  onOpen: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

/**
 * One market comparable, in the same shape as a row on the Properties tab.
 *
 * The price sits at the right edge so the eye can run down the column and compare; everything
 * that says whether the comparable is any good — how far, how old, where it came from — sits in
 * the one line under its name. The old table showed a number, a name, a type and a date, and
 * the price only after opening each comparable in turn.
 */
export const ComparableRow = ({
  comparable: c,
  index,
  distanceKm,
  onOpen,
  onCopy,
  onDelete,
  onContextMenu,
}: ComparableRowProps) => {
  const { t } = useTranslation('appraisal');
  const f = useMarketFormatters();
  const readOnly = usePageReadOnly();

  const type = c.comparablePropertyType ?? '';
  const icon = getPropertyIcon(type);
  const thumb = thumbnailUrl(c.comparableThumbnailDocumentId);
  const days = daysSince(c.comparableInfoDateTime);
  const offer = c.comparableOfferPrice ?? null;
  // The big figure is the one the summary's median is built from — a sale when there is one,
  // otherwise the asking price — so the row and the summary never disagree about the same
  // comparable. The other price, when there is one, drops to the small line underneath.
  const lead = unitPriceOf(c);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  const flags = [
    days != null && days > STALE_AFTER_DAYS ? (
      <PropertyFlag key="stale" icon="clock">
        {t('markets.flags.stale', { age: f.age(days) })}
      </PropertyFlag>
    ) : null,
    comparablePoint(c) ? null : (
      <PropertyFlag key="location" icon="location-dot">
        {t('markets.flags.noLocation')}
      </PropertyFlag>
    ),
    ...usedInMethods(c).map(m => <UsedInBadge key={m} method={m} />),
  ].filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
      className="grid cursor-pointer grid-cols-[5.75rem_minmax(0,1fr)_auto_1.75rem] items-center gap-3.5 px-3 py-2.5 transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
    >
      <div className="relative flex h-[3.9rem] w-[5.75rem] items-center justify-center overflow-hidden rounded-lg bg-gray-100">
        {thumb ? (
          <img
            src={thumb}
            alt={c.comparableSurveyName ?? ''}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon name={icon.name} style={icon.style} className="text-xl text-gray-400" />
        )}
        <span className="absolute left-1.5 top-1.5 flex size-[1.1rem] items-center justify-center rounded-full bg-white text-[10px] font-bold tabular-nums text-gray-700 shadow-sm">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="truncate text-[13px] font-semibold text-gray-900">
            {c.comparableSurveyName || c.comparableNumber || '-'}
          </h4>
          {type && <PropertyTypeChip code={type} />}
        </div>
        <DotJoin
          className="mt-0.5 truncate text-[11.5px] text-gray-500"
          parts={[
            c.comparableNumber ? (
              <span className="tabular-nums text-gray-400">{c.comparableNumber}</span>
            ) : null,
            parsePlotLocation(c.comparablePlotLocation).length > 0 ? (
              <PlotLocationText raw={c.comparablePlotLocation} />
            ) : null,
            c.comparableLandAreaSqWa ? (
              <span className="tabular-nums">
                {toRaiNganWa(c.comparableLandAreaSqWa)} {t('properties.units.raiNganWa')}
              </span>
            ) : null,
            distanceKm != null ? (
              <span className="tabular-nums">
                {t('markets.meta.distance', { d: f.distance(distanceKm) })}
              </span>
            ) : null,
            c.comparableSourceInfo || null,
            f.date(c.comparableInfoDateTime),
          ]}
        />
        {flags.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">{flags}</div>
        )}
      </div>

      <div className="text-right">
        {lead ? (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[15px] font-semibold tabular-nums text-gray-900">
                {f.money(lead.value)}
              </span>{' '}
              <span className="text-[11px] text-gray-400">
                <PriceUnitLabel unit={lead.unit} />
              </span>
            </div>
            <div className="text-[11px] tabular-nums text-gray-400">
              {lead.isSale && offer != null
                ? t('markets.price.offer', { price: f.money(offer) })
                : lead.isSale
                  ? t('markets.price.saleOnly')
                  : t('markets.price.offerOnly')}
            </div>
          </>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>

      {readOnly ? (
        <span aria-hidden />
      ) : (
        <ComparableActionsMenu onOpen={onOpen} onCopy={onCopy} onDelete={onDelete} />
      )}
    </div>
  );
};

export default ComparableRow;
