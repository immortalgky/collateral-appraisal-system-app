import { useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import { runGuarded } from '@/shared/utils/runGuarded';
import { useCanOpenAppraisalWorkspace } from '@/features/appraisal/hooks/useCanOpenAppraisalWorkspace';
import { useAppraisalCopyHandler } from '../contexts/AppraisalCopyContext';
import { CI_PURPOSES, PREV_APP_NO_REQUIRED } from '../configs/fields';
import SearchAppraisalModal from './SearchAppraisalModal';

const NAME = 'detail.prevAppraisalReportNo';
const ID = 'detail.prevAppraisalId';
const VALUE = 'detail.prevAppraisalValue';
const DATE = 'detail.prevAppraisalDate';

const linkButton = 'font-medium text-primary hover:underline disabled:opacity-50';

/**
 * The prior appraisal of the request, in the "purpose and prior appraisal" group: one strip saying
 * which appraisal it follows (with change / clear), or a search field while there is none.
 *
 * Which of the three it is follows the purpose: none yet shows a hint; a purpose that does not use a
 * prior appraisal shows nothing, unless one is already picked (then the strip stays, so nothing
 * hidden is submitted unseen). Picking and clearing go through AppraisalCopyContext (the page's full
 * copy, with its own confirm dialogs). With no provider, or `meta.priorLocked`, the block is display-only: the
 * strip, or a dash, and no way to pick, change or clear.
 */
export default function PriorAppraisalBlock() {
  const { t } = useTranslation(['request', 'common']);
  const { control } = useFormContext();
  const readOnly = useFormReadOnly();
  const copy = useAppraisalCopyHandler();
  // Said by the page, not inferred from the provider: a submitted request (a route-back included),
  // whose appraisal is built from the prior, or a draft the periodical-reappraisal Initiate created,
  // whose prior the backend fixes
  const lockedByPage = !!useWatch({ control, name: 'meta.priorLocked' });
  const canOpen = useCanOpenAppraisalWorkspace();
  const isCreate = !useParams().requestId;
  const [searching, setSearching] = useState(false);

  const [purpose, id, number, value, date] = useWatch({
    control,
    name: ['purpose', ID, NAME, VALUE, DATE],
  });
  // Handed down by the page, not read from the form (see AppraisalCopyContext)
  const round = copy?.round ?? null;
  const { fieldState } = useController({ name: NAME, control });
  const error = fieldState.error?.message;

  if (!purpose) {
    return (
      <div
        data-field={NAME}
        className="col-span-12 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-gray-600"
      >
        <Icon name="circle-info" style="solid" className="shrink-0 text-blue-500" />
        {t('requestForm.choosePurposeFirst')}
      </div>
    );
  }
  const hasPrior = !!(id || number);
  // Locked: said by the page, or no handlers to pick with. Read-only is display-only too. The page
  // always mounts AppraisalCopyProvider, so in the app the lock rests on `meta.priorLocked`; `!copy`
  // is a safe default for a harness or a future caller with no handlers.
  const locked = lockedByPage || !copy;
  const canEdit = !readOnly && !locked;

  const modal =
    canEdit && copy ? (
      <SearchAppraisalModal
        isOpen={searching}
        onClose={() => setSearching(false)}
        onSelect={template => runGuarded(() => copy.onSelect(template), t('common:status.error'))}
      />
    ) : null;

  if (hasPrior) {
    const facts = [
      // No value (masked, never set, or 0 from the API) reads "—", as the search modal shows it.
      Number(value) > 0
        ? t('copyBanner.value', {
            n: formatNumber(Number(value), Number.isInteger(Number(value)) ? 0 : 2),
          })
        : t('requestForm.prior.valueNone'),
      date && t('copyBanner.date', { date: formatDate(date, 'dd/MM/yyyy') }),
      CI_PURPOSES.includes(purpose) && round != null && t('requestForm.prior.round', { n: round }),
    ].filter(Boolean);
    return (
      <div data-field={NAME} className="col-span-12">
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-primary-200 bg-primary-50/70 px-3 py-1.5 text-xs text-gray-700"
        >
          <Icon name="circle-info" style="solid" className="shrink-0 text-primary" />
          <span className="font-medium text-gray-600">{t('copyBanner.label')}</span>
          {canOpen && id ? (
            <Link
              to={`/appraisals/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('copyBanner.openTitle')}
              className="font-semibold text-primary-700 hover:underline"
            >
              {number}
            </Link>
          ) : (
            <strong className="font-semibold text-gray-900">{number}</strong>
          )}
          {facts.map(fact => (
            <span key={String(fact)} className="text-gray-600">
              <span aria-hidden className="mr-2 text-gray-300">
                ·
              </span>
              {fact}
            </span>
          ))}
          {canEdit && (
            <span className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSearching(true)}
                disabled={copy.disabled}
                className={linkButton}
              >
                {t('requestForm.prior.change')}
              </button>
              <button
                type="button"
                onClick={() => runGuarded(() => copy.onClear(), t('common:status.error'))}
                disabled={copy.disabled}
                aria-label={t('copyBanner.clearTitle')}
                title={t('copyBanner.clearTitle')}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Icon name="xmark" style="solid" />
                {t('requestForm.prior.clear')}
              </button>
            </span>
          )}
        </div>
        {modal}
      </div>
    );
  }

  // The search field exists only where a prior appraisal is asked for (there it is required).
  // Nothing to show on a page nobody can edit, or for a purpose that does not use one.
  if (readOnly || !PREV_APP_NO_REQUIRED.includes(purpose)) return null;
  // Locked and none was ever set: the label with a dash, and no way to choose one
  if (locked) {
    return (
      <div data-field={NAME} className="col-span-6">
        <span className="mb-1 block text-xs font-medium text-gray-700">
          {t('fields.prevAppraisalReportNo')}
        </span>
        <div className="py-2 text-sm text-gray-400">—</div>
      </div>
    );
  }
  return (
    <div data-field={NAME} className="col-span-6">
      <label className="mb-1 block text-xs font-medium text-gray-700">
        {t('fields.prevAppraisalReportNo')}
        <span className="text-danger ml-0.5">*</span>
      </label>
      <button
        type="button"
        onClick={() => setSearching(true)}
        disabled={copy.disabled}
        title={t('requestForm.prior.search')}
        className={clsx(
          'flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm text-gray-400 transition-colors disabled:cursor-not-allowed disabled:bg-gray-50',
          error ? 'border-danger' : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span>{t('requestForm.prior.search')}</span>
        <Icon name="magnifying-glass" style="regular" className="ml-auto" />
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {isCreate && (
        <p className="mt-1 text-xs text-gray-500">{t('requestForm.prior.createHint')}</p>
      )}
      {modal}
    </div>
  );
}
