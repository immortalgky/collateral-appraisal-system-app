import clsx from 'clsx';
import type { FormLayoutMode } from '../form/formLayoutContext';

/**
 * The one box of every text control (DESIGN.md 17.3): Input, NumberInput, Dropdown trigger, date
 * fields. Standard and Compact differ in geometry only; the colours below are shared.
 *
 * Each CSS property is emitted once per state: there is no tailwind-merge, so two conflicting
 * utilities would resolve by stylesheet order, not by their order in the string.
 */

/**
 * Height and radius. The height is fixed, never derived from vertical padding, so a Thai line box
 * can neither grow nor clip the control (17.12). `cell`: a table cell input, which is 28px in
 * Compact and the plain Standard control in Standard (17.7).
 */
export function controlFrame(layout: FormLayoutMode, cell = false): string {
  if (layout === 'standard') return 'h-ctl rounded-ctl';
  return cell ? 'h-8 rounded-ctl-c' : 'h-ctl-c rounded-ctl-c';
}

const PAD = {
  standard: { x: 'px-[0.8571rem]', l: 'pl-[0.8571rem]', r: 'pr-[0.8571rem]' },
  compact: { x: 'px-[0.7143rem]', l: 'pl-[0.7143rem]', r: 'pr-[0.7143rem]' },
  cell: { x: 'px-[0.5714rem]', l: 'pl-[0.5714rem]', r: 'pr-[0.5714rem]' },
} as const;

/** Side padding: both sides, or one side when the other is taken by a suffix or an icon. */
export function controlPad(layout: FormLayoutMode, cell = false, side: 'x' | 'l' | 'r' = 'x') {
  return PAD[layout === 'standard' ? 'standard' : cell ? 'cell' : 'compact'][side];
}

/** Frame and side padding of a plain text control. */
export function controlGeometry(layout: FormLayoutMode, cell = false): string {
  return clsx(controlFrame(layout, cell), controlPad(layout, cell));
}

/**
 * The one focus style of a text control (DESIGN.md 6): border `--focus-edge` plus a 3px
 * `--focus-ring`. Both are CSS variables with dark values (theme.css), so no `dark:` variant.
 * Keys: the Tailwind state (`focus`, `focus-within` for a wrapper, `open` for a Headless trigger).
 */
export const FOCUS = {
  // Full literals on purpose: Tailwind finds classes by scanning the source text.
  focus: 'focus:border-(--focus-edge) focus:ring-[3px] focus:ring-(color:--focus-ring)',
  within:
    'focus-within:border-(--focus-edge) focus-within:ring-[3px] focus-within:ring-(color:--focus-ring)',
  open: 'data-open:border-(--focus-edge) data-open:ring-[3px] data-open:ring-(color:--focus-ring)',
} as const;
/** The same for an invalid control: red border, red ring. */
export const FOCUS_ERROR = {
  focus: 'focus:border-danger focus:ring-[3px] focus:ring-(color:--focus-ring-error)',
  within:
    'focus-within:border-danger focus-within:ring-[3px] focus-within:ring-(color:--focus-ring-error)',
  open: 'data-open:ring-[3px] data-open:ring-(color:--focus-ring-error)',
} as const;

/**
 * Switches the global `:focus-visible` outline (index.css, unlayered) off for a control that draws
 * its own border + ring focus. Tailwind's layered `outline-none` loses to it, so this is `!important`.
 * Plain `<input>`/`<textarea>`/`<select>` are already excluded in index.css; this is for buttons
 * and other non-input triggers (Dropdown, Popover buttons).
 */
export const NO_GLOBAL_OUTLINE = 'focus-visible:outline-none!';

interface ControlSkinState {
  error?: boolean;
  /** Disabled, or read-only: same box, never bare text. */
  disabled?: boolean;
  /**
   * The border and ring sit on a wrapper and the real input inside is borderless
   * (number with a suffix, "other" text): focus is read with `focus-within`.
   */
  within?: boolean;
  /** A Headless UI trigger (Dropdown): the focus style also shows while its menu is open. */
  trigger?: boolean;
  /** 12px text, for the toolbar and pagination dropdown outside forms. */
  small?: boolean;
  /** Secondary text colour, for a value still being typed (a half-entered date). */
  muted?: boolean;
}

