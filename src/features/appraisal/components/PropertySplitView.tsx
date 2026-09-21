import { Fragment, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import type { PropertyGroup, PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { PropertyRowActionsMenu } from './PropertyRowActionsMenu';
import PropertyTypeDropdown from './PropertyTypeDropdown';
import { GroupPricingButton } from './GroupPricingButton';
import { GroupActionsMenu } from './GroupActionsMenu';
import { useGroupRename } from '../hooks/useGroupRename';
import type { MachinerySummaryStatus } from '../hooks/useMachinerySummaryStatus';
import { BUILDING_TYPES, MACHINE_TYPES, PlaceValue, PropertyFlag } from './PropertyCardContent';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { getRouteSegment as getRouteSegmentFromConfig } from '../utils/propertyTypeConfig';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';
import { getTypeDotColor } from '../utils/propertyTypeConfig';

const getRouteSegment = (type: string): string => getRouteSegmentFromConfig(type) ?? 'land';

interface RailRowProps {
  item: PropertyItem;
  groupId: string;
  active: boolean;
  readOnly: boolean;
  onSelect: (propertyId: string) => void;
  onOpen: (item: PropertyItem, groupId: string) => void;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

/**
 * A property in the rail: click to preview, double-click to edit, drag to reorder.
 *
 * The whole row is the drag handle — at this width a grip column would cost a tenth of the
 * rail and leave the name nowhere to go. The pointer sensor only starts a drag after 5px of
 * movement, so a click stays a click.
 */
const RailRow = ({
  item,
  groupId,
  active,
  readOnly,
  onSelect,
  onOpen,
  onContextMenu,
}: RailRowProps) => {
  const { t } = useTranslation('appraisal');
  const sortableData = useMemo(
    () => ({ type: 'property' as const, property: item, groupId }),
    [item, groupId],
  );
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: sortableData,
    disabled: readOnly,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(item.id)}
      onDoubleClick={() => onOpen(item, groupId)}
      onContextMenu={e => {
        if (readOnly) return;
        onContextMenu(e, item, groupId);
      }}
      title={t('properties.splitView.rowHint')}
      {...(!readOnly ? attributes : {})}
      {...(!readOnly ? listeners : {})}
      className={clsx(
        'flex w-full items-center gap-2 border-l-[3px] py-1.5 pl-3 pr-2 text-left transition-colors',
        isDragging && 'opacity-50',
        active
          ? 'border-primary bg-primary-100 font-semibold text-primary-800'
          : 'border-transparent text-gray-600 hover:bg-gray-50',
      )}
    >
      <i className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', getTypeDotColor(item.type))} />
      <span className="truncate text-xs">{item.address}</span>
      {(item.isPriceCertified === false || (item.conditionUse && item.conditionUse !== '01')) && (
        <Icon
          name="triangle-exclamation"
          className="ml-auto shrink-0 text-[9px] text-warning"
          style="solid"
        />
      )}
    </button>
  );
};

interface RailGroupHeaderProps {
  group: PropertyGroup;
  canEdit: boolean;
  isDeleting: boolean;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onGoToPricingAnalysis: (groupId: string) => void;
}

/**
 * The group's row in the rail: name, count, price, and the same two actions the group header
 * offers. Renaming happens in place here too — walking back to the list view to change a name
 * would undo the point of a view that keeps everything on one screen.
 */
const RailGroupHeader = ({
  group,
  canEdit,
  isDeleting,
  onRenameGroup,
  onDeleteGroup,
  onGoToPricingAnalysis,
}: RailGroupHeaderProps) => {
  const { t } = useTranslation('appraisal');
  const rename = useGroupRename(group.id, group.name, onRenameGroup);

  return (
    <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-1.5">
      {rename.isEditing && canEdit ? (
        <input
          ref={rename.inputRef}
          value={rename.value}
          onChange={e => rename.setValue(e.target.value)}
          onBlur={rename.commit}
          onKeyDown={rename.onKeyDown}
          className="min-w-0 flex-1 rounded border border-primary bg-white px-1 py-0.5 text-[11px] font-semibold text-gray-900 outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <>
          {/* A button, not a span with a click handler: renaming has to be reachable from the
              keyboard, and the browser gives that away for free on the right element. */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={rename.start}
            title={canEdit ? t('properties.renameHint') : undefined}
            className={clsx(
              'min-w-0 truncate text-left text-[11px] font-semibold text-gray-600',
              canEdit && 'cursor-pointer hover:text-primary',
            )}
          >
            {group.name}
          </button>
          <span className="text-[10px] text-gray-400 tabular-nums">{group.items.length}</span>
        </>
      )}

      <GroupPricingButton
        group={group}
        onGoToPricingAnalysis={onGoToPricingAnalysis}
        variant="compact"
        className="ml-auto"
      />

      {canEdit && (
        <GroupActionsMenu
          onRename={rename.start}
          onDelete={() => onDeleteGroup(group.id)}
          isDeleting={isDeleting}
          iconClassName="text-[10px]"
        />
      )}
    </div>
  );
};

interface PropertySplitViewProps {
  groups: PropertyGroup[];
  selectedId: string | null;
  onSelect: (propertyId: string) => void;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  onShowOnMap: (propertyId: string) => void;
  onGoToPricingAnalysis: (groupId: string) => void;
  /** Opens the shared property context menu at the pointer, same as the other views. */
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  /** The group currently being deleted, if any — its menu item shows a spinner. */
  deletingGroupId?: string | null;
  hasClipboard: boolean;
  /**
   * A property editor to show instead of the preview. It is the routed page itself, rendered
   * here rather than over the whole screen, so the list on the left survives an edit.
   */
  editorSlot?: ReactNode;
  /** Present when the appraisal holds machinery: the summary as a pinned entry atop the rail. */
  machinerySummary?: { status: MachinerySummaryStatus | null; onOpen: () => void };
}

/**
 * List on the left, one property's detail on the right.
 *
 * The only layout here whose height does not grow with the appraisal: the list scrolls inside its
 * own panel, so an appraisal with 25 properties takes exactly as much of the page as one with 3.
 * The right panel is a preview, not the editor — "Open editor" still goes to the real form, so
 * nothing about saving or validation moves into this screen.
 *
 * Rows drag to reorder, and across groups, through the same handlers the other views use — the
 * rail is the only place that shows every property in the appraisal at once, which makes it the
 * easiest place to put one in front of another.
 */
export const PropertySplitView = ({
  groups,
  selectedId,
  onSelect,
  onEdit,
  onMoveTo,
  onCopy,
  onPaste,
  onDelete,
  onShowOnMap,
  onGoToPricingAnalysis,
  onContextMenu,
  onRenameGroup,
  onDeleteGroup,
  deletingGroupId,
  hasClipboard,
  editorSlot,
  machinerySummary,
}: PropertySplitViewProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const layoutBasePath = useBasePath();
  const propertyBasePath = usePropertyBasePath();
  const isPma = propertyBasePath === 'property-pma';

  const flat = useMemo(
    () => groups.flatMap(group => group.items.map(item => ({ item, group }))),
    [groups],
  );

  /**
   * Which property the open form is actually about, read off the URL.
   *
   * The highlight used to follow `selectedId` alone, so opening "add property" left it sitting on
   * whichever row happened to be selected — the rail claimed to be showing one property while the
   * form beside it was a blank new one. A new property has no row yet, so nothing is highlighted
   * until it has been saved and the list has caught up.
   */
  const { pathname } = useLocation();
  const editingId = useMemo(() => {
    if (!editorSlot) return null;
    const match = pathname.match(/\/property(?:-pma)?\/[^/]+\/([^/?]+)/);
    const id = match?.[1];
    return !id || id === 'new' ? null : id;
  }, [editorSlot, pathname]);

  const selected = useMemo(
    () => flat.find(entry => entry.item.id === selectedId) ?? flat[0],
    [flat, selectedId],
  );

  /**
   * Follow a property into the list once, when the form that created or opened it says so.
   *
   * The "once" is the whole point: comparing against `selectedId` instead meant the rule fired
   * again on the way out. Clicking another row sets the selection and closes the form in the same
   * click, and in the render between those two the form was still open — so the rule saw a
   * mismatch and dragged the selection straight back to the property being edited.
   */
  const followedEditingId = useRef<string | null>(null);
  useEffect(() => {
    if (!editingId) {
      followedEditingId.current = null;
      return;
    }
    if (flat.some(e => e.item.id === editingId)) {
      if (editingId !== followedEditingId.current) {
        followedEditingId.current = editingId;
        onSelect(editingId);
      }
      return;
    }
    // The property was in the list a moment ago and is not any more — deleted from under the
    // form. The form would sit on its spinner forever waiting for a record the API no longer
    // has, so close it. A property that was never in the list is a form that has just been
    // saved and a list that has yet to catch up; that one is left alone.
    if (followedEditingId.current === editingId) {
      followedEditingId.current = null;
      navigate(`${layoutBasePath}/${propertyBasePath}?tab=properties`, { replace: true });
    }
  }, [flat, onSelect, editingId, navigate, layoutBasePath, propertyBasePath]);

  // Keep the selection pointing at something real — properties get deleted and moved while this
  // view is open, and a stale id would leave the right panel showing the wrong property.
  useEffect(() => {
    if (flat.length === 0) return;
    if (!flat.some(entry => entry.item.id === selectedId)) onSelect(flat[0].item.id);
  }, [flat, selectedId, onSelect]);

  const property = selected?.item;
  const group = selected?.group;

  const openEditorFor = (target: PropertyItem, groupId: string) => {
    if (!appraisalId) return;
    navigate(
      `${layoutBasePath}/${propertyBasePath}/${getRouteSegment(target.type)}/${target.id}?groupId=${groupId}`,
    );
  };

  /**
   * One click always lands on the summary, even with a form open: picking a row is browsing, and
   * dropping straight into someone else's form is a heavier move than a single click should
   * make. Opening the form is the deliberate act — double-click, or the button on the summary.
   */
  const selectRow = (item: PropertyItem) => {
    onSelect(item.id);
    if (editorSlot) navigate(`${layoutBasePath}/${propertyBasePath}?tab=properties`);
  };

  const openEditor = () => {
    if (!property || !group) return;
    openEditorFor(property, group.id);
  };

  const field = (label: string, value: ReactNode, muted = false) => (
    <div className="border-t border-gray-100 pt-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className={clsx('text-[13px] mt-0.5', muted ? 'italic text-gray-400' : 'text-gray-800')}>
        {value}
      </div>
    </div>
  );

  const coords =
    property && property.latitude != null && property.longitude != null
      ? `${property.latitude.toFixed(6)}, ${property.longitude.toFixed(6)}`
      : null;

  return (
    <div className="flex h-full min-h-0 border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Left: every property in the appraisal, grouped */}
      <div className="w-56 shrink-0 border-r border-gray-200 overflow-y-auto">
        {/* The summary belongs to the whole appraisal, so it sits above every group rather than
            inside one. Amber dot while something is still to do, a tick once it is in order. */}
        {machinerySummary && (
          <button
            type="button"
            onClick={machinerySummary.onOpen}
            className={clsx(
              'flex w-full items-center gap-2 border-b border-l-[3px] border-b-gray-200 px-3 py-2 text-left transition-colors',
              pathname.endsWith('/machinery-summary')
                ? 'border-l-primary bg-primary-100'
                : 'border-l-transparent hover:bg-gray-50',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-700/10 text-amber-700">
              <Icon name="gears" style="solid" className="text-[11px]" />
            </span>
            <span className="truncate text-xs font-semibold text-gray-800">
              {t('properties.machinerySummary.title')}
            </span>
            {machinerySummary.status === 'done' ? (
              <Icon name="check" style="solid" className="ml-auto text-[10px] text-green-600" />
            ) : machinerySummary.status ? (
              <span
                className="ml-auto size-2 shrink-0 rounded-full bg-amber-500"
                title={t(`properties.machinerySummary.status.${machinerySummary.status}`)}
              />
            ) : null}
          </button>
        )}
        {groups.map(g => (
          <div key={g.id}>
            <RailGroupHeader
              group={g}
              canEdit={!readOnly && !isPma}
              isDeleting={deletingGroupId === g.id}
              onRenameGroup={onRenameGroup}
              onDeleteGroup={onDeleteGroup}
              onGoToPricingAnalysis={onGoToPricingAnalysis}
            />
            <SortableContext items={g.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {g.items.map(item => (
                <RailRow
                  key={item.id}
                  item={item}
                  groupId={g.id}
                  active={editorSlot ? item.id === editingId : item.id === property?.id}
                  readOnly={readOnly}
                  onSelect={() => selectRow(item)}
                  onOpen={openEditorFor}
                  onContextMenu={(e, p, gid) => {
                    onSelect(p.id);
                    onContextMenu(e, p, gid);
                  }}
                />
              ))}
            </SortableContext>
            {/* One button, not the quick-add row the other views get: the rail is about 13rem
                wide, so four type chips wrap into four lines and push the next group off the
                screen. The picker itself opens over the panel at full size. */}
            {!readOnly && (
              <PropertyTypeDropdown
                groupId={g.id}
                className="block px-2 py-1"
                buttonClassName="w-full justify-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-500 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-800"
              />
            )}
          </div>
        ))}
      </div>

      {/* Right: the editor if one is open, otherwise the selected property */}
      {editorSlot ? (
        <div className="flex-1 min-w-0 min-h-0 px-3 pt-3">
          {/* The editors are lazy route chunks. Without a boundary here the suspension would
              bubble to the layout's SuspenseOutlet and blank the whole screen — including the
              list this view exists to keep. */}
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Icon name="spinner" style="solid" className="animate-spin text-primary" />
              </div>
            }
          >
            {/* Keyed by the route, so every switch — another property, or the machinery summary —
                builds a fresh form.
                Without it React reuses the same component instance — only the URL param
                changed — and the new property inherits the last one's open tab and scroll
                position, landing mid-form instead of at the top. */}
            <Fragment key={pathname}>{editorSlot}</Fragment>
          </Suspense>
        </div>
      ) : property && group ? (
        <div className="flex-1 min-w-0 overflow-y-auto p-4">
          <div>
            <div className="flex items-start gap-4">
              <div className="relative w-64 h-40 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                {property.image ? (
                  <img
                    src={property.image}
                    alt={property.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="image" className="text-gray-400 text-3xl" />
                  </div>
                )}
                {property.latitude != null && property.longitude != null && (
                  <button
                    type="button"
                    onClick={() => onShowOnMap(property.id)}
                    title={t('properties.map.pinView')}
                    className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm hover:shadow-md hover:scale-110 transition-all"
                  >
                    <Icon
                      name="location-dot"
                      className="text-green-500 text-[10px]"
                      style="solid"
                    />
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h3 className="text-base font-bold text-gray-900 truncate">{property.address}</h3>
                  <PropertyRowActionsMenu
                    className="ml-auto shrink-0"
                    property={property}
                    groupId={group.id}
                    onEdit={onEdit}
                    onMoveTo={onMoveTo}
                    onCopy={onCopy}
                    onPaste={onPaste}
                    onDelete={onDelete}
                    hasClipboard={hasClipboard}
                  />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <i className={clsx('w-2 h-2 rounded-full', getTypeDotColor(property.type))} />
                  <ParameterDisplay
                    group="PropertyType"
                    code={property.type}
                    fallback={property.type}
                  />
                </span>

                <div className="flex flex-wrap gap-1 mt-2">
                  {property.conditionUse && property.conditionUse !== '01' && (
                    <PropertyFlag
                      icon={property.conditionUse === '03' ? 'magnifying-glass' : 'circle-pause'}
                    >
                      <ParameterDisplay
                        group="ConditionUse"
                        code={property.conditionUse}
                        fallback={property.conditionUse}
                      />
                    </PropertyFlag>
                  )}
                  {property.isPriceCertified === false && (
                    <PropertyFlag icon="triangle-exclamation">
                      {t('properties.machineryChips.notPriceCertified')}
                    </PropertyFlag>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openEditor}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  {t('properties.splitView.openEditor')}
                  <Icon name="chevron-right" className="text-[10px]" style="solid" />
                </button>
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-2 mt-5 grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
              {MACHINE_TYPES.has(property.type) ? (
                <>
                  {field(
                    t('properties.stackColumns.machine'),
                    [property.brand, property.model].filter(Boolean).join(' ') || '—',
                  )}
                  {field(
                    t('properties.stackColumns.registrationNumber'),
                    property.registrationNumber ?? t('properties.machineryChips.unregistered'),
                    !property.registrationNumber,
                  )}
                  {field(
                    t('properties.stackColumns.registrationStatus'),
                    property.registrationStatus
                      ? t('properties.machineryChips.registered')
                      : t('properties.machineryChips.unregistered'),
                  )}
                  {/* Brand and model already head this panel, so the fourth slot goes to
                      where the machine actually stands — which the panel never showed. */}
                  {field(
                    t('properties.table.location'),
                    property.location && property.location !== '-'
                      ? property.location
                      : t('properties.notSet'),
                    !property.location || property.location === '-',
                  )}
                </>
              ) : (
                <>
                  {field(
                    t('properties.table.area'),
                    property.areaValue == null ? (
                      '—'
                    ) : (
                      <span className="tabular-nums">
                        {property.areaUnit === 'wa'
                          ? `${toRaiNganWa(property.areaValue)} ${t('properties.units.raiNganWa')}`
                          : `${formatAreaNumber(property.areaValue)} ${t('properties.units.sqm')}`}
                      </span>
                    ),
                    property.areaValue == null,
                  )}
                  {BUILDING_TYPES.has(property.type)
                    ? field(
                        t('properties.table.buildingType'),
                        <PlaceValue property={property} />,
                        !property.buildingType && !property.numberOfFloors,
                      )
                    : field(
                        t('properties.table.location'),
                        property.location && property.location !== '-'
                          ? property.location
                          : t('properties.notSet'),
                        !property.location || property.location === '-',
                      )}
                  {field(
                    t('properties.table.coordinates'),
                    coords ? (
                      <span className="tabular-nums">{coords}</span>
                    ) : (
                      t('properties.coordsNotSet')
                    ),
                    !coords,
                  )}
                  {field(
                    t('properties.table.image'),
                    property.photos && property.photos.length > 0
                      ? t('properties.splitView.photoCount', { n: property.photos.length })
                      : t('properties.splitView.noPhotos'),
                    !property.photos || property.photos.length === 0,
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        // With no properties yet the rail still shows every group and its add button, so the
        // appraisal can be filled from here; this side only says where to start.
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          {flat.length === 0
            ? // Only point at the add button to someone who has it.
              t(readOnly ? 'properties.splitView.emptyReadOnly' : 'properties.splitView.emptyHint')
            : t('properties.splitView.selectHint')}
        </div>
      )}
    </div>
  );
};

export default PropertySplitView;
