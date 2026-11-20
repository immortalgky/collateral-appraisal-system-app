import type { HTMLAttributes, Ref } from 'react';
import Icon from '@/shared/components/Icon';

/** What a row's drag handle needs from `useSortable`: the attributes, the listeners and the activator ref. */
export type HandleProps = HTMLAttributes<HTMLElement> & { ref: Ref<HTMLButtonElement> };

/** The grip that drags a row (the title rows and the deduction rows alike); a click on it opens nothing. */
export default function RowDragHandle({
  handle,
  label,
  ...rest
}: { handle: HandleProps | null; label: string } & Record<`data-${string}`, string | number>) {
  return (
    <button
      {...handle}
      {...rest}
      type="button"
      onClick={event => event.stopPropagation()}
      className="mx-auto flex size-6 cursor-grab touch-none items-center justify-center rounded text-(--palette-ink-2) transition-colors hover:bg-(--palette-surface-3) active:cursor-grabbing"
      aria-label={label}
    >
      <Icon style="solid" name="grip-vertical" className="text-[1.0714rem]" />
    </button>
  );
}
