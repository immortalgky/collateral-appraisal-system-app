import { type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketComparableDetailDtoType } from '@/shared/schemas/v1';
import { useGetAppraisalComparables } from '../api/marketComparable';
import { useMarketFormatters } from '../hooks/useMarketFormatters';
import { useSubjectPoints } from '../hooks/useSubjectPoints';
import { toRaiNganWa } from '../utils/areaFormat';
import {
  comparablePoint,
  daysSince,
  nearestKm,
  parsePlotLocation,
  STALE_AFTER_DAYS,
  unitPriceOf,
  usedInMethods,
  type Comparable,
} from '../utils/marketComparableFormat';
import { EditorIdentityCard, EditorTabBar, type EditorTab } from './EditorIdentityCard';
import MarketComparablePhotoSection, {
  type MarketComparablePhotoSectionRef,
} from './MarketComparablePhotoSection';
import { DotJoin, PlotLocationText, PriceUnitLabel, UsedInBadge } from './MarketsLabels';
import { PropertyFlag } from './PropertyCardContent';
import type { PhotoSectionView } from './PropertyPhotoSection';
import { PropertyTypeChip } from './PropertyTypeChip';

interface ComparableEditorHeaderProps {
  appraisalId?: string;
  /** The saved comparable being edited. Absent while creating, including from a copy. */
  marketComparableId?: string;
  /** What the form was filled from: this comparable, or the one being copied. */
  source?: MarketComparableDetailDtoType;
  isCopy: boolean;
  typeCode: string;
  photoSectionRef: Ref<MarketComparablePhotoSectionRef>;
  /** The form's sections in page order; each id is an element id inside the form. */
  sections: EditorTab[];
}

/** The loaded comparable in the shape of a Markets row, for when there is no row: outside an appraisal. */
const asRow = (d: MarketComparableDetailDtoType): Comparable => ({
  comparableNumber: d.comparableNumber,
  comparablePropertyType: d.propertyType,
  comparableSurveyName: d.surveyName,
  comparableInfoDateTime: d.infoDateTime,
  comparableSourceInfo: d.sourceInfo,
  comparableOfferPrice: d.offerPrice,
  comparableSalePrice: d.salePrice,
  comparableOfferPriceUnit: d.offerPriceUnit,
  comparableSalePriceUnit: d.salePriceUnit,
  comparableLatitude: d.latitude,
  comparableLongitude: d.longitude,
});

/**
 * The top of the market comparable form, in the same shape as the property form's header: which
 * comparable this is, its photos, and a bar for its sections.
 *
 * The facts are the Markets tab's own row for this comparable — the same price, age and "used in"
 * the list shows — so the header and the list never disagree. They change when the form is saved,
 * not as the user types.
 *
 * Unlike the property form, the bar does not swap content: the form is one page, and the bar jumps
 * to a section and follows the scroll. Survey factors carry required fields, and on a hidden tab a
 * failed save would give no clue where the problem is.
 */
