import { useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';
import { ValidationText } from '@/shared/components/form/ValidationText';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import { runGuarded } from '@/shared/utils/runGuarded';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { useCanOpenAppraisalWorkspace } from '@/features/appraisal/hooks/useCanOpenAppraisalWorkspace';
import { useAppraisalCopyHandler } from '../contexts/AppraisalCopyContext';
import { CI_PURPOSES, PREV_APP_NO_REQUIRED } from '../configs/fields';
import SearchAppraisalModal from './SearchAppraisalModal';

const NAME = 'detail.prevAppraisalReportNo';
const ID = 'detail.prevAppraisalId';
const VALUE = 'detail.prevAppraisalValue';
const DATE = 'detail.prevAppraisalDate';

const linkButton = 'font-medium text-(--palette-primary-text) hover:underline disabled:opacity-50';

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
  const latestPurposeName = useParameterDescription(
    'AppraisalPurpose',
    copy?.chain?.latestAppraisal?.purposeCode,
  );
  const { fieldState } = useController({ name: NAME, control });
  const error = fieldState.error?.message;

  if (!purpose) {
    return (
      <div
        data-field={NAME}
        className="col-span-12 flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-(--palette-gray-600)"
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
        onSelect={(template, chain) =>
          runGuarded(() => copy.onSelect(template, chain), t('common:status.error'))
        }
        purpose={purpose}
      />
    ) : null;

  if (hasPrior) {
    // The construction-inspection extras: only for those purposes, and only what the page handed
    // down. For a submitted or read-only request the page leaves out the block reason and the newer
    // appraisal (they would only describe this request itself), so the prior's own figure and the
    // round stay and nothing red shows.
    const ci = CI_PURPOSES.includes(purpose);
    const chain = ci ? (copy?.chain ?? null) : null;
    const blocked = ci ? (copy?.rejection ?? chain?.blockReason ?? null) : null;
    // Only this appraisal's own figure is shown beside its number, never one the chain took from
    // another appraisal (`chain.construction` decides blocking, not display)
    const own = blocked ? null : chain?.selected;
    const ownPct = own?.progressPct;
    const latest = blocked ? null : (chain?.latestAppraisal ?? null);
    const facts = [
      // No value (masked, never set, or 0 from the API) reads "—", as the search modal shows it.
      Number(value) > 0
        ? t('copyBanner.value', {
            n: formatNumber(Number(value), Number.isInteger(Number(value)) ? 0 : 2),
          })
        : t('requestForm.prior.valueNone'),
      date && t('copyBanner.date', { date: formatDate(date, 'dd/MM/yyyy') }),
      ci && !blocked && round != null && t('requestForm.prior.round', { n: round }),
    ].filter(Boolean);
    const swapToLatest = canEdit ? copy?.onUseLatest : undefined;
    return (
      <div data-field={NAME} className="col-span-12">
        <div
          role="status"
          className={clsx(
            'flex flex-col overflow-hidden rounded-lg border text-xs text-(--palette-ink)',
            blocked
              ? 'border-danger bg-(--palette-req-wash)'
              : 'border-(--palette-accent-line) bg-(--palette-accent-wash)',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5">
            <Icon
              name={blocked ? 'circle-exclamation' : 'circle-info'}
              style="solid"
              className={clsx(
                'shrink-0',
                blocked ? 'text-danger' : 'text-(--palette-primary-text)',
              )}
            />
            <span className="font-medium text-(--palette-gray-600)">{t('copyBanner.label')}</span>
            {canOpen && id ? (
              <Link
                to={`/appraisals/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t('copyBanner.openTitle')}
                className="font-semibold text-(--palette-accent-ink) hover:underline"
              >
                {number}
              </Link>
            ) : (
              <strong className="font-semibold text-(--palette-ink)">{number}</strong>
            )}
            {facts.map(fact => (
              <span key={String(fact)} className="text-(--palette-gray-600)">
                <span aria-hidden className="mr-2 text-(--palette-gray-300)">
                  ·
                </span>
                {fact}
              </span>
            ))}
            {/* Same rule as the latest-choice dialog: undefined = nothing, null = no data, number = chip. */}
            {ownPct !== undefined && (
              <span className="text-(--palette-gray-600)">
                <span aria-hidden className="mr-2 text-(--palette-gray-300)">
                  ·
                </span>
                {ownPct === null
                  ? t('constructionGuard.noData')
                  : t('constructionGuard.chip', {
                      pct: formatNumber(ownPct, Number.isInteger(ownPct) ? 0 : 2),
                    })}
              </span>
            )}
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
                  className="inline-flex items-center gap-1 text-(--palette-gray-500) hover:text-(--palette-ink) disabled:opacity-50"
                >
                  <Icon name="xmark" style="solid" />
                  {t('requestForm.prior.clear')}
                </button>
              </span>
            )}
          </div>
          {latest && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) px-3 py-1.5 text-amber-900 dark:text-amber-200">
              <Icon
                name="triangle-exclamation"
                style="solid"
                className="shrink-0 text-amber-600 dark:text-amber-400"
              />
              <span>
                {t('constructionGuard.notLatest', {
                  latest: latest.appraisalNumber,
                  purpose: latestPurposeName,
                  date: formatDate(latest.completedAt, 'dd/MM/yyyy'),
                })}
              </span>
              {swapToLatest && (
                <button
                  type="button"
                  onClick={() =>
                    runGuarded(() => swapToLatest(latest.appraisalId), t('common:status.error'))
                  }
                  disabled={copy?.disabled}
                  className={clsx(linkButton, 'ml-auto')}
                >
                  {t('constructionGuard.useLatestInstead', { latest: latest.appraisalNumber })}
                </button>
              )}
            </div>
          )}
        </div>
        {blocked && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {t(`constructionGuard.rejected.${blocked}`)}
          </p>
        )}
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
        <span className="mb-1 block text-xs font-medium text-(--palette-ink)">
          {t('fields.prevAppraisalReportNo')}
        </span>
        <div className="py-2 text-sm text-(--palette-gray-400)">—</div>
      </div>
    );
  }
  return (
    <div data-field={NAME} className="col-span-6">
      <label className="mb-1 block text-xs font-medium text-(--palette-ink)">
        {t('fields.prevAppraisalReportNo')}
        <span className="text-(--palette-req) ml-0.5">*</span>
      </label>
      <button
        type="button"
        onClick={() => setSearching(true)}
        disabled={copy.disabled}
        title={t('requestForm.prior.search')}
        className={clsx(
          'flex w-full items-center gap-2 rounded-lg border bg-(--form-input-bg) px-3 py-2 text-left text-sm text-(--palette-gray-400) transition-colors disabled:cursor-not-allowed disabled:bg-(--palette-surface-2)',
          error
            ? 'border-danger'
            : 'border-(--palette-input-edge) hover:border-(--palette-input-edge-hover)',
        )}
      >
        <span>{t('requestForm.prior.search')}</span>
        <Icon name="magnifying-glass" style="regular" className="ml-auto" />
      </button>
      {error && (
        <p className="mt-1 text-xs text-danger">
          <ValidationText message={error} />
        </p>
      )}
      {isCreate && (
        <p className="mt-1 text-xs text-(--palette-gray-500)">
          {t('requestForm.prior.createHint')}
        </p>
      )}
      {modal}
    </div>
  );
}
