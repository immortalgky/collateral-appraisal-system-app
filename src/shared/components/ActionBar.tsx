import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useFormReadOnly } from './form/context';
import { useFormLayout } from './form/formLayoutContext';
import MissingFieldsChip from './form/missing/MissingFieldsChip';
import { useHasMissingFields } from './form/missing/missingFieldsContext';

interface ActionBarProps {
  children: ReactNode;
  /** Draw the bar on a read-only page too: for a bar that holds something besides Save and Cancel. */
  keepWhenReadOnly?: boolean;
}

/**
 * The form's bottom bar (DESIGN.md 17.8). Compact is a little shorter. A read page (DESIGN.md 17.3)
 * has nothing to save or cancel, so the bar is not drawn unless `keepWhenReadOnly`.
 */
const ActionBar = ({ children, keepWhenReadOnly }: ActionBarProps) => {
  const compact = useFormLayout() === 'compact';
  const pageReadOnly = usePageReadOnly();
  if (pageReadOnly && !keepWhenReadOnly) return null;
  return (
    <div
      role="toolbar"
      aria-label="Page actions"
      // The layouts drop their bottom padding when this is on the page, so the bar sits on the
      // bottom edge of the screen instead of floating above a strip of empty space.
      data-page-actions=""
      className={clsx(
        'shrink-0 sticky bottom-0 z-40 bg-(--palette-surface) border-t border-(--palette-line) px-6 shadow-[0_-0.2857rem_1rem_rgb(16_24_40/0.06)]',
        compact ? 'py-[0.5714rem]' : 'py-[0.7143rem]',
      )}
    >
      <div className="flex justify-between items-center">{children}</div>
    </div>
  );
};

const Left = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3">{children}</div>
);

/**
 * The bar's actions. On a form inside a `FormProvider` the missing-fields chip comes first, left of
 * Save Draft; a read-only form has nothing to fill in, so no chip.
 */
const Right = ({ children }: { children: ReactNode }) => {
  const hasMissingFields = useHasMissingFields();
  const readOnly = useFormReadOnly();
  return (
    <div className="flex items-center gap-3">
      {hasMissingFields && !readOnly && <MissingFieldsChip />}
      {children}
    </div>
  );
};

const Divider = () => <div className="h-6 w-px bg-(--palette-line)" aria-hidden="true" />;

const UnsavedIndicator = ({ show }: { show: boolean }) => {
  const { t } = useTranslation('common');
  if (!show) return null;
  return (
    <span
      role="status"
      className="flex items-center gap-1.5 text-xs font-medium text-(--palette-warn)"
    >
      <span className="size-[0.5rem] rounded-full bg-amber-500" />
      {t('unsaved.badge')}
    </span>
  );
};

ActionBar.Left = Left;
ActionBar.Right = Right;
ActionBar.Divider = Divider;
ActionBar.UnsavedIndicator = UnsavedIndicator;

export default ActionBar;
