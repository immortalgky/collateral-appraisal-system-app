import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import {
  KEYBOARD_RING,
  KEYBOARD_RING_PLAIN,
  NO_OUTLINE,
  usePointerMode,
} from '@/shared/hooks/usePointerMode';
import type { FilterField, FilterGroup } from './tabConfigs';
import { FILTER_GROUPS } from './tabConfigs';
import FilterValuePanel from './FilterValuePanel';
import { pickVisible } from './chipOverflow';
import { hasValue, isFieldActive, useChipSummary } from './filterOptions';

interface FilterChipBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Drops one key. Kept separate from onChange so a removed filter leaves no empty URL param. */
  onRemove: (key: string) => void;
  onClear: () => void;
  /**
   * Fields drawn as a button even when unset, in this order. The ones people reach for on most
   * visits; everything else stays behind "Add filter".
   */
  pinned?: string[];
  /**
   * The wrapper's classes. The default is a free-standing row; the list page passes a flex item
   * sized to sit beside its search box. It must be a wrapping flex row (`relative flex flex-wrap`):
   * the pinned chips wrap when they alone are too wide, and the added chips that do not fit are
   * folded into the overflow chip instead of making it any taller.
   */
  className?: string;
  /**
   * Told the width the bar takes on one line — the pinned chips, the overflow chip (when there are
   * added chips) and the tail, which are what it always shows — so the page can move the whole bar
   * to a row of its own when that does not fit beside the search. Not told while a panel is open:
   * the layout is frozen then, and a filter being edited must not move the bar under the cursor.
   */
  onOneLineWidth?: (px: number) => void;
  /**
   * The width the bar may use, when that is not the width of its own box: a bar that takes only
   * the room its chips need (the page's, beside the search box) would otherwise measure itself
   * against its own content and fold chips that had room. Omitted, the box's width is used.
   */
  availableWidth?: number;
  /**
   * Opt-in: one line, always. The pinned chips fold into the overflow chip like the added ones
   * (from the end of the row) instead of always showing and wrapping, so the bar never takes a
   * second line. `pinned` then only says which chips are drawn when unset. The wrapper must be a
   * non-wrapping flex item that gets its width from the row (`flex-1 min-w-0`), not from the chips.
   */
  singleLine?: boolean;
}

const PANEL_CLASS =
  'z-50 mt-1.5 rounded-xl border border-(--palette-line) bg-(--palette-surface) p-3 shadow-lg max-h-none! overflow-visible!';

/** Clearing a range means clearing the two keys it writes, not its own. */
const clearField = (field: FilterField, onRemove: (key: string) => void) => {
  if (field.type === 'date-range') {
    if (field.fromKey) onRemove(field.fromKey);
    if (field.toKey) onRemove(field.toKey);
    return;
  }
  onRemove(field.key);
};

interface FilterChipProps {
  field: FilterField;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  /**
   * A pinned field with no value: drawn as a plain button. Same component (and same Popover) as the
   * set chip, so ticking the first value does not remount it and close the panel under the cursor.
   */
  unset?: boolean;
  /** Draw the keyboard focus ring. Off while the bar is being used with the pointer. */
  showRing?: boolean;
  /**
   * The chip was just made by the "add filter" menu: open its own panel straight away (focus
   * moves into it), so the panel belongs to the chip from the first click instead of to the add
   * button, which moves right when the chip appears.
   */
  autoOpen?: boolean;
  /** The chip's panel has closed after being open. */
  onClosed?: () => void;
  /** The chip's panel opened (true) or closed (false). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Side effects of a Popover's open state, which only its render prop can see: opens it once on
 * mount when asked to, and reports when it closes. Headless UI has no `open` prop to set.
 */
function PopoverLifecycle({
  open,
  buttonRef,
  autoOpen = false,
  onOpened,
  onClosed,
}: {
  open: boolean;
  /** The trigger to click when `autoOpen`. */
  buttonRef?: RefObject<HTMLButtonElement | null>;
  autoOpen?: boolean;
  onOpened?: () => void;
  onClosed?: () => void;
}) {
  const opened = useRef(false);
  const wasOpen = useRef(false);
  const latest = useRef({ onOpened, onClosed });
  latest.current = { onOpened, onClosed };
  useEffect(() => {
    if (!autoOpen || opened.current) return;
    opened.current = true;
    buttonRef?.current?.click();
  }, [autoOpen, buttonRef]);
  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      latest.current.onOpened?.();
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      latest.current.onClosed?.();
    }
  }, [open]);
  // A chip whose own panel clears it (its "Clear") unmounts with the panel open: that is a close too.
  useEffect(
    () => () => {
      if (wasOpen.current) latest.current.onClosed?.();
    },
    [],
  );
  return null;
}

