import { useState } from 'react';
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
import Icon from '@/shared/components/Icon';
import type { AppraisalSummaryDto } from '../schemas/quotation';

interface AppraisalsPopoverProps {
  appraisals: AppraisalSummaryDto[];
  totalAppraisals: number;
}

/**
 * ⓘ popover next to the "Appraisals" count. Lists each appraisal in the quotation
 * with its admin-set Max Appraisal Duration (days). Mirrors InvitedCompaniesPopover.
 */
const AppraisalsPopover = ({ appraisals, totalAppraisals }: AppraisalsPopoverProps) => {
  const { t } = useTranslation('quotation');
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  if (totalAppraisals === 0) return null;

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        aria-label={t('aria.viewAppraisals')}
        className="inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors"
      >
        <Icon name="circle-info" style="solid" className="size-3.5" />
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[240px] max-w-xs"
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">
                  {t('appraisalsPopover.title')}
                </p>
                <p className="text-[10px] text-gray-400">
                  {t('appraisalsPopover.totalLabel', { count: totalAppraisals })}
                </p>
              </div>
              {appraisals.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400 italic">
                  {t('empty.namesUnavailable')}
                </p>
              ) : (
                <ul className="max-h-64 overflow-auto py-1">
                  {appraisals.map(ap => (
                    <li
                      key={ap.appraisalId}
                      className="px-3 py-1.5 text-xs flex items-center justify-between gap-3"
                    >
                      <span
                        className="font-medium text-gray-800 truncate"
                        title={ap.appraisalNumber ?? undefined}
                      >
                        {ap.appraisalNumber ?? '—'}
                      </span>
                      <span className="shrink-0 text-gray-500">
                        {ap.maxAppraisalDays != null
                          ? t('appraisalsPopover.maxDays', { count: ap.maxAppraisalDays })
                          : t('appraisalsPopover.notSet')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

export default AppraisalsPopover;
