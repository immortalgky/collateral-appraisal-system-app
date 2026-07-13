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
  Draft: 'bg-gray-100 text-gray-700',
  Sent: 'bg-blue-100 text-blue-700',
  UnderAdminReview: 'bg-amber-100 text-amber-700',
  PendingRmSelection: 'bg-purple-100 text-purple-700',
  WinnerTentative: 'bg-indigo-100 text-indigo-700',
  Negotiating: 'bg-orange-100 text-orange-700',
  Finalized: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  // Legacy / company-level statuses
  Submitted: 'bg-blue-100 text-blue-700',
  Shortlisted: 'bg-indigo-100 text-indigo-700',
  Tentative: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-500',
  UnderReview: 'bg-amber-100 text-amber-700',
  Declined: 'bg-red-100 text-red-700',
  PendingCheckerReview: 'bg-indigo-100 text-indigo-700',
  Pending: 'bg-amber-100 text-amber-700',
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
    STATUS_CLASS[status] ?? 'bg-gray-100 text-gray-700',
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
              className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg max-w-xs px-3 py-2"
            >
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                {t('fields.reason')}
              </p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{trimmedReason}</p>
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
