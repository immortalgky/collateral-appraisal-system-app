import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from './Icon';

/** The idle accessible name: spelled out, or built from the row's number. One of the two is required. */
type ConfirmDeleteName =
  | {
      /** Accessible name while idle, e.g. "Delete row 3". */
      label: string;
      rowNumber?: never;
    }
  | {
      /** The row's number as the table shows it (1-based): names the button "Delete row N". */
      rowNumber: number;
      label?: never;
    };

type ConfirmDeleteButtonProps = ConfirmDeleteName & {
  /** Runs on the second click. */
  onConfirm: () => void;
  disabled?: boolean;
  /** Renders nothing: a viewer without edit rights has no delete. */
  readOnly?: boolean;
  /** The idle look. The armed pill replaces it, so a skin's fixed size does not clip "Delete?". */
  className?: string;
  /** The idle content; an × when left out. */
  children?: ReactNode;
};

/**
 * The armed look. It hangs off the idle button's right edge (the spacer below keeps the idle size), so
 * a longer "Delete?" grows leftwards over its neighbour instead of being clipped by a narrow action
 * column or the table's frame. `cas-row-del-armed` / `data-armed` are the hooks for a skin.
 */
const ARMED =
  'cas-row-del-armed absolute right-0 top-1/2 z-10 inline-grid w-[max-content]! h-[1.5385rem] min-w-[1.5385rem] -translate-y-1/2 place-items-center whitespace-nowrap rounded-[4px] bg-[#dc2626] px-[6px] text-[0.75rem] font-medium leading-none text-white';

/**
 * A row's delete without a dialog: the first click arms the button (it turns into a red "Delete?"
 * pill), the second deletes. It disarms on a pointer press anywhere else, on focus moving away and on
 * Escape. A pointer press rather than blur alone: Safari and Firefox on macOS do not focus a clicked
 * button, so it would never blur and the row would stay one click from deletion. Focus stays on the
 * button while armed, and Enter / Space confirm like a click.
 */
const ConfirmDeleteButton = ({
  onConfirm,
  label,
  rowNumber,
  disabled,
  readOnly,
  className,
  children,
}: ConfirmDeleteButtonProps) => {
  const { t } = useTranslation('common');
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const promptId = useId();

  useEffect(() => {
    if (!armed) return;
    const outside = (e: Event) => {
      if (!ref.current?.contains(e.target as Node | null)) setArmed(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArmed(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [armed]);

  // A button that stops being usable while armed must not stay one click from deleting, nor
  // come back armed when it is usable again: `isArmed` is what shows and acts, and the stored
  // state is cleared the moment it is blocked (adjusting state while rendering, as React allows).
  const blocked = !!(disabled || readOnly);
  if (armed && blocked) setArmed(false);
  const isArmed = armed && !blocked;
  const idleLabel = label ?? t('actions.deleteRowN', { n: rowNumber });

  if (readOnly) return null;

  const click = (e: MouseEvent) => {
    // A row can be a button itself (the title table opens its dialog on a row click).
    e.stopPropagation();
    if (disabled) return;
    if (!isArmed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  return (
    <span className="relative inline-flex">
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={click}
        aria-label={isArmed ? t('actions.confirmDeleteLabel') : idleLabel}
        title={isArmed ? t('actions.confirmDeleteLabel') : idleLabel}
        aria-describedby={isArmed ? promptId : undefined}
        data-armed={isArmed ? 'true' : undefined}
        className={isArmed ? ARMED : clsx('cas-row-del', className)}
      >
        {isArmed
          ? t('actions.confirmDelete')
          : (children ?? <Icon style="solid" name="xmark" className="size-3" />)}
      </button>
      {/* The pill is a visual cue; this is what a screen reader hears when it arms. The region is
          always mounted, because a live region only announces text that changes inside it. */}
      <span id={promptId} role="status" aria-live="polite" className="sr-only">
        {isArmed ? t('actions.confirmDeletePrompt') : ''}
      </span>
      {isArmed && (
        // Holds the idle button's place while the pill hangs over it.
        <span aria-hidden="true" className={clsx('invisible', className)}>
          {children ?? <Icon style="solid" name="xmark" className="size-3" />}
        </span>
      )}
    </span>
  );
};

export default ConfirmDeleteButton;
