import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { useDiscardFailedMessages, useRetryFailedMessages } from '../api/failedMessages';
import { useResendOutboxMessages } from '../api/outboxMessages';
import type { FailedMessageListItem, OutboxListItem } from '../types';
import {
  classifyOutboxFailure,
  countBy,
  formatClockCeilMinute,
  groupRetrySelection,
  outboxTableName,
  parseLocalDateTime,
} from '../utils/queueHealth';
import { refListText } from '../utils/labels';

export type RetryableItem = Pick<
  FailedMessageListItem,
  | 'id'
  | 'sourceQueue'
  | 'node'
  | 'isOrderedQueue'
  | 'isNonTransient'
  | 'kind'
  | 'refType'
  | 'refNumber'
  | 'status'
  | 'retryAvailableAt'
>;

export type ConfirmRequest =
  // `items` is the FULL selection, unfiltered — the dialog itself groups it into sendable /
  // waitingToSend / tooSoon via `groupRetrySelection` below. `origin` drives confirmDoneEffects: only
  // a 'bulk' confirm clears the page's bulk selection on success, a 'drawer' one leaves it alone.
  | { kind: 'retry'; items: RetryableItem[]; origin: 'bulk' | 'drawer' }
  | { kind: 'discard'; items: RetryableItem[]; origin: 'bulk' | 'drawer' }
  | { kind: 'resend'; items: OutboxListItem[]; origin: 'bulk' | 'drawer' };

interface ConfirmActionDialogProps {
  request: ConfirmRequest | null;
  onClose: () => void;
  onDone: () => void;
  // The server's own clock (see serverClock in utils/queueHealth.ts) — used to exclude any retry item
  // still inside its post-fault wait window from the actual send, not just warn about it.
  now: Date | null;
}

interface FormValues {
  reason: string;
}

const REASON_MAX_LENGTH = 500;

const makeOptionalReasonSchema = (t: TFunction<'failedMessages'>) =>
  z.object({
    reason: z.string().trim().max(REASON_MAX_LENGTH, t('confirm.reasonTooLong')),
  });
const makeRequiredReasonSchema = (t: TFunction<'failedMessages'>) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(1, t('confirm.reasonRequired'))
      .max(REASON_MAX_LENGTH, t('confirm.reasonTooLong')),
  });

