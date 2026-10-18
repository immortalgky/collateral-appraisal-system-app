import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TraversalOrder,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { memo, useMemo, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import { useAddressStore } from '@/shared/store';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { RequestTitleDtoType } from '../../schemas/form';
import {
  formatRaiNganWa,
  normaliseLandTitleNumbers,
  positionEntries,
  summariseTitleNumber,
  titleFamily,
  totalSquareWa,
  type TitleFamily,
} from '../../utils/titleList';
import { useCardIsWide } from '../documentCard/usePaneLayout';
import { useMissingFieldLabel } from './titleHooks';

/** Literal keys: the strictly-typed `t()` rejects a key built from the field name. */
const POSITION_KEYS = {
  rawang: 'titleSection.position.rawang',
  mapSheetNumber: 'titleSection.position.mapSheetNumber',
  aerialMapName: 'titleSection.position.aerialMapName',
  aerialMapNumber: 'titleSection.position.aerialMapNumber',
  landParcelNumber: 'titleSection.position.landParcelNumber',
  surveyNumber: 'titleSection.position.surveyNumber',
} as const;

// The stacking inside the scroll box, lowest first: body cells, the pinned actions cells of the body
// (z-[1]), the totals row (z-[2]), the header cells (z-10) and the header's pinned corner (z-20). Each
// layer names its own z and background, so none of them relies on class order.
const TH_BASE =
  'sticky top-0 border-b border-gray-200 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600';
const TH = clsx(TH_BASE, 'z-10');
const TH_CORNER = clsx(TH_BASE, 'right-0 z-20');
/**
 * The actions column stays at the right edge of the scroll box when the table is wider than it (a
 * narrow card), so the row menu is never scrolled out of reach. The cell takes its row's colour.
 */
const STICKY_END = 'sticky right-0 z-[1] bg-inherit';
const TD = 'border-b border-gray-100 px-2 py-1 align-middle';
/**
 * The status column holds a nowrap Badge (sm, 12px): "Missing 12", the longest label in the three
 * languages, is 84px at the 14px root. With the tighter 0.25rem side padding that needs 91px, so
 * 6.6rem leaves a gap of about 5px to the pinned actions column. The estate table must also fit its card at a 1440px screen (about 848px)
 * with no horizontal scroll: a table that scrolls leaves the pinned actions column over the end of
 * this one. Hence its 60rem minimum and the 1400px shares below.
 */
const STATUS_WIDTH = '6.6rem';
const STATUS_PAD = 'px-1!';
/** A column head that may only break at its " / ": each part stays whole, in any language. */
const HeadLabel = ({ label }: { label: string }) => {
  const parts = label.split(' / ');
  // No " / ": an ordinary head, free to wrap wherever the language allows.
  if (parts.length === 1) return <>{label}</>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={part}>
          <span className="whitespace-nowrap">
            {part}
            {i < parts.length - 1 && ' /'}
          </span>
          {i < parts.length - 1 && ' '}
        </span>
      ))}
    </>
  );
};
export interface RowActions {
  open: (index: number) => void;
  duplicate: (index: number) => void;
  remove: (index: number) => void;
  moveTo: (index: number) => void;
  moveToEdge: (index: number, edge: 'top' | 'bottom') => void;
}

export type TitleTableKind = 'estate' | 'movable';

interface TitleTableProps {
  kind: TitleTableKind;
  /** One decision for the whole card (see TitleTableGroup): the actions fold into the ⋮ menu. */
  collapsed: boolean;
  heading: string;
  /** Array indices shown, in array order (the filter has already been applied). */
  rows: readonly number[];
  /** Titles in this table before any filter, for the heading and the first / last checks. */
  groupRows: readonly number[];
  titles: readonly RequestTitleDtoType[];
  sigs: readonly string[];
  missing: readonly (readonly string[])[];
  readOnly: boolean;
  /** The order controls exist (writable, more than one row). */
  canOrder: boolean;
  /** …but drag is off while a search or filter is on, since the rows on screen are not the list. */
  dragOff: boolean;
  /**
   * Uploads are in flight, and a file is written back to its title by position: moving a row now
   * would put it on the wrong title. Drag and the move menu are off until they finish.
   */
  orderLocked: boolean;
  actions: RowActions;
  onReorder: (from: number, to: number) => void;
  /** Land titles only: parcels and area over the whole table, never just the filtered rows. */
  totals?: { parcels: number; totalWa: number };
}

/** What a drag handle needs from `useSortable`. */
type HandleProps = HTMLAttributes<HTMLElement> & { ref: Ref<HTMLButtonElement> };

