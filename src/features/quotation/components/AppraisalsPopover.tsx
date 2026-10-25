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
import { SegmentChips } from './SegmentBadges';

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
        className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
              className="z-50 bg-(--palette-surface) rounded-lg border border-(--palette-line) shadow-lg min-w-[240px] max-w-xs"
            >
              <div className="px-3 py-2 border-b border-(--palette-line-soft)">
                <p className="text-xs font-semibold text-(--palette-ink)">
                  {t('appraisalsPopover.title')}
                </p>
                <p className="text-[10px] text-(--palette-gray-400)">
                  {t('appraisalsPopover.totalLabel', { count: totalAppraisals })}
                </p>
              </div>
              {appraisals.length === 0 ? (
                <p className="px-3 py-3 text-xs text-(--palette-gray-400) italic">
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
                        className="font-medium text-(--palette-ink) truncate"
                        title={ap.appraisalNumber ?? undefined}
                      >
                        {ap.appraisalNumber ?? '—'}
                      </span>
                      <SegmentChips segments={[ap.bankingSegment]} className="shrink-0" />
                      <span className="shrink-0 text-(--palette-gray-500)">
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