const ConfirmActionDialog = ({ request, onClose, onDone, now }: ConfirmActionDialogProps) => {
  const { t } = useTranslation('failedMessages');
  const retryMutation = useRetryFailedMessages();
  const discardMutation = useDiscardFailedMessages();
  const resendMutation = useResendOutboxMessages();

  const schema = useMemo(
    () => (request?.kind === 'discard' ? makeRequiredReasonSchema(t) : makeOptionalReasonSchema(t)),
    [request?.kind, t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });

  // Synchronous re-entry guard: RHF's validation is async and the mutation only goes pending after
  // it, so a fast double-click would otherwise start two submits. Held from the first click until
  // validation fails, the mutation settles, or the dialog's request changes.
  const submittingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = false;
    if (request) reset({ reason: '' });
  }, [request, reset]);

  // SNAPSHOT of the grouping, taken once per `request` (not per `now` tick): the set POSTed must be
  // the one the operator read, and new warnings must not appear in the render of the click.
  const nowRef = useRef(now);
  nowRef.current = now;
  const retryGroups = useMemo(
    () =>
      request?.kind === 'retry'
        ? groupRetrySelection(request.items as RetryableItem[], nowRef.current)
        : null,
    [request],
  );

  if (!request) return null;

  const { kind, items } = request;
  // The page passes the FULL (mixed) selection for a retry — this dialog is the one place that
  // splits it into what can actually be sent now vs. what's already waiting vs. what's too soon.
  const sendableRetryItems = retryGroups?.sendable ?? [];
  const count = kind === 'retry' ? sendableRetryItems.length : items.length;
  const nothingSendable = kind === 'retry' && sendableRetryItems.length === 0;

  const isLoading =
    isSubmitting ||
    retryMutation.isPending ||
    discardMutation.isPending ||
    resendMutation.isPending;

  const breakdown =
    kind === 'resend'
      ? countBy(items as OutboxListItem[], i => outboxTableName(i.module))
      : kind === 'retry'
        ? countBy(sendableRetryItems, i => `${i.sourceQueue} @ ${i.node}`)
        : countBy(items as RetryableItem[], i => `${i.sourceQueue} @ ${i.node}`);

  const orderedItems = kind === 'retry' ? sendableRetryItems.filter(i => i.isOrderedQueue) : [];
  const nonTransientItems =
    kind === 'retry' ? sendableRetryItems.filter(i => i.isNonTransient) : [];
  const skippedItems = kind === 'retry' ? sendableRetryItems.filter(i => i.kind === 'Skipped') : [];
  // null/absent newerSentCount = unknown (history past the 7-day retention was purged) — a separate
  // "can't verify" bucket, never folded into "none sent".
  const newerSentItems =
    kind === 'resend'
      ? (items as OutboxListItem[]).filter(i => i.newerSentCount != null && i.newerSentCount > 0)
      : [];
  const newerSentUnknownItems =
    kind === 'resend' ? (items as OutboxListItem[]).filter(i => i.newerSentCount == null) : [];
  const payloadWarningItems =
    kind === 'resend'
      ? (items as OutboxListItem[]).filter(i => classifyOutboxFailure(i) === 'payloadWarning')
      : [];
  const waitingToSendCount = retryGroups?.waitingToSend.length ?? 0;
  const tooSoonItems = retryGroups?.tooSoon ?? [];
  const latestTooSoonAt = tooSoonItems.reduce<string | undefined>(
    (latest, i) =>
      !latest || parseLocalDateTime(i.retryAvailableAt!) > parseLocalDateTime(latest)
        ? i.retryAvailableAt
        : latest,
    undefined,
  );

  const release = () => {
    submittingRef.current = false;
  };
  const callbacks = { onSuccess: onDone, onSettled: release };

  const onValid = (values: FormValues) => {
    const reason = values.reason.trim() || undefined;
    if (kind === 'retry') {
      retryMutation.mutate({ ids: sendableRetryItems.map(i => i.id), reason }, callbacks);
    } else if (kind === 'discard') {
      discardMutation.mutate(
        { ids: items.map(i => i.id), reason: values.reason.trim() },
        callbacks,
      );
    } else {
      resendMutation.mutate(
        { items: (items as OutboxListItem[]).map(i => ({ module: i.module, id: i.id })), reason },
        callbacks,
      );
    }
  };

  const submit = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    void handleSubmit(onValid, release)();
  };

  const title = nothingSendable
    ? t('confirm.nothingSendableTitle')
    : kind === 'retry'
      ? t('confirm.retryTitle', { count })
      : kind === 'discard'
        ? t('confirm.discardTitle', { count })
        : t('confirm.resendTitle', { count });
  const confirmText =
    kind === 'retry'
      ? t('confirm.retryConfirm', { count })
      : kind === 'discard'
        ? t('confirm.discardConfirm', { count })
        : t('confirm.resendConfirm', { count });
  const description =
    kind === 'retry'
      ? t('confirm.retryDescription')
      : kind === 'discard'
        ? t('confirm.discardDescription')
        : t('confirm.resendDescription');
  const variant = kind === 'discard' ? 'danger' : 'primary';

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={submit}
      title={title}
      confirmText={confirmText}
      cancelText={t('confirm.cancel')}
      variant={variant}
      isLoading={isLoading}
      loadingText={t('confirm.processing')}
      hasWarning={nothingSendable}
      customFooter={
        nothingSendable ? (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            {t('confirm.cancel')}
          </button>
        ) : undefined
      }
    >
      <div className="text-left flex flex-col gap-3">
        <p className="text-[13px] text-gray-500">{description}</p>
        {kind === 'retry' && nothingSendable && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-[13px]">
            {t('confirm.nothingSendable')}
          </div>
        )}
        {kind === 'retry' && tooSoonItems.length > 0 && (
          <p className="text-[12px] text-gray-400">
            {t('confirm.tooSoonNote', {
              count: tooSoonItems.length,
              time: formatClockCeilMinute(latestTooSoonAt),
            })}
          </p>
        )}
        {kind === 'retry' && waitingToSendCount > 0 && (
          <p className="text-[12px] text-gray-400">
            {t('confirm.retryExcludesRequested', { count: waitingToSendCount })}
          </p>
        )}

        {breakdown.length > 0 && (
          <table className="w-full text-[13px] border border-gray-200 rounded-lg overflow-hidden">
            <tbody>
              {breakdown.map(([label, n]) => (
                <tr key={label} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-2.5 py-1.5 font-mono">{label}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {orderedItems.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-[13px] flex flex-col gap-1">
            <b>{t('confirm.orderedWarningTitle', { count: orderedItems.length })}</b>
            <span>
              {refListText(t, orderedItems)} · {t('confirm.orderedWarningBody')}
            </span>
          </div>
        )}
        {nonTransientItems.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-[13px] flex flex-col gap-1">
            <b>{t('confirm.nonTransientWarningTitle', { count: nonTransientItems.length })}</b>
            <span>
              {t('confirm.nonTransientWarningBody', {
                refs: refListText(t, nonTransientItems),
              })}
            </span>
          </div>
        )}
        {skippedItems.length > 0 && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 text-sky-700 px-3 py-2 text-[13px] flex flex-col gap-1">
            <b>{t('confirm.skippedWarningTitle', { count: skippedItems.length })}</b>
            <span>{t('confirm.skippedWarningBody')}</span>
          </div>
        )}
        {newerSentItems.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-[13px] flex flex-col gap-1">
            <b>{t('confirm.newerSentWarning', { count: newerSentItems.length })}</b>
            <span>
              {t('confirm.newerSentWarningBody', {
                refs: refListText(t, newerSentItems),
              })}
            </span>
          </div>
        )}
        {newerSentUnknownItems.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-[13px] flex flex-col gap-1">
            <b>{t('confirm.newerSentUnknownWarning', { count: newerSentUnknownItems.length })}</b>
            <span>
              {t('confirm.newerSentUnknownWarningBody', {
                refs: refListText(t, newerSentUnknownItems),
              })}
            </span>
          </div>
        )}
        {payloadWarningItems.length > 0 && (
          <p className="text-[12px] text-amber-700">
            {t('confirm.payloadWarning', { count: payloadWarningItems.length })}
          </p>
        )}

        <div>
          <label htmlFor="confirm-reason" className="text-[13px] font-medium">
            {t('confirm.reasonLabel')}{' '}
            {kind === 'discard' ? (
              <span className="text-red-600">*</span>
            ) : (
              <span className="text-gray-400 font-normal">{t('confirm.reasonOptional')}</span>
            )}
          </label>
          <textarea
            id="confirm-reason"
            maxLength={REASON_MAX_LENGTH}
            {...register('reason')}
            placeholder={
              kind === 'discard'
                ? t('confirm.discardReasonPlaceholder')
                : kind === 'resend'
                  ? t('confirm.resendReasonPlaceholder')
                  : t('confirm.retryReasonPlaceholder')
            }
            className="mt-1 w-full min-h-[72px] rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {errors.reason && (
            <p className="text-[12px] text-red-600 mt-1">{errors.reason.message}</p>
          )}
        </div>
      </div>
    </ConfirmDialog>
  );
};

export default ConfirmActionDialog;