/**
 * A title row that is dragged by its handle only: the row itself opens the editor on a click, so it
 * cannot also be the drag target. Rows are identified by their position in the array (an edit must
 * not remount its row), so after a drop the same rows re-render with the moved title's content.
 */
const SortableRow = ({
  id,
  disabled,
  children,
  ...rest
}: {
  id: string;
  disabled: boolean;
  children: (handle: HandleProps) => ReactNode;
} & Omit<HTMLAttributes<HTMLTableRowElement>, 'children'>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    // No animation on a drop: the ids are positions, so `move` swaps the content under them while
    // dnd-kit releases each row's offset; animating that release would replay the move.
  } = useSortable({ id, disabled, animateLayoutChanges: () => false });
  return (
    <tr
      ref={setNodeRef}
      {...rest}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.6 : undefined,
      }}
    >
      {children({ ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps)}
    </tr>
  );
};

interface DetailPart {
  /** Muted, before the value. */
  label?: string;
  value: ReactNode;
  /** The value as text, for the tooltip. */
  text?: string;
}

/**
 * A cell's details as plain text on ONE line, parts joined by " · " (label muted, value normal). A
 * long line is cut with an ellipsis, all of it in the tooltip; no parts is a muted dash.
 */
const DetailLine = ({ parts }: { parts: DetailPart[] }) => {
  if (parts.length === 0) return <Dash />;
  // A value that already starts with its label ("ระวาง 5003" under "ระวาง") stands alone
  const labelOf = (part: DetailPart) =>
    part.label && !part.text?.trim().toLowerCase().startsWith(part.label.trim().toLowerCase())
      ? part.label
      : undefined;
  const full = parts.map(part => [labelOf(part), part.text].filter(Boolean).join(' ')).join(' · ');
  return (
    <span className="block truncate" title={full || undefined}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {labelOf(part) && <span className="text-gray-500">{labelOf(part)} </span>}
          <span className="text-gray-900">{part.value}</span>
        </span>
      ))}
    </span>
  );
};

// One line: a long value is cut with an ellipsis, all of it in the tooltip when it is plain text.
const Sub = ({ children }: { children: ReactNode }) => (
  <span
    className="block truncate text-xs text-gray-500"
    title={typeof children === 'string' ? children : undefined}
  >
    {children}
  </span>
);

/** The collateral type on one line (the longest names are cut, the full name on hover). */
const TypeName = ({ code }: { code: string }) => {
  const name = useParameterDescription('CollateralType', code);
  return (
    <span className="block truncate font-medium" title={name || undefined}>
      <ParameterDisplay group="CollateralType" code={code} />
    </span>
  );
};

const Dash = () => <span className="text-gray-400">—</span>;

const has = (value: unknown) => value != null && String(value).trim() !== '';

// ---------------------------------------------------------------------------------------------

interface RowProps {
  kind: TitleTableKind;
  index: number;
  /** The number shown: the title's place in its own table. */
  rank: number;
  title: RequestTitleDtoType;
  /** Re-render key: the title's content, so an unchanged row is skipped (see the comparator). */
  sig: string;
  missingCount: number;
  missingText: string;
  readOnly: boolean;
  showHandle: boolean;
  dragOff: boolean;
  orderLocked: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  canOrder: boolean;
  /** The card is too narrow for the three icons: they move into the ⋮ menu. */
  collapsed: boolean;
  actions: RowActions;
}

