import { useId, useRef, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { NO_OUTLINE } from '@/shared/hooks/usePointerMode';
import { formatCurrency } from '@/shared/utils/formatUtils';
import AssignmentSlip, { type AssignmentSlipProps } from './AssignmentSlip';

const CHIP: Record<AssignmentSlipProps['result']['tone'], { box: string; icon?: string }> = {
  ok: { box: 'border-green-200 bg-green-50 text-green-700', icon: 'check' },
  // Unmet checks nobody has touched yet: no alarm, no icon.
  neutral: { box: 'border-gray-200 bg-gray-50 text-gray-600' },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-700', icon: 'exclamation' },
  error: { box: 'border-red-200 bg-red-50 text-red-700', icon: 'exclamation' },
};

/**
 * The slip for a narrow content area: a bar pinned to the bottom (total, checks x / y, Assign)
 * that opens the full AssignmentSlip in a bottom sheet. Same props as AssignmentSlip. Render it
 * where the page's bottom actions used to be: it is `sticky bottom-0`, so it also works as the
 * last child of the scrolling area.
 *
 * An action chosen inside the sheet (fix, assign, save draft, cancel) runs after the sheet has
 * finished closing, so the page can move focus or open a toast without the dialog taking it back.
 */
export default function AssignmentSlipBar(props: AssignmentSlipProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const { readOnly = false, result, fee, feeStatus, isAssigning, isSavingDraft } = props;
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const afterLeave = useRef<(() => void) | null>(null);

  const leaveThen = (action: () => void) => {
    afterLeave.current = action;
    setOpen(false);
  };
  const runAfterLeave = () => {
    const action = afterLeave.current;
    afterLeave.current = null;
    action?.();
  };

  const total = feeStatus === 'ready' && fee ? fee.total : null;
  const chip = CHIP[result.tone];

  return (
    <>
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-gray-200 bg-white px-5 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {!readOnly && result.blockReason && (
          <p
            id={reasonId}
            className={clsx(
              'mb-1 text-xs',
              result.blockTone === 'error' ? 'text-red-700' : 'text-gray-500',
            )}
          >
            {t(result.blockReason, result.blockParams)}
          </p>
        )}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="flex min-w-0 items-center gap-3 rounded-md text-left"
          >
            <span className="sr-only">{t('administration.slip.bar.open')}</span>
            <Icon name="chevron-up" style="solid" className="shrink-0 text-base text-gray-500" />
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-gray-500">
                {total !== null
                  ? t('administration.slip.fee.total')
                  : t('administration.slip.segment.fee')}
              </span>
              {total !== null ? (
                <span className="text-xl font-bold text-gray-800 tabular-nums">
                  {formatCurrency(total)}
                </span>
              ) : feeStatus === 'pending' ? (
                <span className="text-sm font-medium text-gray-500">
                  {t('feePreview.pending.title')}
                </span>
              ) : (
                <span className="text-xl font-bold text-gray-400">—</span>
              )}
            </span>
            {readOnly ? (
              <Badge tone="green" className="whitespace-nowrap">
                {t('administration.slip.status.assigned')}
              </Badge>
            ) : (
              <span
                className={clsx(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums',
                  chip.box,
                )}
              >
                {chip.icon && <Icon name={chip.icon} style="solid" />}
                <span aria-hidden="true">
                  {result.okCount} / {result.total}
                </span>
                <span className="sr-only">
                  {t('administration.slip.checks.progress', {
                    ok: result.okCount,
                    total: result.total,
                  })}
                </span>
              </span>
            )}
          </button>
          {!readOnly && (
            <Button
              type="button"
              size="lg"
              className="ml-auto shrink-0"
              onClick={props.onAssign}
              isLoading={isAssigning}
              disabled={!!result.blockReason || isSavingDraft}
              aria-describedby={result.blockReason ? reasonId : undefined}
            >
              {isAssigning ? t('administration.assigning') : t('administration.assign')}
            </Button>
          )}
        </div>
      </div>

      <Transition show={open} afterLeave={runAfterLeave}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50" style={NO_OUTLINE}>
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/35 transition-opacity duration-200 ease-linear data-closed:opacity-0"
          />
          <DialogPanel
            transition
            style={NO_OUTLINE}
            className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl transition duration-200 ease-out data-closed:translate-y-full"
          >
            <div className="relative pt-2">
              <div className="mx-auto h-1 w-9 rounded-full bg-gray-300" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common:actions.closePanel')}
                className="absolute top-1 right-3 flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Icon name="xmark" style="regular" className="text-base" />
              </button>
            </div>
            <AssignmentSlip
              {...props}
              embedded
              onFix={id => leaveThen(() => props.onFix(id))}
              onAssign={() => leaveThen(props.onAssign)}
              onSaveDraft={() => leaveThen(props.onSaveDraft)}
              onCancel={() => leaveThen(props.onCancel)}
            />
          </DialogPanel>
        </Dialog>
      </Transition>
    </>
  );
}