export const ComparableEditorHeader = ({
  appraisalId,
  marketComparableId,
  source,
  isCopy,
  typeCode,
  photoSectionRef,
  sections,
}: ComparableEditorHeaderProps) => {
  const { t } = useTranslation('appraisal');
  const f = useMarketFormatters();
  const barRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(sections[0]?.id);

  const { data: rows } = useGetAppraisalComparables(marketComparableId ? appraisalId : undefined);
  const subjects = useSubjectPoints(appraisalId);
  const index =
    rows && marketComparableId
      ? rows.findIndex(r => r.marketComparableId === marketComparableId)
      : -1;
  const row = rows && index >= 0 ? rows[index] : undefined;
  let comparable: Comparable | undefined;
  if (marketComparableId) comparable = row ?? (source ? asRow(source) : undefined);

  // The section in view is the last one whose top has passed under the bar.
  const sectionKey = sections.map(s => s.id).join('|');
  useEffect(() => {
    const bar = barRef.current;
    const scroller = bar?.parentElement;
    if (!bar || !scroller) return;
    const ids = sectionKey.split('|');
    const onScroll = () => {
      const line = bar.getBoundingClientRect().bottom + 16;
      let current = ids[0];
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top != null && top <= line) current = id;
      }
      // A short last section never reaches the bar; at the very bottom it is the one in view.
      const atBottom =
        scroller.scrollTop > 0 &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      setActiveId(atBottom ? ids[ids.length - 1] : current);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [sectionKey]);

  const jumpTo = (id: string) => {
    const bar = barRef.current;
    const scroller = bar?.parentElement;
    const target = document.getElementById(id);
    if (!bar || !scroller || !target) return;
    const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({
      top: scroller.scrollTop + offset - bar.offsetHeight - 12,
      behavior: 'smooth',
    });
  };

  const name = comparable?.comparableSurveyName?.trim() || null;
  let title = name;
  if (!title) {
    title = marketComparableId
      ? t('marketEditor.header.untitled')
      : t('marketEditor.header.newComparable');
  }

  const top = (
    <>
      {typeCode && <PropertyTypeChip code={typeCode} />}
      {comparable?.comparableNumber ? (
        <span className="text-xs tabular-nums text-gray-400">{comparable.comparableNumber}</span>
      ) : (
        !marketComparableId && (
          <span className="text-xs italic text-gray-400">
            {t('marketEditor.header.numberPending')}
          </span>
        )
      )}
      {row && rows && (
        <span className="ml-auto text-xs text-gray-400">
          {t('marketEditor.header.position', { n: index + 1, total: rows.length })}
        </span>
      )}
    </>
  );

  let facts: ReactNode;
  if (comparable) {
    const c = comparable;
    const km = nearestKm(comparablePoint(c), subjects);
    const days = daysSince(c.comparableInfoDateTime);
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
    facts = (
      <>
        <DotJoin
          className="text-[13px] text-gray-600"
          parts={[
            parsePlotLocation(c.comparablePlotLocation).length > 0 ? (
              <PlotLocationText raw={c.comparablePlotLocation} />
            ) : null,
            c.comparableLandAreaSqWa ? (
              <span className="tabular-nums">
                {toRaiNganWa(c.comparableLandAreaSqWa)} {t('properties.units.raiNganWa')}
              </span>
            ) : null,
            km != null ? (
              <span className="tabular-nums">
                {t('markets.meta.distance', { d: f.distance(km) })}
              </span>
            ) : null,
            c.comparableSourceInfo || null,
            f.date(c.comparableInfoDateTime),
          ]}
        />
        {flags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">{flags}</div>
        )}
      </>
    );
  } else {
    facts = (
      <p className="text-[13px] text-gray-400">
        {isCopy && source?.comparableNumber
          ? t('marketEditor.header.copiedFrom', { number: source.comparableNumber })
          : t('editorHeader.newHint')}
      </p>
    );
  }

  // The price sits at the right edge, as it does on the Markets row.
  const lead = comparable ? unitPriceOf(comparable) : null;
  const offer = comparable?.comparableOfferPrice ?? null;
  const aside = lead ? (
    <>
      <span className="text-[11px] text-gray-400">
        {lead.isSale ? t('markets.price.saleOnly') : t('markets.price.offerOnly')}
      </span>
      <span className="text-xl font-semibold leading-tight tabular-nums text-gray-900">
        {f.money(lead.value)}
      </span>
      <span className="text-xs text-gray-400">
        <PriceUnitLabel unit={lead.unit} />
      </span>
      {lead.isSale && offer != null && (
        <span className="mt-1 text-[11px] tabular-nums text-gray-400">
          {t('markets.price.offer', { price: f.money(offer) })}
        </span>
      )}
    </>
  ) : (
    <>
      <span className="text-[11px] text-gray-400">{t('marketEditor.price.label')}</span>
      <span className="mt-1 text-[13px] italic text-gray-400">
        {comparable ? '—' : t('marketEditor.price.notSaved')}
      </span>
    </>
  );

  const renderCard = (view?: PhotoSectionView) => (
    <EditorIdentityCard view={view} top={top} title={title} titleMuted={!name} aside={aside}>
      {facts}
    </EditorIdentityCard>
  );

  return (
    <>
      <div className="px-3">
        {appraisalId ? (
          <MarketComparablePhotoSection
            ref={photoSectionRef}
            appraisalId={appraisalId}
            marketComparableId={marketComparableId}
            images={source?.images}
            renderGallery={renderCard}
          />
        ) : (
          renderCard()
        )}
      </div>
      <EditorTabBar
        barRef={barRef}
        mode="sections"
        tabs={sections}
        activeId={activeId}
        label={t('marketEditor.sectionsLabel')}
        onSelect={jumpTo}
      />
    </>
  );
};
