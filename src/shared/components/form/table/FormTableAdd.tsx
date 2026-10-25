import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Button from '../../Button';
import Icon from '../../Icon';
import { useFormLayout } from '../formLayoutContext';
import { useTableAddSlot } from './addSlot';
import { tableStyles } from './styles';
import type { FormTableAddAction } from './types';

/** The plus, or the action's own icon. */
const lead = (a: FormTableAddAction) => (
  <Icon style="solid" name={a.icon ?? 'plus'} className="mr-1.5 text-[0.8571rem]" />
);

/**
 * The "+ เพิ่ม…" action(s) of a table. Standard: small outline buttons under the table. Compact: text
 * links that go to the section band through `TableAddSlotProvider` (inline under the table when
 * there is no band). `FormTable` renders this itself; use it alone only for a table that is not one.
 */
export function FormTableAdd({ actions }: { actions: FormTableAddAction[] }) {
  const layout = useFormLayout();
  const slot = useTableAddSlot();

  if (layout === 'standard')
    return (
      <div className="mt-[0.7143rem] flex flex-wrap gap-[0.5714rem]">
        {actions.map(a => (
          <Button
            key={a.key ?? a.label}
            variant="outline"
            size="sm"
            disabled={a.disabled}
            onClick={a.onClick}
          >
            {lead(a)}
            {a.label}
          </Button>
        ))}
      </div>
    );

  const links = actions.map(a => (
    <button
      key={a.key ?? a.label}
      type="button"
      disabled={a.disabled}
      onClick={a.onClick}
      className="text-xs font-semibold text-(--palette-accent-ink) hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
    >
      {a.icon ? '' : '+ '}
      {a.label}
    </button>
  ));
  return slot ? (
    createPortal(links, slot)
  ) : (
    <div className="flex items-center gap-[0.7143rem] px-[0.5714rem] py-1.5">{links}</div>
  );
}

interface FormTableEmptyProps {
  icon: string;
  message: string;
  /** Left out in read-only mode: the box is then only a message. */
  actions?: FormTableAddAction[];
}

const BOX =
  'flex w-full flex-col items-center gap-2 border border-dashed border-(--palette-line-strong) px-4 text-center';

/**
 * Replaces the whole table when there are no rows (no header). With one add action the entire box is
 * that button; with several the box holds one outline button each.
 */
export function FormTableEmpty({ icon, message, actions = [] }: FormTableEmptyProps) {
  const layout = useFormLayout();
  const style = tableStyles[layout].empty;
  const content = (
    <>
      <Icon style="solid" name={icon} className="text-[1.5714rem] text-(--palette-ink-2)" />
      <span className="text-sm text-(--palette-ink-2)">{message}</span>
    </>
  );

  if (actions.length === 1) {
    const [only] = actions;
    return (
      <button
        type="button"
        onClick={only.onClick}
        disabled={only.disabled}
        className={clsx(BOX, style, 'cursor-pointer hover:bg-(--palette-surface-2)')}
      >
        {content}
        {/* the look of the small outline button (30 / 26); the box is the real one */}
        <span
          className={clsx(
            'inline-flex items-center border px-3 text-xs font-medium text-(--palette-ink)',
            layout === 'standard'
              ? 'h-[2.1429rem] rounded-ctl border-(--palette-line-strong)'
              : 'h-[1.8571rem] rounded-ctl-c border-(--palette-line-strong)',
          )}
        >
          {lead(only)}
          {only.label}
        </span>
      </button>
    );
  }
  return (
    <div className={clsx(BOX, style)}>
      {content}
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-[0.5714rem]">
          {actions.map(a => (
            <Button
              key={a.key ?? a.label}
              variant="outline"
              size="sm"
              disabled={a.disabled}
              onClick={a.onClick}
            >
              {lead(a)}
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