/** Closes a popover that has nothing left to show, handing the focus to `focusRef` if it can take it. */
function CloseWhenEmpty({
  open,
  empty,
  close,
  focusRef,
}: {
  open: boolean;
  empty: boolean;
  close: (focusableElement?: HTMLElement) => void;
  focusRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (open && empty) close(focusRef.current ?? undefined);
  }, [open, empty, close, focusRef]);
  return null;
}

/**
 * One filter that is set. The chip IS the control: clicking it reopens the value panel, so the
 * bar shows the current filters and edits them in the same place instead of drawing them once in
 * a panel and again in a separate chip row.
 */
function FilterChip({
  field,
  values,
  onChange,
  onRemove,
  unset = false,
  showRing = true,
  autoOpen = false,
  onClosed,
  onOpenChange,
}: FilterChipProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const summary = useChipSummary(field, values);

  // Keys a quick view sets on the user's behalf (assigneeUserId, the appointment/assigned dates)
  // have no control of their own — they get a chip that says what is filtered and can be removed.
  const chipBody = (
    <>
      <span className="font-medium text-(--palette-gray-400)">{field.label}:</span>
      <span className="truncate max-w-52">{summary}</span>
    </>
  );

  const remove = (
    <button
      type="button"
      onClick={() => clearField(field, onRemove)}
      aria-label={t('appraisal:list.removeFilter') + ': ' + field.label}
      style={NO_OUTLINE}
      className={`rounded p-0.5 opacity-60 hover:bg-(--palette-line) hover:opacity-100 ${
        showRing ? KEYBOARD_RING_PLAIN : ''
      }`}
    >
      <Icon style="solid" name="xmark" className="size-3" />
    </button>
  );

  if (field.hidden && !unset) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-(--palette-line) bg-(--palette-surface-3) px-2.5 py-1 text-xs text-(--palette-ink)">
        {chipBody}
        {remove}
      </span>
    );
  }

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border border-(--palette-line) py-1 text-xs transition-colors hover:border-(--palette-line-strong) ${
              unset
                ? 'bg-(--palette-surface) px-2.5 text-(--palette-gray-600) hover:text-(--palette-ink)'
                : 'bg-(--palette-surface-3) pl-2.5 pr-1 text-(--palette-ink)'
            }`}
          >
            <PopoverButton
              ref={buttonRef}
              style={NO_OUTLINE}
              className={`inline-flex items-center gap-1.5 rounded ${showRing ? KEYBOARD_RING : ''}`}
            >
              {unset ? field.label : chipBody}
              <Icon style="solid" name="chevron-down" className="size-2.5 opacity-60" />
            </PopoverButton>
            {!unset && remove}
          </span>
          <PopoverPanel anchor="bottom start" focus={autoOpen} className={PANEL_CLASS}>
            <FilterValuePanel
              field={field}
              values={values}
              onChange={onChange}
              onRemove={onRemove}
            />
          </PopoverPanel>
          <PopoverLifecycle
            open={open}
            buttonRef={buttonRef}
            autoOpen={autoOpen}
            onOpened={() => onOpenChange?.(true)}
            onClosed={() => {
              onOpenChange?.(false);
              onClosed?.();
            }}
          />
        </>
      )}
    </Popover>
  );
}

/** Room kept for the overflow chip's number growing a digit (+9 → +10) between measurements. */
const OVERFLOW_SLACK = 10;

/** One hidden filter in the overflow menu: its label and value, a way to clear it, a way to open it. */
function OverflowRow({
  field,
  values,
  showRing,
  onOpen,
  onClear,
}: {
  field: FilterField;
  values: Record<string, string>;
  showRing: boolean;
  onOpen: () => void;
  /** Clear this filter. The bar moves the focus on afterwards: the button that had it is gone. */
  onClear: () => void;
}) {
  const ring = showRing ? KEYBOARD_RING_PLAIN : '';
  const { t } = useTranslation(['appraisal']);
  const summary = useChipSummary(field, values);
  const set = hasValue(values, field);
  // A key a quick view set has no control to open: the row only says what it is and can clear it.
  const label = set ? `${field.label}: ${summary}` : field.label;
  return (
    <div
      data-field-key={field.key}
      className="flex items-center rounded-lg hover:bg-(--palette-surface-2)"
    >
      <button
        type="button"
        data-overflow-row
        disabled={field.hidden}
        onClick={onOpen}
        style={NO_OUTLINE}
        className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm text-(--palette-ink) disabled:cursor-default ${ring}`}
      >
        {label}
      </button>
      {set && (
        <button
          type="button"
          data-overflow-row
          onClick={onClear}
          aria-label={t('appraisal:list.removeFilter') + ': ' + field.label}
          style={NO_OUTLINE}
          className={`mr-1 rounded p-1 text-(--palette-gray-400) hover:bg-(--palette-line) hover:text-(--palette-ink) ${ring}`}
        >
          <Icon style="solid" name="xmark" className="size-3" />
        </button>
      )}
    </div>
  );
}

