import { Fragment, type ReactNode, useMemo } from 'react';
import { useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  type FlatFormError,
  flattenFormErrors,
  useRegisterMissingReveal,
} from '@/shared/components/form';
import { useMissingFields } from '@/shared/components/form/missing';
import { itemCount } from '@/shared/components/form/missing/types';
import useBreadcrumbExtras from '@/shared/hooks/useBreadcrumbExtras';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import type { PropertyGroup, PropertyItem } from '../types';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';
import { resolveTypeCode } from '../utils/propertyTypeConfig';
import {
  AssetTypeValue,
  MACHINE_TYPES,
  PlaceValue,
  brandModel,
  isVehicleOrVessel,
} from './PropertyCardContent';
import { PropertyTypeChip } from './PropertyTypeChip';
import { EditorHeader } from './EditorHeader';
import type { EditorTab } from './EditorTabBar';

interface PropertyEditorHeaderProps {
  appraisalId?: string;
  /** Absent while the property is being created. */
  propertyId?: string;
  /** The form's property type code, e.g. 'L' or 'LB' — a new property has no saved row yet. */
  typeCode: string;
  /** A PMA property: the type chip reads "… (PMA)" and an unnamed one is titled for what it is. */
  pma?: boolean;
  /** Beside the type chip and position, e.g. the PMA sync status. */
  meta?: ReactNode;
  /**
   * One entry per section of the form. A single section still gets a one-tab strip (not a tab
   * list): it is the row that joins the header to the sheet below it. Editors rendered without this
   * header or PropertyTabs have no strip — the Data Correction screen's generated VEH/VES forms.
   */
  tabs?: EditorTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

/**
 * The top of a property form (DESIGN.md 17.8): which property this is, and its tabs. The photos are
 * the shell's (`PropertyFormShell`): the rail card when wide, the first section when narrow.
 *
 * The facts come from the saved property list, the same row the cards show, so they change when the
 * form is saved rather than as the user types.
 *
 * Returned as two siblings on purpose: the identity row scrolls away and the tabs stay pinned. A
 * sticky element only sticks inside its parent, so the tabs have to be a direct child of the form's
 * scroll container rather than of a wrapper in here.
 */
export const PropertyEditorHeader = ({
  appraisalId,
  propertyId,
  typeCode,
  pma = false,
  meta,
  tabs = [],
  activeTab,
  onTabChange,
}: PropertyEditorHeaderProps) => {
  const { t } = useTranslation('appraisal');
  const { groups } = useEnrichedPropertyGroups(propertyId ? appraisalId : undefined);

  const found = useMemo(() => findProperty(groups, propertyId), [groups, propertyId]);

  // The breadcrumb's last crumb: this property's name instead of the layout's generic type label.
  const { pathname } = useLocation();
  const leafName = found && found.item.address !== '-' ? found.item.address : null;
  useBreadcrumbExtras(leafName ? [{ label: leafName, href: pathname, replacesLast: true }] : [], [
    leafName,
    pathname,
  ]);

  // Failed fields per tab, so an error on a tab out of view still shows. Panels stay mounted
  // (hidden, not removed), so a failed field on any tab can be found by its `data-field`.
  const { errors } = useFormState();
  const failed = flattenFormErrors(errors);
  // The chip counts the whole form but the TOC lists the open tab only, so each tab says how many
  // of the missing fields are on it.
  const missingItems = useMissingFields()?.summary?.sections.flatMap(section => section.items);
  const tabsWithErrors = tabs.map(tab => ({
    ...tab,
    errorCount: failed.length > 0 ? countFailedIn(`${tab.id}-section`, failed) : 0,
    missingCount: (missingItems ?? []).reduce(
      (sum, item) =>
        item.path && panelHasField(`${tab.id}-section`, item.path) ? sum + itemCount(item) : sum,
      0,
    ),
  }));

  // The missing-fields popover opens on a failed save and its "go to field" asks this header to
  // switch to the field's tab first (a hidden tab is `display: none`, which a scroll cannot reach).
  // The chip's own jump then scrolls once that tab is showing.
  useRegisterMissingReveal(path => {
    const target = tabs.find(tab => panelHasField(`${tab.id}-section`, path));
    if (target && target.id !== activeTab) onTabChange?.(target.id);
  });

  const item = found?.item;
  const groupName = found?.group.name;
  const name = leafName;
  const isNew = !propertyId;

  let facts: ReactNode = null;
  if (item) facts = <PropertyFacts item={item} />;
  else if (isNew) facts = <span>{t('editorHeader.newHint')}</span>;

  return (
    <EditorHeader
      badge={
        <PropertyTypeChip
          size="md"
          code={typeCode}
          suffix={pma ? `(${t('editorHeader.pmaSuffix')})` : undefined}
        />
      }
      title={
        name ??
        (pma
          ? t('editorHeader.pmaTitle')
          : isNew
            ? t('editorHeader.newProperty')
            : t('editorHeader.untitled'))
      }
      titleMuted={!name && !pma}
      facts={
        <>
          {groupName && item?.sequenceNumber != null && (
            <span className="mr-2">
              {t('editorHeader.position', { group: groupName, n: item.sequenceNumber })}
            </span>
          )}
          {facts}
        </>
      }
      actions={meta}
      tabs={tabsWithErrors}
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabsLabel={t('editorHeader.tabsLabel')}
    />
  );
};

/**
 * The group and item for a property id. Case-insensitive: the list holds the API's lowercase
 * GUIDs, while a URL can carry them in capitals (hand-written links, SQL Server's own output).
 */
export function findProperty(groups: PropertyGroup[], propertyId?: string) {
  if (!propertyId) return null;
  const wanted = propertyId.toLowerCase();
  for (const group of groups) {
    const item = group.items.find(i => i.id.toLowerCase() === wanted);
    if (item) return { group, item };
  }
  return null;
}

/**
 * How many of the failed fields sit inside a tab's panel — the element with id `${tab.id}-section`
 * that every property page wraps each tab's content in. Array errors (`titles`) match their first cell.
 */
export function countFailedIn(panelId: string, failed: FlatFormError[]): number {
  return failed.filter(({ path }) => panelHasField(panelId, path)).length;
}

/** Is the field at `path` inside the element with this id? Array errors match their first cell. */
export function panelHasField(panelId: string, path: string): boolean {
  const panel = document.getElementById(panelId);
  if (!panel) return false;
  const escaped = CSS.escape(path);
  return panel.querySelector(`[data-field="${escaped}"], [data-field^="${escaped}."]`) !== null;
}

const CONDO_CODES = new Set<string>(['U', 'LSU']);

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
  } else if (isVehicleOrVessel(item.type)) {
    if (item.vehicleType || item.vesselType) facts.push(<AssetTypeValue property={item} />);
    const identity = brandModel(item);
    if (identity) facts.push(identity);
    if (item.registrationNumber) facts.push(item.registrationNumber);
    if (item.yearOfManufacture)
      facts.push(
        <span className="tabular-nums">
          {t('properties.facts.madeIn', { n: item.yearOfManufacture })}
        </span>,
      );
    facts.push(<PlaceValue property={item} />);
  } else if (CONDO_CODES.has(resolveTypeCode(item.type) ?? '')) {
    // A unit is told apart by its project, floor and room, as in the property cards; the deed
    // number of a condo is free text and no help here.
    if (item.condoName) facts.push(item.condoName);
    const unit = [
      item.floorNumber && t('properties.facts.floor', { n: item.floorNumber }),
      item.roomNumber && t('properties.facts.room', { n: item.roomNumber }),
    ].filter(Boolean);
    if (unit.length) facts.push(<span className="tabular-nums">{unit.join(' · ')}</span>);
    if (item.areaValue)
      facts.push(
        <span className="tabular-nums">
          {formatAreaNumber(item.areaValue)} {t('properties.units.sqm')}
        </span>,
      );
    facts.push(<PlaceValue property={item} />);
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
            <span aria-hidden className="mx-2 text-(--palette-gray-300)">
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
