import type { ReactNode } from 'react';

import Icon from '@/shared/components/Icon';

interface CondoListPaneProps {
  title: string;
  /** Small grey line after the title, e.g. "3 towers · 120 units in the list". */
  hint?: ReactNode;
  /** Filter chips and toggles, between the hint and the action. */
  toolbar?: ReactNode;
  /** Right end of the toolbar, e.g. the add button. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * The box around a Condo list tab's table: a toolbar over a scrolling table.
 * A rounded white card. The pane is as tall as its table, up to the room the tab has, then the
 * table scrolls inside it.
 */
export function CondoListPane({ title, hint, toolbar, action, children }: CondoListPaneProps) {
  return (
    <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-(--palette-line-soft) bg-(--palette-surface) shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) px-5 py-2.5">
        <h3 className="text-base font-semibold text-(--palette-ink)">{title}</h3>
        {hint && <span className="text-xs text-(--palette-ink-2)">{hint}</span>}
        {toolbar}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

export const Dash = () => <span className="text-(--palette-ink-3)">—</span>;

/** The cover photo as a small tile, or the entity's icon until one is chosen. */
export function CondoThumb({
  src,
  alt,
  icon,
}: {
  src?: string;
  alt: string;
  icon: 'building' | 'layer-group' | 'house';
}) {
  return (
    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-(--palette-surface-3)">
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <Icon name={icon} style="solid" className="text-base text-(--palette-ink-2)" />
      )}
    </div>
  );
}

/** Trash + chevron cell of a list row. The trash is left out on a read-only page. */
export function RowActions({
  onDelete,
  deleteLabel,
}: {
  onDelete?: () => void;
  deleteLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onDelete && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="flex size-6 items-center justify-center rounded-md text-(--palette-ink-2) hover:bg-danger/10 hover:text-danger"
        >
          <Icon name="trash-can" style="regular" className="text-sm" />
        </button>
      )}
      <Icon name="chevron-right" style="solid" className="text-sm text-(--palette-ink-2)" />
    </div>
  );
}