/**
 * The filters: the pinned chips (always on show, wrapping when they alone are too wide), then the
 * added chips that fit, then "More +N" for the rest of the added ones, then "Add filter" and
 * "Clear all", which are always at the end of the row.
 *
 * Every chip stays mounted. The added ones that do not fit are taken out of the layout and made
 * invisible rather than unrendered, so their widths can still be measured (the bar re-decides
 * on every resize, value change and font load) and none of them loses its state.
 */
function FilterChipBar({
  filters,
  values,
  onChange,
  onRemove,
  onClear,
  pinned = [],
  className = 'relative flex min-w-0 flex-wrap items-center gap-2',
  onOneLineWidth,
  availableWidth,
  singleLine = false,
}: FilterChipBarProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  // The field just picked in the "add filter" menu. It is drawn as a chip of its own (empty, like
  // a pinned one) whose panel opens at once, so the values are picked in the chip's own popover:
  // the same one that carries on once the first value makes it a set chip. It lasts until that
  // panel closes — a field left with no value is not a filter, and leaves no chip behind.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // The same field, kept on show while its panel is open: the one just added is never the one
  // folded away under the cursor, an earlier chip makes room instead. It is let go when the panel
  // closes: from then on it is an ordinary added chip, and folds into "More" if it does not fit —
  // the row never grows a line for it.
  const [forcedKey, setForcedKey] = useState<string | null>(null);
  // Which hidden filter the overflow menu has opened, or null for the list.
  const [overflowKey, setOverflowKey] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  // singleLine only: the chip whose value panel is open stays on show (the others make room), and
  // the overflow menu being open is what freezes the layout; a chip panel cannot, because the
  // chip grows as values are ticked and a frozen row would then run over its neighbours.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  // How many popovers of the bar are open. While any is, the layout is frozen: a filter being
  // edited must not fold into (or out of) the overflow chip under the cursor as its text changes.
  const [openCount, setOpenCount] = useState(0);
  const trackOpen = useCallback(
    (open: boolean) => setOpenCount(c => Math.max(0, c + (open ? 1 : -1))),
    [],
  );
  const frozen = useRef(false);
  const appliedForced = useRef<string | null>(null);
  // While the bar is being used with the pointer no trigger draws a focus ring (until a Tab).
  const { pointerMode, onPointerDownCapture } = usePointerMode();

  const rootRef = useRef<HTMLDivElement>(null);
  const chipEls = useRef(new Map<string, HTMLElement>());
  const overflowEl = useRef<HTMLDivElement>(null);
  const tailEl = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const overflowBody = useRef<HTMLDivElement | null>(null);
  const shownOverflowKey = useRef<string | null>(null);
  // Whether the last input in the overflow menu was the pointer. Focus is moved by script only
  // after the keyboard: moved after a click it would draw the global focus outline round a button
  // nobody tabbed to.
  const pointerUsed = useRef(false);

  const pinnedFields = pinned
    .map(key => filters.find(f => f.key === key))
    .filter((f): f is FilterField => f !== undefined);
  const isPinned = (f: FilterField) => pinned.includes(f.key);
  const active = filters.filter(f => hasValue(values, f));
  // Not pinned, in the bar because it is set (or has just been picked): one list, so a chip keeps
  // its place — and its Popover — when it goes from picked to set.
  const extras = filters.filter(
    f => !isPinned(f) && (isFieldActive(values, f) || f.key === pendingKey),
  );
  const chipFields = [...pinnedFields, ...extras];
  const available = filters.filter(
    f => !f.hidden && !isPinned(f) && !isFieldActive(values, f) && f.key !== pendingKey,
  );

  // pinned '#' added: the one string says which chips there are and in what groups
  // (singleLine: every chip is on the "added" side, so every one of them can fold)
  const keysId = singleLine
    ? `#${chipFields.map(f => f.key).join('|')}`
    : `${pinnedFields.map(f => f.key).join('|')}#${extras.map(f => f.key).join('|')}`;

  useEffect(() => {
    if (
      forcedKey &&
      forcedKey !== pendingKey &&
      !(keysId.split('#')[1] ?? '').split('|').includes(forcedKey)
    ) {
      setForcedKey(null);
    }
  }, [forcedKey, pendingKey, keysId]);
  const keepKey = forcedKey ?? (singleLine ? openKey : null);
  const isHidden = (key: string) => key !== keepKey && hiddenKeys.includes(key);
  // singleLine only: chips that hold a value take the slots before the unset ones, which fold first
  const setId = chipFields
    .filter(f => hasValue(values, f))
    .map(f => f.key)
    .join('|');

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const [pinnedPart, addedPart = ''] = keysId.split('#');
    const pinnedIds = pinnedPart ? pinnedPart.split('|') : [];
    const keys = addedPart ? addedPart.split('|') : [];
    // The real width, fractions included: offsetWidth rounds, and a row of rounded widths can be a
    // pixel or two off the truth — enough to push the tail onto a line of its own.
    const widthOf = (el: Element | null | undefined) =>
      el ? el.getBoundingClientRect().width || (el as HTMLElement).offsetWidth : 0;
    const chipWidth = (k: string) => widthOf(chipEls.current.get(k));
    const gap = parseFloat(getComputedStyle(root).columnGap) || 0;
    if (onOneLineWidth && !frozen.current) {
      const items = pinnedIds.map(chipWidth);
      if (keys.length > 0) items.push(widthOf(overflowEl.current) + OVERFLOW_SLACK);
      items.push(widthOf(tailEl.current));
      onOneLineWidth(Math.ceil(items.reduce((a, b) => a + b, 0) + gap * (items.length - 1)));
    }
    // The order chips are offered the room in: as drawn, or (singleLine) the set ones first
    const withValue = new Set(setId ? setId.split('|') : []);
    const offer = keys.map((_, i) => i);
    if (singleLine)
      offer.sort((a, b) => Number(withValue.has(keys[b])) - Number(withValue.has(keys[a])));
    const fits = pickVisible({
      pinned: pinnedIds.map(chipWidth),
      added: offer.map(i => chipWidth(keys[i])),
      forced: keepKey ? offer.indexOf(keys.indexOf(keepKey)) : -1,
      available: availableWidth ?? root.clientWidth,
      safety: 1,
      overflowWidth: widthOf(overflowEl.current) + OVERFLOW_SLACK,
      tailWidth: widthOf(tailEl.current),
      gap,
    });
    const next = keys.filter((_, i) => !fits[offer.indexOf(i)]);
    // Frozen: nothing moves, except to make room for the filter just added (a new `keepKey`).
    if (frozen.current && appliedForced.current === keepKey) return;
    appliedForced.current = keepKey;
    setHiddenKeys(prev =>
      prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next,
    );
  }, [keysId, keepKey, setId, singleLine, onOneLineWidth, availableWidth]);

  useLayoutEffect(() => {
    frozen.current = singleLine ? overflowOpen : openCount > 0;
  });
  // After every render: a chip's text (and so its width) can change without its key changing.
  useLayoutEffect(measure);

  useEffect(() => {
    const els = [rootRef.current, overflowEl.current, tailEl.current, ...chipEls.current.values()];
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    els.forEach(el => el && observer?.observe(el));
    // Webfonts change every width when they arrive, and no element's size event covers that.
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.addEventListener?.('loadingdone', measure);
    void fonts?.ready?.then(measure);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener?.('loadingdone', measure);
    };
  }, [measure, keysId]);

  const hiddenFields = chipFields.filter(f => isHidden(f.key));
  const hiddenActive = hiddenFields.some(f => hasValue(values, f));
  // Found among all the chips, not the hidden ones: the filter being edited in the menu may stop
  // being hidden (or go) without the menu being the one to decide.
  const overflowField = overflowKey ? chipFields.find(f => f.key === overflowKey) : undefined;
  // The filter the menu had open is gone (its "Clear" removed it): back to the list.
  useEffect(() => {
    if (overflowKey && !overflowField) setOverflowKey(null);
  }, [overflowKey, overflowField]);

  // The menu swaps its own content (list ↔ one filter's panel), which unmounts the element that had
  // the focus: put it on the first thing in the new view, so the keyboard does not fall to the page.
  const focusInMenu = useCallback((inPanel: boolean) => {
    const body = overflowBody.current;
    if (!body) return;
    // After a click the focus goes to the menu itself, not a button in it: it keeps Esc working
    // (the clicked row is gone, and with the focus on the page Esc closes nothing) without
    // outlining anything.
    if (pointerUsed.current) body.focus({ preventScroll: true });
    else
      body
        .querySelector<HTMLElement>(inPanel ? 'button' : '[data-overflow-row]:not(:disabled)')
        ?.focus();
  }, []);
  useEffect(() => {
    if (shownOverflowKey.current === overflowKey) return;
    shownOverflowKey.current = overflowKey;
    focusInMenu(overflowKey !== null);
  }, [overflowKey, focusInMenu]);

  // The last input in the bar was the pointer: then a closed panel leaves the focus where the click
  // put it. Read at close time, so a ref.
  const pointerRef = useRef(false);
  pointerRef.current = pointerMode;

  /**
   * A filter left with no value is not a filter: drop its key. An added one then leaves the bar
   * (instead of sitting there as "label: All" in the filled style); a pinned one goes back to its
   * plain unset button. No empty key lingers. It runs when a panel closes, not as the last value
   * is unticked, which would take the panel away from under the cursor.
   */
  const dropEmptyAdded = () => {
    chipFields.forEach(f => {
      if (!f.hidden && f.type !== 'date-range' && values[f.key] === '') onRemove(f.key);
    });
  };

  const afterClose = (field: FilterField) => {
    if (field.key === pendingKey) {
      setPendingKey(null);
      setForcedKey(null);
    }
    dropEmptyAdded();
    // The chip that just closed may be gone with the focus Headless UI handed back to it (an
    // empty pick closed with Esc): send the keyboard back to the button that made it.
    requestAnimationFrame(() => {
      if (!pointerRef.current && document.activeElement === document.body) {
        addButtonRef.current?.focus();
      }
    });
  };

  // Clearing a row of the overflow menu removes the button that had the focus. Hand it to the row
  // that takes its place (the next one, or the one before when it was the last); when it was the
  // only one, CloseWhenEmpty closes the menu and hands it to "Add filter".
  const nextRowKey = useRef<string | null>(null);
  const clearFromMenu = (field: FilterField) => {
    const at = hiddenFields.findIndex(f => f.key === field.key);
    nextRowKey.current = (hiddenFields[at + 1] ?? hiddenFields[at - 1])?.key ?? null;
    clearField(field, onRemove);
  };
  const hiddenIds = hiddenFields.map(f => f.key).join('|');
  useEffect(() => {
    const key = nextRowKey.current;
    if (!key) return;
    nextRowKey.current = null;
    overflowBody.current
      // The row's first enabled control: a quick-view row's open button is disabled, so its ×.
      ?.querySelector<HTMLElement>(
        `[data-field-key="${CSS.escape(key)}"] [data-overflow-row]:not(:disabled)`,
      )
      ?.focus();
  }, [hiddenIds]);

  const moveInList = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-overflow-row]')].filter(
      el => !(el as HTMLButtonElement).disabled,
    );
    if (rows.length === 0) return;
    e.preventDefault();
    const at = rows.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
    rows[(next + rows.length) % rows.length].focus();
  };

  const chipWrap = (field: FilterField, chip: ReactNode) => (
    <div
      key={field.key}
      ref={el => {
        if (el) chipEls.current.set(field.key, el);
        else chipEls.current.delete(field.key);
      }}
      // Out of the flow and invisible, but still laid out at its natural width (w-max) so it can
      // be measured, and out of the tab order and the accessibility tree (invisible).
      className={isHidden(field.key) ? 'invisible absolute left-0 top-0 w-max' : 'shrink-0'}
    >
      {chip}
    </div>
  );

  return (
    <div ref={rootRef} className={className} onPointerDownCapture={onPointerDownCapture}>
      {chipFields.map(field =>
        chipWrap(
          field,
          <FilterChip
            field={field}
            values={values}
            onChange={onChange}
            onRemove={onRemove}
            unset={!hasValue(values, field)}
            showRing={!pointerMode}
            autoOpen={field.key === pendingKey}
            onOpenChange={open => {
              trackOpen(open);
              if (singleLine) setOpenKey(k => (open ? field.key : k === field.key ? null : k));
            }}
            onClosed={() => afterClose(field)}
          />,
        ),
      )}

      <div
        ref={overflowEl}
        onPointerDownCapture={() => {
          pointerUsed.current = true;
        }}
        onKeyDownCapture={() => {
          pointerUsed.current = false;
        }}
        className={hiddenFields.length > 0 ? 'shrink-0' : 'invisible absolute left-0 top-0 w-max'}
      >
        <Popover className="relative">
          {({ open, close }) => (
            <>
              <PopoverButton
                style={NO_OUTLINE}
                aria-label={t('appraisal:list.filters.moreAria', {
                  count: hiddenFields.length,
                  label: t('appraisal:list.filters.more', { count: hiddenFields.length }),
                })}
                className={`inline-flex items-center gap-1.5 rounded-lg border border-(--palette-line) px-2.5 py-1 text-xs transition-colors hover:border-(--palette-line-strong) ${
                  pointerMode ? '' : KEYBOARD_RING
                } ${
                  hiddenActive
                    ? 'border-(--palette-line-strong) bg-(--palette-surface-3) font-medium text-(--palette-ink)'
                    : 'bg-(--palette-surface) text-(--palette-gray-600) hover:text-(--palette-ink)'
                }`}
              >
                {/* singleLine: a hidden chip with a value says so, so filters never hide unseen */}
                {singleLine && hiddenActive && (
                  <span data-more-active className="size-1.5 rounded-full bg-primary" />
                )}
                {t('appraisal:list.filters.more', { count: hiddenFields.length })}
                <Icon style="solid" name="chevron-down" className="size-2.5 opacity-60" />
              </PopoverButton>
              <PopoverPanel anchor="bottom start" className={PANEL_CLASS}>
                <div ref={overflowBody} tabIndex={-1} style={NO_OUTLINE}>
                  {overflowField ? (
                    <FilterValuePanel
                      field={overflowField}
                      values={values}
                      onChange={onChange}
                      onRemove={onRemove}
                      onBack={() => setOverflowKey(null)}
                    />
                  ) : (
                    // Arrow keys walk the rows (Tab does too); the panel is a Popover, not a Menu,
                    // because one of its views is a value panel with inputs, which a Menu would eat.
                    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                    <div className="w-64 max-h-72 overflow-y-auto -mx-1" onKeyDown={moveInList}>
                      {hiddenFields.map(field => (
                        <OverflowRow
                          key={field.key}
                          field={field}
                          values={values}
                          showRing={!pointerMode}
                          onOpen={() => setOverflowKey(field.key)}
                          onClear={() => clearFromMenu(field)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </PopoverPanel>
              <PopoverLifecycle
                open={open}
                // opened from the keyboard: start on the first row
                onOpened={() => {
                  trackOpen(true);
                  setOverflowOpen(true);
                  focusInMenu(false);
                }}
                onClosed={() => {
                  trackOpen(false);
                  setOverflowOpen(false);
                  setOverflowKey(null);
                  dropEmptyAdded();
                }}
              />
              {/* Nothing hidden any more (the last one was cleared from the list): the chip is
                  about to go, so close the menu and put the focus on the button beside it. */}
              <CloseWhenEmpty
                open={open}
                empty={hiddenFields.length === 0}
                close={close}
                focusRef={addButtonRef}
              />
            </>
          )}
        </Popover>
      </div>

      <div ref={tailEl} className="flex shrink-0 items-center gap-2">
        {available.length > 0 && (
          <Popover className="relative">
            <PopoverButton
              ref={addButtonRef}
              style={NO_OUTLINE}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-(--palette-line-strong) px-2.5 py-1 text-xs text-(--palette-gray-600) transition-colors hover:border-primary hover:text-(--palette-primary-text) ${
                pointerMode ? '' : KEYBOARD_RING
              }`}
            >
              <Icon style="solid" name="plus" className="size-2.5" />
              {t('appraisal:list.filters.add')}
            </PopoverButton>
            <PopoverPanel anchor="bottom start" className={PANEL_CLASS}>
              {({ close }) => (
                <div className="w-56 max-h-72 overflow-y-auto -mx-1">
                  {FILTER_GROUPS.map((group: FilterGroup) => {
                    const fields = available.filter(f => f.group === group);
                    if (fields.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-(--palette-gray-400)">
                          {t(`appraisal:list.filters.groups.${group}`)}
                        </p>
                        {fields.map(field => (
                          <button
                            key={field.key}
                            type="button"
                            onClick={() => {
                              // Hand over to the field's own chip: close this menu, which is about
                              // to move, and let the new chip open its panel.
                              setPendingKey(field.key);
                              setForcedKey(field.key);
                              close();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-(--palette-ink) hover:bg-(--palette-surface-2)"
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </PopoverPanel>
          </Popover>
        )}

        {active.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={NO_OUTLINE}
            className={`rounded text-xs text-(--palette-gray-500) underline hover:text-(--palette-ink) ${
              pointerMode ? '' : KEYBOARD_RING_PLAIN
            }`}
          >
            {t('appraisal:list.clearAll')}
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterChipBar;