/** Border, fill, text colour and the single focus style. Geometry comes from `controlGeometry`. */
export function controlSkin({
  error,
  disabled,
  within,
  trigger,
  small,
  muted,
}: ControlSkinState): string {
  return clsx(
    'border transition-colors duration-200 placeholder:text-(--palette-ink-2)',
    !disabled && !within && NO_GLOBAL_OUTLINE,
    small ? 'text-xs' : 'text-sm',
    !disabled && trigger && (error ? FOCUS_ERROR.open : FOCUS.open),
    error
      ? 'border-danger text-danger-900 dark:text-(--palette-danger)'
      : 'border-(--palette-input-edge)',
    !error && (disabled || muted ? 'text-(--palette-ink-2)' : 'text-(--palette-ink)'),
    disabled ? 'bg-(--palette-surface-2) cursor-not-allowed' : 'bg-(--form-input-bg)',
    !disabled &&
      !error &&
      (within
        ? 'not-focus-within:hover:border-(--palette-input-edge-hover)'
        : 'hover:border-(--palette-input-edge-hover)'),
    !disabled &&
      (within
        ? error
          ? FOCUS_ERROR.within
          : FOCUS.within
        : clsx('focus:outline-none', error ? FOCUS_ERROR.focus : FOCUS.focus)),
  );
}

const CHIP = {
  standard: { box: 'h-chip px-[0.8571rem]', gap: 'gap-[0.5714rem]' },
  compact: { box: 'h-chip-c px-[0.7143rem]', gap: 'gap-[0.3571rem]' },
} as const;
/** A chip holding a text input ("อื่นๆ: ___"): the toggle part pads the left edge itself. */
const CHIP_WITH_INPUT = {
  standard: 'h-chip pr-[0.2857rem]',
  compact: 'h-chip-c pr-[0.2143rem]',
} as const;

/** Spacing between the chips of one group (17.5). */
export const chipGroupGap = (layout: FormLayoutMode) => CHIP[layout].gap;

/**
 * A radio pill / checkbox chip (17.5): fixed height, `leading-normal` for Thai, no `overflow-hidden`
 * (a chip wider than its row truncates its label span instead). Focus is the global outline.
 */
export function chipClass(
  layout: FormLayoutMode,
  selected: boolean,
  disabled: boolean,
  withInput = false,
): string {
  return clsx(
    'inline-flex items-center max-w-full rounded-full border text-sm leading-normal whitespace-nowrap transition-colors duration-200',
    withInput
      ? clsx(
          CHIP_WITH_INPUT[layout],
          // The input has no focus style of its own; the whole chip shows the global focus outline.
          'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus-edge)',
        )
      : CHIP[layout].box,
    selected
      ? clsx(
          'font-medium text-white',
          disabled
            ? 'bg-gray-500 border-gray-500 cursor-not-allowed'
            : 'bg-primary-700 border-primary-700 cursor-pointer hover:bg-primary-800',
        )
      : disabled
        ? 'bg-(--palette-surface-2) border-(--palette-line) text-(--palette-ink-2) cursor-not-allowed'
        : 'bg-(--form-input-bg) border-(--palette-input-edge) text-(--palette-ink) cursor-pointer hover:border-(--palette-input-edge-hover)',
  );
}

/** Required mark after a label. */
export const REQUIRED_MARK = 'text-(--palette-req) ml-0.5';
/** Error message under a control (the caller adds the `mt-1`). */
export const ERROR_TEXT = 'text-xs text-danger-600 dark:text-(--palette-danger)';
/** Helper line under a control, also names the source of a computed field (caller adds `mt-1`). */
export const HELPER_TEXT = 'text-xs text-(--palette-ink-2)';
/** Character counter `n/max` (thousands separators, right-aligned by the caller). */
export const counterClass = (over: boolean) =>
  clsx('text-xs tabular-nums', over ? ERROR_TEXT : 'text-(--palette-ink-2)');

/** Left padding of the toggle part of a chip that holds a text input (same as a plain chip's). */
export const chipTogglePad = (layout: FormLayoutMode) =>
  layout === 'standard' ? 'pl-[0.8571rem] pr-[0.4286rem]' : 'pl-[0.7143rem] pr-[0.3571rem]';
