import {
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { useHoverOverlay } from '@shared/hooks/useHoverOverlay';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { PropertyTypeChip } from '@features/appraisal/components/PropertyTypeChip';
import { useAppraisalId, useBasePath } from '@features/appraisal/context/AppraisalContext';
import { mapGroupItemToPropertyItem } from '@features/appraisal/hooks/useEnrichedPropertyGroups';
import { getPropertyHref } from '@features/appraisal/utils/propertyTypeConfig';
import { ServerDataCtx } from '@features/pricingAnalysis/store/selectionContext';

const STRIP_THUMBS = 8;

// `rawType` keeps the group item's own propertyType: the mapper falls back to 'Lands' when it is
// missing, which would link a typeless row to the land page instead of rendering it plain.
type RailItem = ReturnType<typeof mapGroupItemToPropertyItem> & { rawType?: string | null };

const Thumb = ({ item, size }: { item: RailItem; size: string }) => (
  <div
    className={clsx(
      size,
      'rounded-md bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center',
    )}
  >
    {item.image ? (
      // The mapper links the `large` rendition; a 36–40px thumbnail only needs `small`.
      <img
        src={item.image.replace('size=large', 'size=small')}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover"
      />
    ) : (
      <Icon name="image" className="text-gray-300 text-sm" />
    )}
  </div>
);

/**
 * The collapsed strip plus its hover panel. Owns the useHoverOverlay state so that pinning —
 * which unmounts this — discards it; the next collapse starts clean instead of inheriting a
 * `focused`/`hovered` flag whose element is gone.
 */
function PeekStrip({ strip, panel }: { strip: ReactNode; panel: ReactNode }) {
  const { open, hoverProps } = useHoverOverlay(true, 400);
  return (
    // The panel is a child of this wrapper, so leaving only counts once the pointer has left both
    // the strip and the panel. It opens beside the strip (left-full), never over it, so the
    // focused strip button stays visible (WCAG 2.4.11).
    <div className="relative w-[52px] shrink-0 border-r border-gray-200 bg-white" {...hoverProps}>
      {strip}
      {open && panel}
    </div>
  );
}

// Module-level so the choice survives the rail remounting — opening a method unmounts the whole
// accordion — but only for the appraisal it was made on.
let remembered: { appraisalId: string | undefined; collapsed: boolean } | null = null;

/**
 * Left rail beside the approach/method board — mock `.sideL.props` (mock:1038, content from
 * `propsHtml()` at mock:3323). Gives the board a fixed property reference instead of it floating
 * alone in its card. Reads `groupDetail` off `ServerDataCtx` and reuses `mapGroupItemToPropertyItem`
 * — same source and mapper as the group popover in PricingAnalysisPage's top bar — so this adds no
 * new fetch.
 *
 * Below 1440px it starts collapsed to a thumbnail strip; hovering/focusing the strip floats the
 * full list beside it, over the board (absolute, so the board never reflows). Open/close
 * behaviour is the app sidebar's (useHoverOverlay). A pin/expand click wins over the width rule
 * for the rest of this appraisal; another appraisal starts from the width rule again.
 */
export function PricingAnalysisPropertyRail() {
  const { t } = useTranslation('pricingAnalysis');
  const serverData = useContext(ServerDataCtx);
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const isNarrow = useMediaQuery('(max-width: 1439px)');
  // Read on every render, not only at mount: after in-app navigation the first render can still
  // see the previous appraisal's id. `remembered` is the only copy; the tick just re-renders.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const userCollapsed =
    remembered && remembered.appraisalId === appraisalId ? remembered.collapsed : null;
  // Pin/unpin swaps the whole root, so the toggle that had focus unmounts; the effect below
  // hands focus to the new root's toggle instead of letting it fall to <body>. Not after a mouse
  // press: script-focusing the strip button then could count as :focus-visible in some engines
  // and pop the panel open. Keyboard and screen-reader activation press no mouse pointer.
  const refocusToggle = useRef(false);
  const pressedBy = useRef<string | null>(null);
  const notePointer = (e: PointerEvent<HTMLButtonElement>) => {
    pressedBy.current = e.pointerType;
  };
  const pinButtonRef = useRef<HTMLButtonElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const setUserCollapsed = (value: boolean, e: MouseEvent<HTMLButtonElement>) => {
    remembered = { appraisalId, collapsed: value };
    // detail 0 = keyboard, whatever a stale press (one that never became a click) recorded.
    refocusToggle.current = e.detail === 0 || pressedBy.current !== 'mouse';
    pressedBy.current = null;
    rerender();
  };
  const collapsed = userCollapsed ?? isNarrow;
  useEffect(() => {
    if (!refocusToggle.current) return;
    refocusToggle.current = false;
    (collapsed ? expandButtonRef : pinButtonRef).current?.focus();
  }, [collapsed]);

  const items = useMemo(
    () =>
      (serverData?.groupDetail?.properties ?? [])
        .slice()
        .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
        .map(raw => ({ ...mapGroupItemToPropertyItem(raw), rawType: raw.propertyType })),
    [serverData?.groupDetail?.properties],
  );

  const groupDetail = serverData?.groupDetail;
  const flat = serverData?.flatContext;
  // Project-model subjects have no groupDetail — flatContext carries the model's name instead.
  if (!groupDetail && !flat) return null;

  const title = groupDetail ? t('rail.title', { count: items.length }) : t('page.tabs.model');

  const body: ReactNode = !groupDetail ? (
    // mock:3326 shows a full model card here; that card (ModelCardContent) is built for the
    // 50%-wide accordion panel, not a 268px rail, so this is a compact name-only fallback.
    <p className="text-xs text-gray-700 truncate">
      {flat?.projectName ? String(flat.projectName) : 'Project'}
      {' › '}
      {flat?.modelName ? String(flat.modelName) : 'Model'}
    </p>
  ) : items.length === 0 ? (
    <p className="py-3 text-xs text-gray-400">{t('accordion.noProperties')}</p>
  ) : (
    items.map(p => {
      // Opens in a new tab, same as BuildingCostTable's property link — leaving this page would
      // drop any unsaved pricing edits. No route (missing type/id) degrades to a plain row.
      const href = getPropertyHref(basePath, p.rawType, p.id);
      const row = (
        <>
          <Thumb item={p} size="w-10 h-10" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[12px] font-medium text-gray-900">
              <span className="truncate">{p.titleNo || p.address}</span>
              {href && (
                <Icon
                  name="arrow-up-right-from-square"
                  className="size-2.5 shrink-0 text-gray-300 group-hover/prop:text-primary"
                />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-gray-400">
              <PropertyTypeChip code={p.type} />
              <span className="truncate">{p.area}</span>
            </div>
            <div className="mt-0.5 text-[10.5px] text-gray-400 truncate">{p.location}</div>
          </div>
        </>
      );
      const rowClass =
        'grid grid-cols-[40px_1fr] gap-2 py-[7px] px-1.5 -mx-1.5 rounded-md border-b border-gray-100 last:border-b-0';
      return href ? (
        <Link
          key={p.id}
          to={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${p.titleNo || p.address} — ${t('rail.openProperty')}`}
          className={clsx(rowClass, 'group/prop hover:bg-primary/5 focus-visible:bg-primary/5')}
        >
          {row}
        </Link>
      ) : (
        <div key={p.id} className={rowClass}>
          {row}
        </div>
      );
    })
  );

  const header = (button: ReactNode) => (
    <div className="flex items-center gap-1 mt-2.5 mb-1">
      <h5 className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-400 truncate">
        {title}
      </h5>
      {button}
    </div>
  );

  const buttonClass = 'size-6 shrink-0 flex items-center justify-center rounded hover:bg-gray-100';

  // Same pin affordance as the app sidebar (shared/components/SidebarHeader): solid + primary
  // while pinned, regular + tilted grey while not; clicking toggles. The label names the toggle,
  // not the action, so it reads right alongside aria-pressed.
  const pinButton = (pinned: boolean) => (
    <button
      ref={pinButtonRef}
      type="button"
      onPointerDown={notePointer}
      onClick={e => setUserCollapsed(pinned, e)}
      title={t('rail.pin')}
      aria-label={t('rail.pin')}
      aria-pressed={pinned}
      className={clsx(buttonClass, pinned ? 'text-primary' : 'text-gray-400 hover:text-gray-700')}
    >
      <Icon
        style={pinned ? 'solid' : 'regular'}
        name="thumbtack"
        className={clsx('size-3 transition-transform', !pinned && 'rotate-45')}
      />
    </button>
  );

  if (!collapsed) {
    return (
      <aside className="w-[268px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white px-3 pt-1 pb-4">
        {header(pinButton(true))}
        {body}
      </aside>
    );
  }

  return (
    <PeekStrip
      strip={
        <div className="h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center gap-2 pt-2 pb-4">
          <button
            type="button"
            onPointerDown={notePointer}
            onClick={e => setUserCollapsed(false, e)}
            ref={expandButtonRef}
            title={t('rail.expand')}
            aria-label={t('rail.expand')}
            className={clsx(buttonClass, 'text-gray-400 hover:text-gray-700')}
          >
            <Icon name="angles-right" className="size-3" />
          </button>
          {groupDetail && (
            <>
              <span className="text-[10px] font-semibold text-gray-400">{items.length}</span>
              {/* Capped: past this the strip would scroll with no visible scrollbar and push the
                  label out of view; the panel lists everything. */}
              {items.slice(0, STRIP_THUMBS).map(p => (
                <Thumb key={p.id} item={p} size="w-9 h-9" />
              ))}
              {items.length > STRIP_THUMBS && (
                <span className="text-[10px] font-semibold text-gray-400">
                  +{items.length - STRIP_THUMBS}
                </span>
              )}
            </>
          )}
          <span className="mt-1 text-[10.5px] text-gray-400 tracking-[0.02em] [writing-mode:vertical-rl]">
            {groupDetail ? t('rail.label') : t('page.tabs.model')}
          </span>
        </div>
      }
      panel={
        <div
          role="region"
          aria-label={title}
          className="absolute inset-y-0 left-full z-30 w-[268px] overflow-y-auto bg-white border-r border-gray-200 shadow-[8px_0_24px_-8px_rgba(15,23,42,0.18)] px-3 pt-1 pb-4"
        >
          {header(pinButton(false))}
          {body}
        </div>
      }
    />
  );
}
