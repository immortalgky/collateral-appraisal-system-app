import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';

/** Small presentational pieces of the Administration form column (labels, pickers, notices). */

export function FieldLabel({
  id,
  required,
  first,
  children,
}: {
  id?: string;
  required?: boolean;
  /** The first label in a card sits flush under the card header. */
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      id={id}
      className={clsx('mb-1 block text-xs font-medium text-gray-700', !first && 'mt-4')}
    >
      {children}
      {required && <span className="text-danger ml-0.5">*</span>}
    </span>
  );
}

/** The empty state of a staff/company picker: a white box with a drawn border that opens the modal. */
export function PickerButton({
  placeholder,
  onClick,
  invalid,
  labelledBy,
}: {
  placeholder: string;
  onClick: () => void;
  invalid?: boolean;
  labelledBy?: string;
}) {
  const { t } = useTranslation('common');
  const ownId = useId();
  return (
    <button
      id={ownId}
      type="button"
      onClick={onClick}
      // The field's label first, then the button's own text (placeholder and "Search"): the label
      // alone would replace the whole name.
      aria-labelledby={labelledBy ? `${labelledBy} ${ownId}` : undefined}
      className={clsx(
        'flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm text-gray-400 hover:border-gray-300',
        invalid ? 'border-danger' : 'border-gray-200',
      )}
    >
      <span className="min-w-0 truncate">{placeholder}</span>
      <span className="shrink-0 rounded-md border border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        {t('actions.search')}
      </span>
    </button>
  );
}

/** A field error: red text with an icon, so it does not rely on colour alone. */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-danger mt-1 flex items-start gap-1.5 text-xs">
      <Icon name="circle-exclamation" style="solid" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Dashed note under a choice: what the automatic option does. */
export function InfoNote({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600">
      {title && <p className="font-medium text-gray-700">{title}</p>}
      <p>{children}</p>
    </div>
  );
}

const NOTICE_TONES = {
  gray: { box: 'border-gray-200 bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  amber: { box: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
} as const;

/** One slim line above the form (lock, read-only). `action` goes at the right end. */
export function InlineNotice({
  tone,
  children,
  action,
}: {
  tone: keyof typeof NOTICE_TONES;
  children: ReactNode;
  action?: ReactNode;
}) {
  const styles = NOTICE_TONES[tone];
  return (
    <div
      role="status"
      className={clsx('flex items-start gap-2 rounded-lg border px-3 py-1.5 text-xs', styles.box)}
    >
      {/* The dot stays beside the first line of text however far the text wraps. */}
      <span
        className={clsx('mt-1.5 size-2 shrink-0 rounded-full', styles.dot)}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">{children}</span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}