function RowMenu({
  index,
  canOrder,
  collapsed,
  firstInGroup,
  lastInGroup,
  orderLocked,
  actions,
}: Pick<
  RowProps,
  'index' | 'canOrder' | 'collapsed' | 'firstInGroup' | 'lastInGroup' | 'orderLocked' | 'actions'
>) {
  const { t } = useTranslation(['request', 'common']);
  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-disabled:cursor-default data-disabled:text-gray-300';
  // The menu is portalled, but React still bubbles its clicks to the row, which would open the editor.
  return (
    <div
      role="presentation"
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
    >
      <Menu>
        <MenuButton
          aria-label={t('titleSection.row.menu')}
          title={t('titleSection.row.menu')}
          className="flex size-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-primary data-open:bg-gray-100"
        >
          <Icon style="solid" name="ellipsis-vertical" className="size-4" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="z-50 mt-1 min-w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
        >
          {collapsed && (
            <>
              <MenuItem>
                <button type="button" className={item} onClick={() => actions.open(index)}>
                  <Icon style="solid" name="pen" className="size-3.5 text-gray-400" />
                  {t('common:actions.edit')}
                </button>
              </MenuItem>
              <MenuItem>
                <button type="button" className={item} onClick={() => actions.duplicate(index)}>
                  <Icon style="regular" name="copy" className="size-3.5 text-gray-400" />
                  {t('actions.duplicate')}
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  className={clsx(item, 'text-danger')}
                  onClick={() => actions.remove(index)}
                >
                  <Icon style="solid" name="trash" className="size-3.5" />
                  {t('actions.delete')}
                </button>
              </MenuItem>
              {canOrder && <div role="separator" className="my-1 border-t border-gray-100" />}
            </>
          )}
          {canOrder && (
            <>
              <MenuItem disabled={orderLocked}>
                <button type="button" className={item} onClick={() => actions.moveTo(index)}>
                  <Icon style="solid" name="arrows-up-down" className="size-3.5 text-gray-400" />
                  {t('titleSection.row.moveTo')}
                </button>
              </MenuItem>
              <MenuItem disabled={firstInGroup || orderLocked}>
                <button
                  type="button"
                  className={item}
                  onClick={() => actions.moveToEdge(index, 'top')}
                >
                  <Icon style="solid" name="arrow-up" className="size-3.5 text-gray-400" />
                  {t('titleSection.row.moveTop')}
                </button>
              </MenuItem>
              <MenuItem disabled={lastInGroup || orderLocked}>
                <button
                  type="button"
                  className={item}
                  onClick={() => actions.moveToEdge(index, 'bottom')}
                >
                  <Icon style="solid" name="arrow-down" className="size-3.5 text-gray-400" />
                  {t('titleSection.row.moveBottom')}
                </button>
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Menu>
    </div>
  );
}

function RowButtons({
  index,
  readOnly,
  canOrder,
  collapsed,
  firstInGroup,
  lastInGroup,
  orderLocked,
  actions,
}: Pick<
  RowProps,
  | 'index'
  | 'readOnly'
  | 'canOrder'
  | 'collapsed'
  | 'firstInGroup'
  | 'lastInGroup'
  | 'orderLocked'
  | 'actions'
>) {
  const { t } = useTranslation(['request', 'common']);
  if (readOnly) return null;
  if (collapsed) {
    return (
      <div className="flex items-center justify-end">
        <RowMenu
          index={index}
          canOrder={canOrder}
          collapsed
          firstInGroup={firstInGroup}
          lastInGroup={lastInGroup}
          orderLocked={orderLocked}
          actions={actions}
        />
      </div>
    );
  }
  const btn =
    'flex size-6 items-center justify-center rounded-md text-gray-400 transition-colors focus-visible:outline-2 focus-visible:outline-primary';
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          actions.open(index);
        }}
        className={clsx(btn, 'hover:bg-primary/10 hover:text-primary')}
        aria-label={t('common:actions.edit')}
        title={t('common:actions.edit')}
      >
        <Icon style="solid" name="pen" className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          actions.duplicate(index);
        }}
        className={clsx(btn, 'hover:bg-gray-100 hover:text-gray-700')}
        aria-label={t('actions.duplicate')}
        title={t('actions.duplicate')}
      >
        <Icon style="regular" name="copy" className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          actions.remove(index);
        }}
        className={clsx(btn, 'hover:bg-danger/10 hover:text-danger')}
        aria-label={t('actions.delete')}
        title={t('actions.delete')}
      >
        <Icon style="solid" name="trash" className="size-3.5" />
      </button>
      {canOrder && (
        <RowMenu
          index={index}
          canOrder={canOrder}
          collapsed={false}
          firstInGroup={firstInGroup}
          lastInGroup={lastInGroup}
          orderLocked={orderLocked}
          actions={actions}
        />
      )}
    </div>
  );
}

function StatusCells({
  missingCount,
  missingText,
}: Pick<RowProps, 'missingCount' | 'missingText'>) {
  const { t } = useTranslation('request');
  return (
    <td className={clsx(TD, STATUS_PAD)}>
      {missingCount === 0 ? (
        <Badge tone="green" size="sm" className="whitespace-nowrap">
          {t('titleSection.status.complete')}
        </Badge>
      ) : (
        <Badge
          tone="yellow"
          size="sm"
          className="whitespace-nowrap"
          title={missingText}
          aria-label={missingText}
        >
          {t('titleSection.status.missing', { count: missingCount })}
        </Badge>
      )}
    </td>
  );
}

