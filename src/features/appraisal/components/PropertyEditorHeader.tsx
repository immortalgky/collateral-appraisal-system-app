import { Fragment, type ReactNode, type Ref, useEffect, useMemo, useRef } from 'react';
import { useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { type FlatFormError, flattenFormErrors, scrollToField } from '@/shared/components/form';
import useBreadcrumbExtras from '@/shared/hooks/useBreadcrumbExtras';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import type { PropertyItem } from '../types';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';
import PropertyPhotoSection, {
  type PhotoSectionView,
  type PropertyPhotoSectionRef,
} from './PropertyPhotoSection';
import { MACHINE_TYPES, PlaceValue, brandModel } from './PropertyCardContent';
import { PropertyTypeChip } from './PropertyTypeChip';
import { EditorIdentityCard, EditorTabBar, type EditorTab } from './EditorIdentityCard';

interface PropertyEditorHeaderProps {
  appraisalId?: string;
  /** Absent while the property is being created. */
  propertyId?: string;
  /** The form's property type code, e.g. 'L' or 'LB' — a new property has no saved row yet. */
  typeCode: string;
  photoSectionRef: Ref<PropertyPhotoSectionRef>;
  /** Leave out for a form with a single section — one tab is no choice at all. */
  tabs?: EditorTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

/**
 * The top of a property form: which property this is, its photos, and its tabs.
 *
 * It replaced three stacked pieces — an anchor bar whose first button scrolled while the others
 * switched tabs, a Photos section well over a hundred pixels tall, and a heading repeating the
 * tab's name. The facts come from the saved property list, the same row the rail and the cards
 * show, so they change when the form is saved rather than as the user types.
 *
 * Returned as two siblings on purpose: the card scrolls away and the tabs stay pinned. A sticky
 * element only sticks inside its parent, so the tabs have to be a direct child of the form's
 * scroll container rather than of a wrapper in here.
 */
export const PropertyEditorHeader = ({
  appraisalId,
  propertyId,
  typeCode,
  photoSectionRef,
  tabs = [],
  activeTab,
  onTabChange,
}: PropertyEditorHeaderProps) => {
  const { t } = useTranslation('appraisal');
  const cardRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { groups } = useEnrichedPropertyGroups(propertyId ? appraisalId : undefined);

  const found = useMemo(() => {
    if (!propertyId) return null;
    for (const group of groups) {
      const item = group.items.find(i => i.id === propertyId);
      if (item) return { group, item };
    }
    return null;
  }, [groups, propertyId]);

  // The breadcrumb's last crumb: this property's name instead of the layout's generic type label.
  const { pathname } = useLocation();
  const leafName = found && found.item.address !== '-' ? found.item.address : null;
  useBreadcrumbExtras(leafName ? [{ label: leafName, href: pathname, replacesLast: true }] : [], [
    leafName,
    pathname,
  ]);

  // Failed fields per tab, so an error on a tab out of view still shows. Panels stay mounted
  // (hidden, not removed), so a failed field on any tab can be found by its `data-field`.
  const { errors, submitCount } = useFormState();
  const failed = flattenFormErrors(errors);
  const tabsWithErrors = tabs.map(tab => ({
    ...tab,
    errorCount: failed.length > 0 ? countFailedIn(`${tab.id}-section`, failed) : 0,
  }));

  // After a failed save, bring a failed field into view. The form's own scroll aims at the first
  // error overall, and when that field sits on a hidden tab (`display: none`) it goes nowhere.
  // So: stay on this tab if it has a failed field and go to the first one; otherwise open the tab
  // holding the first error that is on any tab, and scroll once that tab is showing.
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    if (!submitCount || failed.length === 0 || tabs.length < 2) return;
    const onThisTab = activeTab
      ? failed.find(f => panelHasField(`${activeTab}-section`, f.path))
      : undefined;
    if (onThisTab) {
      requestAnimationFrame(() => scrollToField(onThisTab.path));
      return;
    }
    // The first error that sits on a tab: one outside every panel (a field this form does not
    // render, say) must not stop the search for one the user can actually get to.
    for (const f of failed) {
      const target = tabs.find(tab => panelHasField(`${tab.id}-section`, f.path));
      if (!target) continue;
      pendingScroll.current = f.path;
      onTabChange?.(target.id);
      return;
    }
    // Only on the submit that produced the errors, not on every keystroke that clears one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);
  useEffect(() => {
    const path = pendingScroll.current;
    if (!path) return;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => scrollToField(path));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const selectTab = (id: string) => {
    onTabChange?.(id);
    // Deep in a long tab, the next one should open at its top rather than wherever this one was.
    const scroller = tabsRef.current?.parentElement;
    const cardHeight = cardRef.current?.offsetHeight ?? 0;
    if (scroller && scroller.scrollTop > cardHeight) scroller.scrollTo({ top: cardHeight });
  };

  const renderCard = (view?: PhotoSectionView) => (
    <IdentityCard
      view={view}
      typeCode={typeCode}
      item={found?.item}
      groupName={found?.group.name}
      isNew={!propertyId}
    />
  );

  return (
    <>
      <div ref={cardRef} className="px-6">
        {appraisalId ? (
          <PropertyPhotoSection
            ref={photoSectionRef}
            appraisalId={appraisalId}
            propertyId={propertyId}
            renderGallery={renderCard}
          />
        ) : (
          renderCard()
        )}
      </div>
      {tabs.length > 1 && (
        <EditorTabBar
          barRef={tabsRef}
          tabs={tabsWithErrors}
          activeId={activeTab}
          label={t('editorHeader.tabsLabel')}
          onSelect={selectTab}
        />
      )}
    </>
  );
};

/**
 * How many of the failed fields sit inside a tab's panel — the element with id `${tab.id}-section`
 * that every property page wraps each tab's content in. Array errors (`titles`) match their first cell.
 */
function countFailedIn(panelId: string, failed: FlatFormError[]): number {
  return failed.filter(({ path }) => panelHasField(panelId, path)).length;
}

/** Is the field at `path` inside the element with this id? Array errors match their first cell. */
function panelHasField(panelId: string, path: string): boolean {
  const panel = document.getElementById(panelId);
  if (!panel) return false;
  const escaped = CSS.escape(path);
  return panel.querySelector(`[data-field="${escaped}"], [data-field^="${escaped}."]`) !== null;
}

interface IdentityCardProps {
  view?: PhotoSectionView;
  typeCode: string;
  item?: PropertyItem;
  groupName?: string;
  isNew: boolean;
}

/** The shared editor card, filled with a property's type, name and facts. */
const IdentityCard = ({ view, typeCode, item, groupName, isNew }: IdentityCardProps) => {
  const { t } = useTranslation('appraisal');
  const name = item && item.address !== '-' ? item.address : null;

  let factsLine: ReactNode = null;
  if (item) factsLine = <PropertyFacts item={item} />;
  else if (isNew) factsLine = <span className="text-gray-400">{t('editorHeader.newHint')}</span>;

  return (
    <EditorIdentityCard
      view={view}
      top={
        <>
          <PropertyTypeChip code={typeCode} />
          {groupName && item?.sequenceNumber != null && (
            <span className="ml-auto text-xs font-medium text-gray-600">
              {t('editorHeader.position', { group: groupName, n: item.sequenceNumber })}
            </span>
          )}
        </>
      }
      title={name ?? (isNew ? t('editorHeader.newProperty') : t('editorHeader.untitled'))}
      titleMuted={!name}
    >
      <div className="flex flex-wrap items-center text-[13px] text-gray-600">{factsLine}</div>
    </EditorIdentityCard>
  );
};

/**
 * The line under the name. Machines are told apart by brand and registration; everything else
 * by its deeds, its area, and where it is — or, for a building, what it is (`PlaceValue`).
 */
const PropertyFacts = ({ item }: { item: PropertyItem }) => {
  const { t } = useTranslation('appraisal');
  const facts: ReactNode[] = [];

  if (MACHINE_TYPES.has(item.type)) {
    const identity = brandModel(item);
    if (identity) facts.push(identity);
    if (item.registrationNumber) facts.push(item.registrationNumber);
  } else {
    const titleCount = item.titles?.length ?? 0;
    if (titleCount > 1) facts.push(t('editorHeader.titleCount', { n: titleCount }));
    else if (item.titleNo) {
      // A condo's title number is free text and can be a long list; cut it to one short run and
      // keep the whole of it in the tooltip.
      const label = t('editorHeader.titleNo', { no: item.titleNo });
      facts.push(
        <span className="block max-w-[18rem] truncate" title={label}>
          {label}
        </span>,
      );
    }
    if (item.areaValue) {
      facts.push(
        <span className="tabular-nums">
          {item.areaUnit === 'wa'
            ? `${toRaiNganWa(item.areaValue)} ${t('properties.units.raiNganWa')}`
            : `${formatAreaNumber(item.areaValue)} ${t('properties.units.sqm')}`}
        </span>,
      );
    }
    facts.push(<PlaceValue property={item} />);
  }

  return (
    <>
      {facts.map((fact, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span aria-hidden className="mx-2 text-gray-300">
              ·
            </span>
          )}
          {/* min-w-0 + truncate: one over-long fact ellipsizes instead of pushing past the card. */}
          <span className="min-w-0 max-w-full truncate">{fact}</span>
        </Fragment>
      ))}
    </>
  );
};
