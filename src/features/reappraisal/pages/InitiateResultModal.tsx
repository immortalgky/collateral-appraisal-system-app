import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import type { InitiateReappraisalResult, SkippedReappraisalItem } from '../types';

export const TAG =
  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap';

/** One line per book: what its request will start with. */
export function BookList({
  books,
}: {
  books: { bookNumber: string; hasPrior: boolean; tag?: ReactNode; note?: string }[];
}) {
  const { t } = useTranslation('reappraisal');
  return (
    <ul className="rounded-lg border border-(--palette-line) divide-y divide-(--palette-line-soft)">
      {books.map((b, i) => {
        const note =
          b.note ??
          (b.hasPrior
            ? t('detail.initiateModal.copiesPrior')
            : t('detail.initiateModal.startsEmpty'));
        return (
          // A book can repeat (several units of a block): the list never reorders, so the index is stable
          <li key={`${b.bookNumber}-${i}`} className="px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-(--palette-primary-text) tabular-nums">
                {b.bookNumber}
              </span>
              {b.tag}
            </div>
            {note && <p className="mt-0.5 text-[11px] text-(--palette-gray-500)">{note}</p>}
          </li>
        );
      })}
    </ul>
  );
}

const SKIP_REASON_KEY: Record<SkippedReappraisalItem['reason'], string> = {
  AlreadyInFlight: 'detail.successModal.alreadyInFlight',
  AlreadyReviewed: 'detail.successModal.alreadyReviewed',
  NoBookNumber: 'detail.successModal.noBookNumber',
  NotDue: 'detail.successModal.notDue',
  PriorNotCompleted: 'detail.successModal.priorNotCompleted',
};

export function InitiateResultModal({
  result,
  onClose,
}: {
  result: InitiateReappraisalResult | null;
  onClose: () => void;
}) {
  const { t } = useTranslation(['reappraisal', 'common']);
  const navigate = useNavigate();
  if (!result) return null;
  const accepted = result.accepted ?? [];
  const createdCount = result.acceptedCount ?? accepted.length;
  const skipped = result.skipped ?? [];
  return (
    <Modal isOpen onClose={onClose} title={t('detail.successModal.title')} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'size-9 shrink-0 rounded-full flex items-center justify-center',
              createdCount > 0 ? 'bg-primary/10' : 'bg-(--palette-warn-wash)',
            )}
          >
            <Icon
              style="solid"
              name={createdCount > 0 ? 'check' : 'ban'}
              className={clsx(
                'size-4',
                createdCount > 0
                  ? 'text-(--palette-primary-text)'
                  : 'text-amber-600 dark:text-amber-400',
              )}
            />
          </div>
          <div className="text-xs">
            <p className="text-sm font-semibold text-(--palette-ink)">
              {t('detail.successModal.createdDrafts', { total: createdCount })}
              {createdCount > 0 && (
                <span className="font-normal text-(--palette-gray-500)">
                  {' · '}
                  {t('detail.successModal.groupNumber')}{' '}
                  <span className="tabular-nums">{result.groupNumber}</span>
                </span>
              )}
            </p>
            {createdCount > 0 && (
              <p className="text-(--palette-gray-500) mt-0.5">
                {t('detail.successModal.notSubmitted')}
              </p>
            )}
          </div>
        </div>

        {accepted.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-(--palette-gray-600)">
              {t('detail.successModal.createdHeading')}
            </p>
            <BookList
              books={accepted.map(a => ({
                bookNumber: a.bookNumber,
                hasPrior: a.prevAppraisalId != null,
                tag: (
                  <span
                    className={clsx(
                      TAG,
                      'bg-primary/5 text-(--palette-primary-text) border-primary/20',
                    )}
                  >
                    {t('progress.draft')}
                  </span>
                ),
              }))}
            />
          </div>
        )}

        {skipped.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-(--palette-gray-600)">
              {t('detail.successModal.skippedHeading', { total: skipped.length })}
            </p>
            <BookList
              books={skipped.map(s => {
                const known = Object.prototype.hasOwnProperty.call(SKIP_REASON_KEY, s.reason);
                return {
                  bookNumber: s.oldAppraisalReportNumber ?? '—',
                  hasPrior: false,
                  tag: (
                    <span
                      className={clsx(
                        TAG,
                        'bg-(--palette-warn-wash) text-(--palette-warn) border-amber-200 dark:border-amber-500/30',
                      )}
                    >
                      {/* A reason this build does not know shows as the backend sent it */}
                      {known
                        ? t(SKIP_REASON_KEY[s.reason] as 'detail.successModal.notDue')
                        : s.reason}
                    </span>
                  ),
                  note: known ? t(`detail.successModal.reasonHint.${s.reason}`) : '',
                };
              })}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-(--palette-line-soft)">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('detail.backToList')}
          </Button>
          {createdCount > 0 && (
            <Button variant="primary" size="sm" onClick={() => navigate('/requests')}>
              {t('detail.successModal.goToRequests')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
