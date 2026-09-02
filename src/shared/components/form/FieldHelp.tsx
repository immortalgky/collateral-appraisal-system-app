import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWatch } from 'react-hook-form';
import clsx from 'clsx';
import { evaluateConditions, extractConditionFields, setNestedValue } from './conditions';
import type { FieldHelpConfig } from './types';

/** Panel width in px. Fixed so the first paint can be positioned before it has been measured. */
const PANEL_WIDTH = 296;

/** Minimum gap kept between the panel and the viewport edge. */
const MARGIN = 8;

interface FieldHelpProps {
  /** What to explain, declared alongside the field it belongs to */
  config: FieldHelpConfig;
  /** Prefix for nested field names, matching the field's own */
  namePrefix?: string;
  /** Index for array fields, matching the field's own */
  index?: number;
}

/**
 * A "?" button beside a field label that explains where the field's value comes from and, when the
 * field has conditions, which of them are met right now.
 *
 * The conditions are declared with the same `ConditionInput` shape as `disableWhen`/`requiredWhen`,
 * so the explanation is evaluated against live form values instead of being written out a second
 * time in prose that can drift from the rule it describes.
 */
const FieldHelp = ({ config, namePrefix = '', index }: FieldHelpProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const conditions = useMemo(() => config.conditions ?? [], [config.conditions]);

  // Subscribe only to the fields the conditions actually reference, as useFieldState does.
  const watchFields = useMemo(() => {
    const names: string[] = [];
    for (const condition of conditions) {
      names.push(...extractConditionFields(condition.when, namePrefix, index));
    }
    return [...new Set(names)];
  }, [conditions, namePrefix, index]);

  const watchedValues = useWatch({ name: watchFields });

  const values = useMemo(() => {
    const obj: Record<string, unknown> = {};
    watchFields.forEach((fieldName, i) => {
      setNestedValue(
        obj,
        fieldName,
        Array.isArray(watchedValues) ? watchedValues[i] : watchedValues,
      );
    });
    return obj;
  }, [watchFields, watchedValues]);

  const met = conditions.map(condition =>
    evaluateConditions(condition.when, values, namePrefix, index),
  );
  const anyMet = met.some(Boolean);

  // Close on Escape, on an outside click, and on anything that would move the anchor.
  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  // Place the panel under the button, flipping above and clamping sideways to stay on screen.
  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const anchor = buttonRef.current?.getBoundingClientRect();
    const panel = panelRef.current?.getBoundingClientRect();
    if (!anchor) return;

    const width = panel?.width ?? PANEL_WIDTH;
    const height = panel?.height ?? 0;
    const left = Math.min(Math.max(MARGIN, anchor.left - 8), window.innerWidth - width - MARGIN);
    const below = anchor.bottom + 6;
    const top =
      height > 0 && below + height > window.innerHeight - MARGIN
        ? Math.max(MARGIN, anchor.top - height - 6)
        : below;

    setPosition({ top, left });
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`คำอธิบาย: ${config.title}`}
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'shrink-0 inline-flex items-center justify-center size-4 rounded-full border text-[10px] font-bold leading-none transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
          anyMet
            ? 'border-warning bg-warning/10 text-warning'
            : 'border-gray-300 bg-white text-gray-400 hover:border-primary-500 hover:text-primary-500',
        )}
      >
        ?
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={config.title}
            style={{
              width: PANEL_WIDTH,
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="fixed z-50 max-w-[calc(100vw-1.5rem)] rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-lg"
          >
            <p className="mb-1.5 font-semibold text-gray-800">{config.title}</p>

            {config.lines?.map(line => (
              <p key={line} className="mb-1.5 last:mb-0">
                {line}
              </p>
            ))}

            {conditions.length > 0 && (
              <ul className="mt-2 grid gap-1.5 border-t border-gray-100 pt-2">
                {conditions.map((condition, i) => (
                  <li key={condition.text} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2">
                    <span
                      aria-hidden="true"
                      className={clsx('font-bold', met[i] ? 'text-warning' : 'text-gray-300')}
                    >
                      {met[i] ? '●' : '○'}
                    </span>
                    <span className={met[i] ? 'text-gray-800' : 'text-gray-400'}>
                      {condition.text}
                      <span className="sr-only">
                        {met[i] ? ' (เข้าเงื่อนไขนี้อยู่)' : ' (ยังไม่เข้าเงื่อนไข)'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {(anyMet ? config.whenMet : config.whenClear) && (
              <p
                className={clsx(
                  'mt-2 rounded-md border px-2 py-1.5',
                  anyMet
                    ? 'border-warning/30 bg-warning/10 text-warning-content'
                    : 'border-gray-200 bg-gray-50 text-gray-600',
                )}
              >
                {anyMet ? config.whenMet : config.whenClear}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default FieldHelp;
