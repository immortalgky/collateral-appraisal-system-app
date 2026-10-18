import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { KEYBOARD_RING, NO_OUTLINE, usePointerMode } from '@/shared/hooks/usePointerMode';
import { pickVisible } from './chipOverflow';
import Icon from '@/shared/components/Icon';
import type { SmartViewDto } from '../../api/appraisalSearch';

interface SmartViewBarProps {
  views: SmartViewDto[];
  activeViewKey: string | null;
  onSelect: (view: SmartViewDto) => void;
  /** "All jobs": leaves every quick view and drops the filters it set. */
  onSelectAll: () => void;
  /** Lit when nothing narrows the list — no view, no filter, no search. */
  isAllActive: boolean;
}

/**
 * Icon and colour per quick view. The colour carries the same meaning it does elsewhere in the
 * product — red for breached, amber for at-risk, gray for "nobody has it yet" — so the row can be
 * scanned without reading eight Thai labels.
 *
 * Only applied when the chip is inactive: an active chip is solid primary and its icon inherits
 * white, which has to stay legible.
 */
interface ViewStyle {
  icon: string;
  /** Icon colour on an unselected chip. */
  color: string;
  /** Whole chip when selected. A darker step than `color` where the lighter one cannot carry
   *  white text — amber in particular. */
  active: string;
  /** Border on hover while unselected. */
  hover: string;
}

// Whole class strings, not assembled at runtime: Tailwind scans source text, so `text-${hue}-500`
// never makes it into the stylesheet.
const viewStyles: Record<string, ViewStyle> = {
  'my-assignments': {
    icon: 'user',
    color: 'text-primary',
    active: 'bg-primary border-primary text-white',
    hover: 'hover:border-primary',
  },
  'my-requests': {
    icon: 'file-signature',
    color: 'text-cyan-600',
    active: 'bg-cyan-600 border-cyan-600 text-white',
    hover: 'hover:border-cyan-500',
  },
  'sla-at-risk': {
    icon: 'triangle-exclamation',
    color: 'text-rose-500',
    active: 'bg-rose-500 border-rose-500 text-white',
    hover: 'hover:border-rose-400',
  },
  'todays-appointments': {
    icon: 'calendar-day',
    color: 'text-blue-500',
    active: 'bg-blue-500 border-blue-500 text-white',
    hover: 'hover:border-blue-400',
  },
  unassigned: {
    icon: 'inbox',
    color: 'text-gray-400',
    active: 'bg-gray-500 border-gray-500 text-white',
    hover: 'hover:border-gray-400',
  },
  'high-priority-active': {
    icon: 'bolt',
    color: 'text-orange-500',
    active: 'bg-orange-500 border-orange-500 text-white',
    hover: 'hover:border-orange-400',
  },
  'nearing-deadline': {
    icon: 'clock',
    color: 'text-amber-500',
    active: 'bg-amber-600 border-amber-600 text-white',
    hover: 'hover:border-amber-400',
  },
  'external-assignments': {
    icon: 'building',
    color: 'text-indigo-500',
    active: 'bg-indigo-500 border-indigo-500 text-white',
    hover: 'hover:border-indigo-400',
  },
  'my-company-queue': {
    icon: 'briefcase',
    color: 'text-teal-600',
    active: 'bg-teal-600 border-teal-600 text-white',
    hover: 'hover:border-teal-500',
  },
};

const DEFAULT_VIEW_STYLE: ViewStyle = {
  icon: 'filter',
  color: 'text-gray-400',
  active: 'bg-primary border-primary text-white',
  hover: 'hover:border-primary',
};

/** The overflow chip's own width grows by a digit when the count does: room kept for that. */
const OVERFLOW_SLACK = 10;

const chipClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap';

