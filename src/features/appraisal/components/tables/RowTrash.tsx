import clsx from 'clsx';
import ConfirmDeleteButton from '@/shared/components/ConfirmDeleteButton';
import Icon from '@/shared/components/Icon';

/**
 * A row's delete in a ledger: a small muted trash that turns danger while its row (`group/row`) is
 * hovered or holds focus. Always drawn, so touch has it. The second click confirms.
 */
export default function RowTrash({
  position,
  onDelete,
  className,
}: {
  /** 0-based place of the row in its list. */
  position: number;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <ConfirmDeleteButton
      rowNumber={position + 1}
      onConfirm={onDelete}
      className={clsx(
        'inline-flex size-6 items-center justify-center rounded text-(--palette-ink-3) opacity-60 transition-colors',
        'hover:bg-danger/10 hover:text-danger-600 hover:opacity-100 focus-visible:opacity-100',
        'group-hover/row:text-danger-600 group-hover/row:opacity-100',
        'group-focus-within/row:text-danger-600 group-focus-within/row:opacity-100',
        'dark:hover:text-(--palette-danger) dark:group-hover/row:text-(--palette-danger)',
        className,
      )}
    >
      <Icon style="solid" name="trash" className="text-[1rem]" />
    </ConfirmDeleteButton>
  );
}
