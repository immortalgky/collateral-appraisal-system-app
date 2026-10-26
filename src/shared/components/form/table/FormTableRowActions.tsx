import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import ConfirmDeleteButton from '../../ConfirmDeleteButton';
import Icon from '../../Icon';
import { useFormLayout } from '../formLayoutContext';
import { tableStyles } from './styles';

interface FormTableRowActionsProps {
  /** 0-based place of the row in the list. */
  position: number;
  /** Rows in the list: the last row cannot move down. */
  count: number;
  /** Leave out the ones the table does not support. */
  onEdit?: () => void;
  /** Accessible name of the edit button (default: the common "Edit"). */
  editLabel?: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Runs on the second click (`ConfirmDeleteButton`). */
  onDelete?: () => void;
  /** Accessible name of the delete button where "Delete row N" says too little (default: that). */
  deleteLabel?: string;
}

const BASE =
  'inline-flex items-center justify-center rounded-md text-(--palette-ink-2) disabled:opacity-40';
const ICON = 'text-[1.0714rem]';

/** A row's move up / move down / delete, always visible, right-aligned in the last column. */
export function FormTableRowActions({
  position,
  count,
  onEdit,
  editLabel,
  onMoveUp,
  onMoveDown,
  onDelete,
  deleteLabel,
}: FormTableRowActionsProps) {
  const { t } = useTranslation('common');
  const size = tableStyles[useFormLayout()].rowAction;
  const n = position + 1;

  const button = (icon: string, label: string, disabled: boolean, onClick: () => void) => (
    <button
      type="button"
      // A clickable row (one that opens a dialog) must not also fire from its own buttons.
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(BASE, size, 'enabled:hover:bg-(--palette-surface-3)')}
    >
      <Icon style="solid" name={icon} className={ICON} />
    </button>
  );

  return (
    <div className="flex justify-end gap-0.5">
      {onEdit && button('pen', editLabel ?? t('actions.edit'), false, onEdit)}
      {onMoveUp && button('arrow-up', t('table.moveRowUp', { n }), position === 0, onMoveUp)}
      {onMoveDown &&
        button('arrow-down', t('table.moveRowDown', { n }), position === count - 1, onMoveDown)}
      {onDelete && (
        <ConfirmDeleteButton
          {...(deleteLabel ? { label: deleteLabel } : { rowNumber: n })}
          onConfirm={onDelete}
          className={clsx(
            BASE,
            size,
            'enabled:hover:bg-danger/10 enabled:hover:text-danger-600 dark:enabled:hover:text-(--palette-danger)',
          )}
        >
          <Icon style="solid" name="trash" className={ICON} />
        </ConfirmDeleteButton>
      )}
    </div>
  );
}