function SmartViewBar({
  views,
  activeViewKey,
  onSelect,
  onSelectAll,
  isAllActive,
}: SmartViewBarProps) {
  const { t } = useTranslation('appraisal');
  // No early return on an empty `views`: "All jobs" is client-side and is the one-click way back
  // to the whole list, so it stays even when the views endpoint returns nothing or fails.

  // One line, always: the views that do not fit fold, from the end, into an "Others" chip. The
  // active view is never folded — an earlier one makes room instead — so the user always sees which
  // view is on. The measuring and folding are the filter bar's (chipOverflow.pickVisible and the
  // same ResizeObserver pattern); hidden chips stay laid out but invisible, so they can be measured.
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  // While the list is open the layout is frozen: a view picked from it becomes the active one and
  // must not shuffle the chips under the cursor before the menu has closed.
  const [menuOpen, setMenuOpen] = useState(false);
  const frozen = useRef(false);
  const { pointerMode, onPointerDownCapture } = usePointerMode();
  const rootRef = useRef<HTMLDivElement>(null);
  const labelEl = useRef<HTMLSpanElement>(null);
  const allEl = useRef<HTMLButtonElement>(null);
  const moreEl = useRef<HTMLDivElement>(null);
  const chipEls = useRef(new Map<string, HTMLElement>());

  const keysId = `${views.map(v => v.key).join('|')}#${activeViewKey ?? ''}`;

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root || frozen.current) return;
    const widthOf = (el: Element | null | undefined) =>
      el ? el.getBoundingClientRect().width || (el as HTMLElement).offsetWidth : 0;
    const keys = keysId.split('#')[0].split('|').filter(Boolean);
    const active = keysId.split('#')[1];
    const gap = parseFloat(getComputedStyle(root).columnGap) || 0;
    const visible = pickVisible({
      pinned: [widthOf(labelEl.current), widthOf(allEl.current)],
      added: keys.map(k => widthOf(chipEls.current.get(k))),
      forced: active ? keys.indexOf(active) : -1,
      available: root.clientWidth,
      safety: 1,
      overflowWidth: widthOf(moreEl.current) + OVERFLOW_SLACK,
      // There is no tail on this row: a negative width cancels the gap pickVisible adds for one.
      tailWidth: -gap,
      gap,
    });
    const next = keys.filter((_, i) => !visible[i]);
    setHiddenKeys(prev =>
      prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next,
    );
  }, [keysId]);

  useLayoutEffect(() => {
    frozen.current = menuOpen;
  });
  useLayoutEffect(measure);
  useEffect(() => {
    const els = [rootRef.current, labelEl.current, allEl.current, moreEl.current];
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    els.forEach(el => el && observer?.observe(el));
    chipEls.current.forEach(el => observer?.observe(el));
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.addEventListener?.('loadingdone', measure);
    void fonts?.ready?.then(measure);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener?.('loadingdone', measure);
    };
  }, [measure, keysId]);

  const hiddenViews = views.filter(v => hiddenKeys.includes(v.key) && v.key !== activeViewKey);

  const viewLabel = (view: SmartViewDto) =>
    t(`list.smartViews.${view.key}`, { defaultValue: view.name });
  const viewTitle = (view: SmartViewDto) =>
    // Like the name: the server's English text is only the fallback for an unknown key.
    t(`list.smartViewDescriptions.${view.key}`, { defaultValue: view.description });

  const chip = (view: SmartViewDto): ReactNode => {
    const style = viewStyles[view.key] ?? DEFAULT_VIEW_STYLE;
    const isActive = activeViewKey === view.key;
    const hidden = hiddenViews.some(h => h.key === view.key);
    return (
      <button
        key={view.key}
        ref={el => {
          if (el) chipEls.current.set(view.key, el);
          else chipEls.current.delete(view.key);
        }}
        onClick={() => onSelect(view)}
        title={viewTitle(view)}
        aria-pressed={isActive}
        // A folded chip stays laid out at its natural width (w-max) so it can be measured, but is
        // invisible: out of sight, of the tab order and of the accessibility tree.
        className={`${chipClass} ${
          isActive ? style.active : `bg-white text-gray-600 border-gray-200 ${style.hover}`
        } ${hidden ? 'invisible absolute left-0 top-0 w-max' : 'shrink-0'}`}
      >
        {/* Inherit white when active; carry the view's own colour otherwise. */}
        <Icon style="solid" name={style.icon} className={`size-3 ${isActive ? '' : style.color}`} />
        {viewLabel(view)}
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      onPointerDownCapture={onPointerDownCapture}
      className="relative flex flex-wrap items-center gap-2"
    >
      <span ref={labelEl} className="text-xs text-gray-500 shrink-0">
        {t('list.quickViews')}
      </span>
      {/* Client-side, not a server view: it is the absence of one, so the backend has nothing to
          describe. Without it the only way back to the whole list was clearing chips one by one. */}
      <button
        ref={allEl}
        onClick={onSelectAll}
        aria-pressed={isAllActive}
        className={`${chipClass} shrink-0 ${
          isAllActive
            ? 'bg-[#1877F2] border-[#1877F2] text-white'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1877F2]'
        }`}
      >
        <Icon
          style="solid"
          name="layer-group"
          className={`size-3 ${isAllActive ? '' : 'text-[#1877F2]'}`}
        />
        {t('list.smartViews.all')}
      </button>
      {views.map(chip)}

      <div
        ref={moreEl}
        className={hiddenViews.length > 0 ? 'shrink-0' : 'invisible absolute left-0 top-0 w-max'}
      >
        <Menu as="div" className="relative">
          {({ open }) => (
            <>
              <OpenReporter open={open} onChange={setMenuOpen} />
              <MenuButton
                style={NO_OUTLINE}
                aria-label={t('list.smartViews.moreAria', {
                  count: hiddenViews.length,
                  label: t('list.filters.more', { count: hiddenViews.length }),
                })}
                className={`${chipClass} ${pointerMode ? '' : KEYBOARD_RING} ${
                  open
                    ? 'bg-gray-100 text-gray-800 border-gray-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {t('list.filters.more', { count: hiddenViews.length })}
                <Icon style="solid" name="chevron-down" className="size-2.5 opacity-60" />
              </MenuButton>
              <MenuItems
                anchor="bottom start"
                // The panel takes the focus when it opens; the global outline would box it in blue.
                style={NO_OUTLINE}
                className="z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
              >
                {hiddenViews.map(view => {
                  const style = viewStyles[view.key] ?? DEFAULT_VIEW_STYLE;
                  const isActive = activeViewKey === view.key;
                  return (
                    <MenuItem key={view.key}>
                      <button
                        type="button"
                        onClick={() => onSelect(view)}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex w-full items-start gap-2.5 px-3 py-2 text-left data-focus:bg-gray-100"
                      >
                        <Icon
                          style="solid"
                          name={style.icon}
                          className={`mt-0.5 size-3.5 shrink-0 ${style.color}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                          >
                            {viewLabel(view)}
                          </span>
                          <span className="block text-xs text-gray-500">{viewTitle(view)}</span>
                        </span>
                        {isActive && (
                          <Icon
                            style="solid"
                            name="check"
                            className="mt-0.5 size-3.5 shrink-0 text-gray-600"
                          />
                        )}
                      </button>
                    </MenuItem>
                  );
                })}
              </MenuItems>
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}

/** Reports a Headless UI menu's open state up, for freezing the layout while it is open. */
function OpenReporter({ open, onChange }: { open: boolean; onChange: (open: boolean) => void }) {
  useEffect(() => {
    onChange(open);
    return () => onChange(false);
  }, [open, onChange]);
  return null;
}

export default SmartViewBar;
