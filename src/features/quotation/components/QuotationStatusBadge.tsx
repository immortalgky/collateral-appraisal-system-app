import { useState } from 'react';
import clsx from 'clsx';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
} from '@floating-ui/react';
import { useTranslation } from 'react-i18next';
import type { QuotationStatus } from '@/features/appraisal/types/administration';

const STATUS_CLASS: Record<string, string> = {
  Draft: 'bg-(--palette-surface-3) text-(--palette-ink)',
  Sent: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  UnderAdminReview: 'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn)',
  PendingRmSelection: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  WinnerTentative: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  Negotiating: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',
  Finalized: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
  Cancelled: 'bg-red-100 dark:bg-red-500/20 text-(--palette-req)',
  // Legacy / company-level statuses
  Submitted: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  Shortlisted: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  Tentative: 'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn)',
  Accepted: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
  Rejected: 'bg-red-100 dark:bg-red-500/20 text-(--palette-req)',
  Withdrawn: 'bg-(--palette-surface-3) text-(--palette-gray-500)',
  UnderReview: 'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn)',
  Declined: 'bg-red-100 dark:bg-red-500/20 text-(--palette-req)',
  PendingCheckerReview: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  Pending: 'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn)',
  Expired: 'bg-(--palette-surface-3) text-(--palette-gray-600)',
};

interface QuotationStatusBadgeProps {
  status: string;
  className?: string;
  /**
   * Optional reason shown in a click-to-reveal popover on the chip (e.g. a company's decline
   * reason). Mirrors InvitedCompaniesPopover's floating-ui interaction pattern. When omitted or
   * blank, the chip renders as a plain, non-interactive span — unchanged from prior behavior.
   */
  reason?: string | null;
}

const QuotationStatusBadge = ({ status, className, reason }: QuotationStatusBadgeProps) => {
  const { t } = useTranslation('quotation');
  const [open, setOpen] = useState(false);

  const label = t(`status.${status}` as `status.${string}`, { defaultValue: status });
  const chipClassName = clsx(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    STATUS_CLASS[status] ?? 'bg-(--palette-surface-3) text-(--palette-ink)',
    className,
  );

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    return <span className={chipClassName}>{label}</span>;
  }

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className={clsx(chipClassName, 'cursor-help hover:opacity-80 transition-opacity')}
      >
        {label}
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-(--palette-surface) rounded-lg border border-(--palette-line) shadow-lg max-w-xs px-3 py-2"
            >
              <p className="text-[10px] font-semibold text-(--palette-gray-500) uppercase tracking-wide mb-0.5">
                {t('fields.reason')}
              </p>
              <p className="text-xs text-(--palette-ink) whitespace-pre-wrap">{trimmedReason}</p>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

export default QuotationStatusBadge;

/** Utility used in non-JSX contexts — returns the raw status key; caller translates as needed. */
export function getStatusLabel(status: QuotationStatus | string): string {
  return status;
}
