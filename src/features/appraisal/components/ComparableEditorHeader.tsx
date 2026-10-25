import { type ReactNode, useEffect, useRef, useState } from 'react';
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
import { EditorHeader } from './EditorHeader';
import type { EditorTab } from './EditorTabBar';
import { DotJoin, PlotLocationText, PriceUnitLabel, UsedInBadge } from './MarketsLabels';
import { PropertyFlag } from './PropertyCardContent';
import { PropertyTypeChip } from './PropertyTypeChip';

interface ComparableEditorHeaderProps {
  appraisalId?: string;
  /** The saved comparable being edited. Absent while creating, including from a copy. */
  marketComparableId?: string;
  /** What the form was filled from: this comparable, or the one being copied. */
  source?: MarketComparableDetailDtoType;
  isCopy: boolean;
  typeCode: string;
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
 * The top of the market comparable form, on the editors' `EditorHeader` (DESIGN.md 17.8): which
 * comparable this is, its price, and a bar for its sections. The photos are the shell's
 * (`ComparableFormShell`): the rail card when wide, the first section when narrow.
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

  const badge = (
    <>
      {typeCode && <PropertyTypeChip size="md" code={typeCode} />}
      {comparable?.comparableNumber ? (
        <span className="text-xs tabular-nums text-(--palette-gray-400)">
          {comparable.comparableNumber}
        </span>
      ) : (
        !marketComparableId && (
          <span className="text-xs italic text-(--palette-gray-400)">
            {t('marketEditor.header.numberPending')}
          </span>
        )
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
        {row && rows && (
          <span className="mr-2">
            {t('marketEditor.header.position', { n: index + 1, total: rows.length })}
          </span>
        )}
        <DotJoin
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
          <div className="ml-3 flex flex-wrap items-center gap-x-3 gap-y-0.5">{flags}</div>
        )}
      </>
    );
  } else {
    facts = (
      <span>
        {isCopy && source?.comparableNumber
          ? t('marketEditor.header.copiedFrom', { number: source.comparableNumber })
          : t('editorHeader.newHint')}
      </span>
    );
  }

  // The price sits at the right end, as it does on the Markets row.
  const lead = comparable ? unitPriceOf(comparable) : null;
  const offer = comparable?.comparableOfferPrice ?? null;
  const price = lead ? (
    <div className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-right">
      <span className="text-xs text-(--palette-gray-400)">
        {lead.isSale ? t('markets.price.saleOnly') : t('markets.price.offerOnly')}
      </span>
      <span className="text-base font-semibold tabular-nums text-(--palette-ink)">
        {f.money(lead.value)}
      </span>
      <span className="text-xs text-(--palette-gray-400)">
        <PriceUnitLabel unit={lead.unit} />
      </span>
      {lead.isSale && offer != null && (
        <span className="w-full text-xs tabular-nums text-(--palette-gray-400)">
          {t('markets.price.offer', { price: f.money(offer) })}
        </span>
      )}
    </div>
  ) : (
    <div className="flex items-baseline gap-x-1.5 text-xs text-(--palette-ink-2)">
      <span>{t('marketEditor.price.label')}</span>
      <span className="italic">{comparable ? '—' : t('marketEditor.price.notSaved')}</span>
    </div>
  );

  return (
    <EditorHeader
      badge={badge}
      title={title}
      titleMuted={!name}
      facts={facts}
      actions={price}
      tabs={sections}
      activeTab={activeId}
      onTabChange={jumpTo}
      tabsLabel={t('marketEditor.sectionsLabel')}
      tabsMode="sections"
      tabsBarRef={barRef}
    />
  );
};