function EstateCells({ title }: { title: RequestTitleDtoType }) {
  const { t } = useTranslation('request');
  const family: TitleFamily = titleFamily(title.collateralType);
  const land = family === 'land' || family === 'landBuilding';
  const hasDeed = family !== 'building' && family !== 'none';

  // The DeedType master reads "โฉนดที่ดิน / อ.ช.2" for DEED (one caption for the dropdown, which a
  // condominium shares), so the table spells the land document on its own and names a condominium by
  // its unit. Every other type is its master label.
  const condo = family === 'condo';
  const masterName = useParameterDescription('DeedType', title.titleType);
  const deedName = condo
    ? has(title.roomNumber)
      ? t('titleSection.cell.condoUnit', { room: title.roomNumber })
      : t('titleSection.cell.condo')
    : title.titleType === 'DEED'
      ? t('titleSection.cell.landDeed')
      : masterName;
  // The sub-line, without the parts that are empty. The number leads, as on the paper. A
  // condominium's number is a list of land titles: its floor and building first, then the first of
  // those titles and how many more.
  const numbers = condo ? summariseTitleNumber(title.titleNumber) : null;
  const text = (value: unknown) => (has(value) ? String(value) : '');
  const subParts: { key: string; text: string; node: ReactNode }[] = (
    condo
      ? [
          {
            key: 'floor',
            text: has(title.floorNumber)
              ? t('titleSection.cell.floor', { n: title.floorNumber })
              : '',
          },
          {
            key: 'building',
            text: has(title.buildingNumber)
              ? t('titleSection.cell.building', { n: title.buildingNumber })
              : '',
          },
          {
            key: 'number',
            text: numbers?.first ? normaliseLandTitleNumbers(title.titleNumber) : '',
            node: numbers?.first ? (
              <span>
                <span className="text-gray-700">{numbers.first}</span>
                {numbers.rest > 0 && (
                  <span className="ml-1 rounded bg-gray-100 px-1 text-xs text-gray-600">
                    +{numbers.rest}
                  </span>
                )}
              </span>
            ) : null,
          },
        ]
      : [
          {
            key: 'number',
            text: text(title.titleNumber),
            node: <span className="text-gray-700">{text(title.titleNumber)}</span>,
          },
          {
            key: 'book',
            text:
              land && has(title.bookNumber)
                ? t('titleSection.cell.book', { n: title.bookNumber })
                : '',
          },
          {
            key: 'page',
            text:
              land && has(title.pageNumber)
                ? t('titleSection.cell.page', { n: title.pageNumber })
                : '',
          },
        ]
  )
    .filter(part => part.text)
    .map(part => ({ ...part, node: part.node ?? part.text }));
  const deedLine = subParts.map(part => part.text).join(' · ');
  const showDeed = hasDeed && (condo || !!title.titleType || subParts.length > 0);
  const positions = positionEntries(title);
  const buildingTypeName = useParameterDescription('BuildingType', title.buildingType);
  const detailParts: DetailPart[] = [];
  const addDetail = (value: unknown, label?: string, text?: string) => {
    if (has(value))
      detailParts.push({ label, value: text ?? String(value), text: text ?? String(value) });
  };
  if (family === 'condo') {
    addDetail(title.condoName, t('titleDetails.condo'));
    addDetail(title.roomNumber, undefined, t('titleDetails.room', { n: title.roomNumber }));
    addDetail(title.floorNumber, undefined, t('titleDetails.floor', { n: title.floorNumber }));
  } else if (family === 'building') {
    addDetail(title.buildingType, undefined, buildingTypeName);
    addDetail(title.numberOfBuilding, t('titleSection.cell.buildings'));
  } else {
    for (const [name, value] of positions) addDetail(value, t(POSITION_KEYS[name]));
  }

  const totalWa = totalSquareWa(title);

  // The names are saved with the address; the master is only searched for one that has none.
  const saved = title.titleAddress;
  const needsLookup = !!saved?.subDistrict && (!saved.districtName || !saved.provinceName);
  // Only a row that is waiting on the master follows it, so one that loads late fills the "—" in.
  useAddressStore(state => (needsLookup ? state.titleAddresses : null));
  const lookup = needsLookup
    ? findAddressBySubDistrictCode(saved.subDistrict!, 'title')
    : undefined;
  const district = saved?.districtName || lookup?.districtName || '';
  const province = saved?.provinceName || lookup?.provinceName || '';

  return (
    <>
      <td className={TD}>
        {title.collateralType ? (
          <TypeName code={title.collateralType} />
        ) : (
          <span className="italic text-gray-400">{t('empty.noCollateralType')}</span>
        )}
      </td>
      <td className={TD}>
        {showDeed ? (
          <>
            <span
              className={clsx('block truncate font-medium', !deedName && 'text-gray-400')}
              title={deedName || undefined}
            >
              {deedName || '—'}
            </span>
            {/* The sub-line (cut with an ellipsis, all of it on hover); a dash when it has no part. */}
            <span className="block truncate text-xs text-gray-500" title={deedLine || undefined}>
              {subParts.length ? (
                subParts.map((part, i) => (
                  <span key={part.key}>
                    {i > 0 && ' · '}
                    {part.node}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </span>
          </>
        ) : (
          <Dash />
        )}
      </td>
      <td className={TD}>
        <DetailLine parts={detailParts} />
      </td>
      <td className={clsx(TD, 'text-right')}>
        {land ? (
          <>
            <b className="font-semibold text-gray-900">
              {t('titleSection.cell.areaRai', { rnw: formatRaiNganWa(totalWa) })}
            </b>
            <Sub>{t('titleSection.cell.areaWa', { wa: formatNumber(totalWa, 2) })}</Sub>
          </>
        ) : family === 'condo' || family === 'building' ? (
          has(title.usableArea) ? (
            <>
              <b className="font-semibold text-gray-900">
                {t('titleSection.cell.areaSqm', { area: title.usableArea })}
              </b>
              <Sub>{t('titleSection.cell.usableArea')}</Sub>
            </>
          ) : (
            <Dash />
          )
        ) : (
          <Dash />
        )}
      </td>
      <td
        className={clsx(TD, 'truncate')}
        title={has(title.ownerName) ? title.ownerName : undefined}
      >
        {has(title.ownerName) ? title.ownerName : <Dash />}
      </td>
      <td
        className={clsx(TD, 'truncate')}
        title={province || district ? `${district} ${province}`.trim() : undefined}
      >
        {province || district ? (
          <>
            {district}
            <Sub>
              <span className="block truncate">{province}</span>
            </Sub>
          </>
        ) : (
          <Dash />
        )}
      </td>
    </>
  );
}

function MovableCells({ title }: { title: RequestTitleDtoType }) {
  const { t } = useTranslation('request');
  const family = titleFamily(title.collateralType);

  const vehicleTypeName = useParameterDescription('VehicleType', title.vehicleType);
  const machineTypeName = useParameterDescription('MachineType', title.machineType);
  const vesselTypeName = useParameterDescription('VesselType', title.vesselType);

  let identity: ReactNode = <Dash />;
  let sub: ReactNode = null;
  const details: DetailPart[] = [];

  if (family === 'vehicle') {
    const plate = title.licensePlateNumber || title.vehicleRegistrationNumber;
    identity = has(plate) ? plate : <Dash />;
    if (has(title.licensePlateNumber) && has(title.vehicleRegistrationNumber))
      sub = t('titleSection.cell.registrationBook', { value: title.vehicleRegistrationNumber });
    if (has(title.vehicleType))
      details.push({
        label: t('titleDetails.vehicleType'),
        value: vehicleTypeName,
        text: vehicleTypeName,
      });
    if (has(title.vin))
      details.push({ label: t('titleSection.cell.chassis'), value: title.vin, text: title.vin });
  } else if (family === 'machine') {
    identity = title.registrationStatus ? (
      has(title.registrationNumber) ? (
        title.registrationNumber
      ) : (
        <Dash />
      )
    ) : (
      t('titleSection.cell.unregistered')
    );
    if (has(title.installationStatus))
      sub = <ParameterDisplay group="MachineStatus" code={title.installationStatus} />;
    if (has(title.machineType))
      details.push({
        label: t('titleDetails.machineType'),
        value: machineTypeName,
        text: machineTypeName,
      });
    if (has(title.numberOfMachine) && Number(title.numberOfMachine) > 0)
      details.push({
        label: t('titleDetails.qty'),
        value: title.numberOfMachine,
        text: String(title.numberOfMachine),
      });
  } else if (family === 'vessel') {
    identity = has(title.vesselRegistrationNumber) ? title.vesselRegistrationNumber : <Dash />;
    if (has(title.hin)) sub = t('titleSection.cell.hull', { value: title.hin });
    if (has(title.vesselType))
      details.push({
        label: t('titleSection.cell.vesselType'),
        value: vesselTypeName,
        text: vesselTypeName,
      });
  }

  return (
    <>
      <td className={TD}>
        <TypeName code={title.collateralType} />
      </td>
      <td className={TD}>
        <span className="font-medium text-gray-900">{identity}</span>
        {sub && <Sub>{sub}</Sub>}
      </td>
      <td className={TD}>
        <DetailLine parts={details} />
      </td>
    </>
  );
}

/**
 * One title row. Memoised on the title's content: while the editor is open every keystroke
 * re-renders the list, and with a hundred rows only the one being typed in should redo its cells.
 */
const TitleRow = memo(
  function TitleRow(props: RowProps) {
    const {
      kind,
      index,
      rank,
      title,
      missingCount,
      readOnly,
      showHandle,
      dragOff,
      orderLocked,
      firstInGroup,
      lastInGroup,
      canOrder,
      collapsed,
      actions,
    } = props;
    const { t } = useTranslation('request');
    const incomplete = missingCount > 0;

    // The cells are one element kept across renders. SortableRow re-renders whenever the sortable
    // context does (any render of the table gives it a new value) and calls its children again; a
    // fresh element each time would redo every cell of every row. This one only changes with what
    // the row shows, which `sig` stands for: the title's fields.
    const cells = useMemo(
      () => (
        <>
          {kind === 'estate' ? <EstateCells title={title} /> : <MovableCells title={title} />}
          <StatusCells missingCount={missingCount} missingText={props.missingText} />
          {!readOnly && (
            <td className={clsx(TD, STICKY_END)}>
              <RowButtons
                index={index}
                readOnly={readOnly}
                canOrder={canOrder}
                collapsed={collapsed}
                firstInGroup={firstInGroup}
                lastInGroup={lastInGroup}
                orderLocked={orderLocked}
                actions={actions}
              />
            </td>
          )}
        </>
      ),
      // `title` and `props.missingText` are covered by `sig` and `missingCount` / the text itself.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        kind,
        props.sig,
        props.missingText,
        missingCount,
        readOnly,
        index,
        canOrder,
        collapsed,
        firstInGroup,
        lastInGroup,
        orderLocked,
        actions,
      ],
    );

    return (
      <SortableRow
        id={String(index)}
        disabled={!canOrder || dragOff || orderLocked}
        tabIndex={0}
        onClick={() => actions.open(index)}
        onKeyDown={event => {
          if (event.target === event.currentTarget && event.key === 'Enter') actions.open(index);
        }}
        data-title-row={index}
        className={clsx(
          'cursor-pointer outline-none focus-visible:bg-primary/5',
          // Opaque, so the pinned actions cell (which takes the row's colour) hides what scrolls
          // under it: amber-50 at 70% mixed onto white, the colour the translucent tint made.
          incomplete
            ? 'bg-[color-mix(in_oklab,var(--color-amber-50)_70%,white)] hover:bg-amber-50'
            : 'bg-white hover:bg-gray-50',
        )}
      >
        {handle => (
          <>
            <td
              className={clsx(
                TD,
                // The number is centred in the cell; the handle sits at its left edge.
                'relative px-1 text-center',
                incomplete && 'shadow-[inset_3px_0_0_#f59e0b]',
              )}
            >
              <div>
                {showHandle && (
                  <button
                    {...handle}
                    type="button"
                    data-handle={index}
                    disabled={dragOff || orderLocked}
                    onClick={event => event.stopPropagation()}
                    title={
                      orderLocked
                        ? t('carryForward.toasts.waitForUploads')
                        : dragOff
                          ? t('titleSection.dnd.blocked')
                          : t('titleSection.dnd.handle')
                    }
                    aria-label={t('titleSection.dnd.handle')}
                    className="absolute left-1.5 top-1/2 flex size-6 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                  >
                    <Icon style="solid" name="grip-vertical" className="size-3.5" />
                  </button>
                )}
                <span className="tabular-nums text-gray-400">{rank}</span>
              </div>
            </td>
            {cells}
          </>
        )}
      </SortableRow>
    );
  },
  (a, b) =>
    a.sig === b.sig &&
    a.index === b.index &&
    a.rank === b.rank &&
    a.kind === b.kind &&
    a.missingCount === b.missingCount &&
    a.missingText === b.missingText &&
    a.readOnly === b.readOnly &&
    a.showHandle === b.showHandle &&
    a.dragOff === b.dragOff &&
    a.orderLocked === b.orderLocked &&
    a.firstInGroup === b.firstInGroup &&
    a.lastInGroup === b.lastInGroup &&
    a.canOrder === b.canOrder &&
    a.collapsed === b.collapsed &&
    a.actions === b.actions,
);

// ---------------------------------------------------------------------------------------------

/** The root font size in px: the rem the table widths are written in. */
const rootPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 14;
/** Below these card widths the table would scroll sideways with its icons out, so they fold into the ⋮. */
const ESTATE_FULL_WIDTH = () => 60 * rootPx();
const MOVABLE_FULL_WIDTH = () => 48.5 * rootPx();

/**
 * The box around a card's title tables. It measures the card once, so both tables fold their
 * actions together: below the full width of the estate table (the wider one), or of the movable
 * one when there is no estate table.
 */
export function TitleTableGroup({
  hasEstate,
  className,
  children,
}: {
  hasEstate: boolean;
  className?: string;
  children: (collapsed: boolean) => ReactNode;
}) {
  const [ref, wide] = useCardIsWide(hasEstate ? ESTATE_FULL_WIDTH : MOVABLE_FULL_WIDTH);
  return (
    <div ref={ref} className={clsx('@container', className)}>
      {children(!wide)}
    </div>
  );
}

export const TitleTable = memo(function TitleTable({
  kind,
  collapsed: cardCollapsed,
  heading,
  rows,
  groupRows,
  titles,
  sigs,
  missing,
  readOnly,
  canOrder,
  dragOff,
  orderLocked,
  actions,
  onReorder,
  totals,
}: TitleTableProps) {
  const { t } = useTranslation(['request', 'common']);
  const labelOf = useMissingFieldLabel();
  const tableRef = useRef<HTMLTableElement>(null);

  const items = useMemo(() => rows.map(String), [rows]);

  // Each table counts its own titles from 1: the number shown, spoken and typed in "move to".
  const rankOf = useMemo(() => new Map(groupRows.map((index, i) => [index, i + 1])), [groupRows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over, activatorEvent }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to = Number(over.id);
    onReorder(Number(active.id), to);
    // A keyboard drop puts the focus back on the moved title's handle.
    if (activatorEvent instanceof KeyboardEvent)
      requestAnimationFrame(() =>
        tableRef.current?.querySelector<HTMLElement>(`[data-handle="${to}"]`)?.focus(),
      );
  };

  // Spoken while dragging, in the page's language; the position is the row's number in this table.
  const pos = (id: string | number) => rankOf.get(Number(id)) ?? Number(id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('titleSection.dnd.pickedUp', { pos: pos(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? t('titleSection.dnd.movedTo', { pos: pos(active.id), to: pos(over.id) }) : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('titleSection.dnd.dropped', { pos: pos(active.id), to: pos(over.id) })
        : t('titleSection.dnd.cancelled', { pos: pos(active.id) }),
    onDragCancel: ({ active }) => t('titleSection.dnd.cancelled', { pos: pos(active.id) }),
  };

  const showHandle = canOrder;
  const firstOfGroup = groupRows[0];
  const lastOfGroup = groupRows[groupRows.length - 1];
  const estate = kind === 'estate';
  // With the three icons gone the actions column is 2.6rem instead of 6.9rem, so the table can be
  // narrower (50rem, the other columns give up the rest).
  const collapsed = !readOnly && cardCollapsed;

  // The table is fixed-layout so a long holder or place name is cut with an ellipsis (its full
  // text on hover) instead of widening the table past its box. Widths are in rem so they follow the
  // root size (15 px from 1920 px wide): handle + number, type, deed, [position], area,
  // holder, place, status, actions. The estate's position column and the
  // movable's details column take whatever is left; the table's minimum width (about a 1280 px
  // screen's card) keeps the rest legible, and a narrower card scrolls with the actions pinned.
  const widths = estate
    ? ['3.8rem', undefined, undefined, undefined, undefined, undefined, undefined, STATUS_WIDTH]
    : ['3.8rem', '10rem', '12.15rem', undefined, STATUS_WIDTH];
  if (!readOnly) widths.push(collapsed ? '2.6rem' : '6.9rem');
  // Type, deed, holder and place are shares of the table, so they grow with it. From a 1400 px
  // screen (a card of about 848 px) they are trimmed so the whole table fits the card without
  // scrolling (the position column keeps its width); from 1700 px the shares grow back and the type
  // gets room for "land with building" on two lines.
  const shares = estate
    ? [
        undefined,
        'w-[5.8rem] @min-[70rem]:w-[9.7rem]',
        'w-[17.5%] min-[1400px]:w-[16%]',
        undefined,
        // Type and area get what their one-line text needs ("ที่ดินพร้อมสิ่งปลูกสร้าง", "33.00 ตร.ว. ·
        // อาคาร 30 ตร.ม.") once the card is 70rem wide: the position column, which takes what is
        // left, still has about 6rem then. Measured on the card, not the screen, so a hidden side
        // panel counts.
        'w-[8rem] @min-[70rem]:w-[11.5rem]',
        'w-[12.5%] min-[1400px]:w-[12.5%] min-[1700px]:w-[14.5%]',
        'w-[8.5%] min-[1400px]:w-[9%] min-[1700px]:w-[10.5%]',
      ]
    : [];
  const cols = [
    ...(estate
      ? [
          t('titleSection.col.type'),
          t('titleSection.col.deed'),
          t('titleSection.col.position'),
          t('titleSection.col.area'),
          t('titleSection.col.owner'),
          t('titleSection.col.location'),
        ]
      : [
          t('titleSection.col.type'),
          t('titleSection.col.registration'),
          t('titleSection.col.details'),
        ]),
  ];

  return (
    <section aria-label={heading}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 pb-1.5 pt-3 text-sm font-semibold text-gray-600">
        {heading}
        <span className="text-xs font-normal text-gray-400">
          {t('forms.titleCount', { count: groupRows.length })}
        </span>
      </div>
      <div className="max-h-[60vh] overflow-auto border-y border-gray-200">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          // The card sits inside the page's own scroll area, and by default the OUTERMOST scrollable
          // ancestor wins: holding a row at the edge scrolled the page, never this table. Nearest
          // first scrolls the table, and the page only once the table has nothing left to scroll.
          autoScroll={{ order: TraversalOrder.ReversedTreeOrder }}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: t('titleSection.dnd.instructions') },
          }}
        >
          <table
            ref={tableRef}
            className={clsx(
              'w-full table-fixed border-separate border-spacing-0 text-table tabular-nums',
              estate
                ? collapsed
                  ? 'min-w-[54rem]'
                  : 'min-w-[60rem]'
                : collapsed
                  ? 'min-w-[44.2rem]'
                  : 'min-w-[48.5rem]',
            )}
          >
            <colgroup>
              {widths.map((width, i) => (
                <col key={i} className={shares[i]} style={width ? { width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={clsx(TH, 'px-1! text-center!')}>
                  <span>#</span>
                  <span className="sr-only">{t('titleSection.dnd.handle')}</span>
                </th>
                {cols.map((label, i) => (
                  <th key={label} className={clsx(TH, estate && i === 3 && 'text-right')}>
                    <HeadLabel label={label} />
                  </th>
                ))}
                <th className={clsx(TH, STATUS_PAD)}>{t('titleSection.col.status')}</th>
                {!readOnly && (
                  <th className={TH_CORNER}>
                    <span className="sr-only">{t('titleSection.col.actions')}</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {rows.map(index => {
                  const found = missing[index];
                  return (
                    <TitleRow
                      key={index}
                      kind={kind}
                      index={index}
                      rank={rankOf.get(index) ?? 0}
                      title={titles[index]}
                      sig={sigs[index]}
                      missingCount={found.length}
                      missingText={
                        found.length
                          ? t('titleSection.status.missingTooltip', {
                              fields: found
                                .map(path => labelOf(path, { movable: kind === 'movable' }))
                                .join(', '),
                            })
                          : ''
                      }
                      readOnly={readOnly}
                      showHandle={showHandle}
                      dragOff={dragOff}
                      orderLocked={orderLocked}
                      firstInGroup={index === firstOfGroup}
                      lastInGroup={index === lastOfGroup}
                      canOrder={canOrder}
                      collapsed={collapsed}
                      actions={actions}
                    />
                  );
                })}
              </SortableContext>
            </tbody>
            {totals && totals.parcels > 1 && (
              <tfoot>
                <tr>
                  <td
                    colSpan={4}
                    className="sticky bottom-0 z-[2] border-t border-gray-200 bg-gray-50 px-2 py-2 font-semibold"
                  >
                    {t('titleSection.total.parcels', { count: totals.parcels })}
                  </td>
                  <td className="sticky bottom-0 z-[2] border-t border-gray-200 bg-gray-50 px-2 py-2 text-right font-semibold">
                    {t('titleSection.cell.areaRai', { rnw: formatRaiNganWa(totals.totalWa) })}
                    <Sub>
                      {t('titleSection.cell.areaWa', { wa: formatNumber(totals.totalWa, 2) })}
                    </Sub>
                  </td>
                  <td
                    colSpan={readOnly ? 3 : 4}
                    className="sticky bottom-0 z-[2] border-t border-gray-200 bg-gray-50"
                  />
                </tr>
              </tfoot>
            )}
          </table>
        </DndContext>
      </div>
    </section>
  );
});
