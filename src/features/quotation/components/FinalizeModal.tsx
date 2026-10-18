import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Badge, { type BadgeTone } from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import Dropdown from '@/shared/components/inputs/Dropdown';
import Switch from '@/shared/components/inputs/Switch';
import Toggle from '@/shared/components/inputs/Toggle';
import { eligibleStaffQueryOptions } from '@/features/appraisal/api/administration';
import { getActivityConfig } from '@/features/task/config/activityConfig';
import { formatCurrency } from '@/shared/utils/formatUtils';
import {
  finalizeFormSchema,
  type FinalizeFormValues,
  type CompanyQuotationItemDto,
} from '../schemas/quotation';
import {
  isFinalizeOutcomeUnknown,
  useFinalizeQuotation,
  useGetAutoAssignPreview,
  type AutoAssignPreview,
  type AutoAssignPreviewAppraisal,
} from '../api/quotation';
import { itemNetFee } from '../utils/itemNetFee';
import BoldTrans from './BoldTrans';

/** Same pool the Administration page offers for follow-up staff. */
const FOLLOWUP_STAFF_ACTIVITY = 'appraisal-book-verification';

const OUTCOME_TONE: Record<AutoAssignPreviewAppraisal['predictedOutcome'], BadgeTone> = {
  Ready: 'green',
  Skipped: 'gray',
  Failed: 'red',
  Parked: 'yellow',
};

/** Reason codes mapped to literal keys: the typed `t` rejects keys built from a template. */
const REASON_KEYS = {
  parkedAt: 'finalize.autoAssign.reason.parkedAt',
  deleted: 'finalize.autoAssign.reason.deleted',
  workflowEnded: 'finalize.autoAssign.reason.workflowEnded',
  noAssignment: 'finalize.autoAssign.reason.noAssignment',
  notPending: 'finalize.autoAssign.reason.notPending',
  unpriced: 'finalize.autoAssign.reason.unpriced',
  constructionInspection: 'finalize.autoAssign.reason.constructionInspection',
  taskHeld: 'finalize.autoAssign.reason.taskHeld',
  taskHeldUnknown: 'finalize.autoAssign.reason.taskHeldUnknown',
  winnerUnavailable: 'finalize.autoAssign.reason.winnerUnavailable',
  assignmentNotReset: 'finalize.autoAssign.reason.assignmentNotReset',
  documentFollowupOpen: 'finalize.autoAssign.reason.documentFollowupOpen',
} as const;
type ReasonCode = keyof typeof REASON_KEYS;
// hasOwnProperty, not `in` (it would accept 'constructor'); the ES2020 lib has no Object.hasOwn.
const isReasonCode = (code: string): code is ReasonCode =>
  Object.prototype.hasOwnProperty.call(REASON_KEYS, code);

/**
 * Available only for a standalone quotation with the go-live flag on. `standalone` is a second guard
 * behind the caller's own gate; the backend refuses autoAssign for task-started quotations.
 */
const offersAutoAssign = (preview: AutoAssignPreview | undefined) =>
  preview?.standalone === true && preview.externalAssignmentEnabled;

interface AppraisalLabel {
  appraisalId: string;
  appraisalNumber?: string | null;
}

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  companyQuotationId: string;
  companyName: string;
  /** Winning company's per-appraisal items — drives the per-appraisal fee table. */
  winnerItems: CompanyQuotationItemDto[];
  /** Optional appraisal display labels (number, etc.) — keyed/looked up by appraisalId. */
  appraisals?: AppraisalLabel[];
  /** Offer "assign every appraisal right after finalize". Standalone quotation pages only. */
  allowAutoAssign?: boolean;
}

interface StaffSelectProps {
  options: { id: string; name: string }[];
  loading: boolean;
  value: string;
  onChange: (staffId: string) => void;
  label: string;
  placeholder: string;
  /** Compact is for the dense table cells only (DESIGN.md); the toolbar uses the regular size. */
  compact?: boolean;
}

/** The shared Dropdown; its placeholder entry is the blank pick (''), staff names show bare. */
const StaffSelect = ({
  options: staff,
  loading,
  value,
  onChange,
  label,
  placeholder,
  compact = false,
}: StaffSelectProps) => (
  <Dropdown
    compact={compact}
    aria-label={label}
    placeholder={placeholder}
    showValuePrefix={false}
    options={staff.map(s => ({ value: s.id, label: s.name, id: s.id }))}
    value={value || null}
    onChange={(id: string | null) => onChange(id ?? '')}
    disabled={loading}
    className="min-w-40"
  />
);

const FinalizeModal = ({
  isOpen,
  onClose,
  quotationId,
  companyQuotationId,
  companyName,
  winnerItems,
  appraisals,
  allowAutoAssign = false,
}: FinalizeModalProps) => {
  const { t } = useTranslation(['quotation', 'common']);
  const { mutate: finalize, isPending } = useFinalizeQuotation(quotationId);

  const { register, handleSubmit, reset } = useForm<FinalizeFormValues>({
    resolver: zodResolver(finalizeFormSchema),
  });

  // Auto-assign: the switch is the user's wish; `assigning` is what actually happens (needs the go-live flag).
  const {
    data: previewData,
    isFetching: isPreviewFetching,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useGetAutoAssignPreview(quotationId, isOpen && allowAutoAssign);
  // A cached answer is hidden while it is re-read (readiness may have moved since it was fetched),
  // and after a failed re-read, because TanStack keeps the stale data on error.
  const preview = isPreviewFetching || isPreviewError ? undefined : previewData;
  const [wantsAssign, setWantsAssign] = useState(true);
  // The user wants auto-assign but readiness is unknown: block the award rather than silently
  // award without assigning. Turning the switch off is the only way to a plain award from here.
  const previewUnavailable = allowAutoAssign && isPreviewError && !isPreviewFetching;
  const blockedByPreview = previewUnavailable && wantsAssign;
  const [manual, setManual] = useState(false);
  const [staffByAppraisal, setStaffByAppraisal] = useState<Record<string, string>>({});

  const autoAssignAvailable = offersAutoAssign(preview);
  // A cached answer counts here: it only sizes the dialog, it does not decide anything.
  const previewSaysUnavailable = previewData !== undefined && !offersAutoAssign(previewData);
  const assigning = wantsAssign && autoAssignAvailable;
  const previewRows = preview?.appraisals ?? [];
  const readiness = new Map(previewRows.map(a => [a.appraisalId, a]));
  // The backend classifies every appraisal with the same code the finalize loop runs; the modal only
  // groups by that prediction and never re-derives it from raw fields.
  const parkedRows = previewRows.filter(a => a.predictedOutcome === 'Parked');
  const readyRows = previewRows.filter(a => a.predictedOutcome === 'Ready');
  const readyCount = readyRows.length;
  const failedCount = previewRows.filter(a => a.predictedOutcome === 'Failed').length;
  // PMA rows keep the int-pma-input keyer (PMA rule), so only the others take a chosen person.
  const manualRows = readyRows.filter(a => !a.isPma);

  // One eligible-assignees query per manual row, sharing the cache with useGetEligibleStaff.
  const staffQueries = useQueries({
    queries: manualRows.map(a =>
      eligibleStaffQueryOptions(
        a.workflowInstanceId ?? undefined,
        FOLLOWUP_STAFF_ACTIVITY,
        assigning && manual,
      ),
    ),
  });
  const staffQueryOf = new Map(manualRows.map((a, i) => [a.appraisalId, staffQueries[i]]));
  // A row is missing its person when none is chosen, or the chosen one is not (or no longer) in
  // that row's loaded eligible list.
  const missingStaff =
    assigning &&
    manual &&
    manualRows.some(a => {
      const chosen = staffByAppraisal[a.appraisalId];
      return !chosen || !staffQueryOf.get(a.appraisalId)?.data?.some(s => s.id === chosen);
    });
  // "Same person for all" may only offer people who are eligible on every manual row.
  // A list that failed to load is left out rather than emptying the intersection; its row shows a retry.
  const staffLists = staffQueries.filter(q => !q.isError).map(q => q.data ?? []);
  const commonStaff = (staffLists[0] ?? []).filter(s =>
    staffLists.every(list => list.some(x => x.id === s.id)),
  );

  const handleClose = () => {
    reset();
    setWantsAssign(true);
    setManual(false);
    setStaffByAppraisal({});
    onClose();
  };

  const onSubmit = (values: FinalizeFormValues) => {
    finalize(
      {
        companyQuotationId,
        reason: values.reason ?? null,
        ...(assigning && {
          autoAssign: {
            staff: manual
              ? manualRows.map(a => ({
                  appraisalId: a.appraisalId,
                  staffId: staffByAppraisal[a.appraisalId],
                }))
              : [],
          },
        }),
      },
      // Only the dialog's own state is handled here. The result toasts are raised by the hook's
      // callbacks, which still run if this dialog unmounts mid-request (these per-call ones would not).
      {
        onSuccess: () => handleClose(),
        onError: err => {
          // No answer from the API itself: the award may have gone through, so close like a success.
          // A real refusal keeps the dialog open so the user can adjust and retry.
          if (assigning && isFinalizeOutcomeUnknown(err)) handleClose();
        },
      },
    );
  };

  const appraisalLabelFor = (appraisalId: string): string => {
    const match = appraisals?.find(a => a.appraisalId === appraisalId);
    return match?.appraisalNumber?.trim() || appraisalId.slice(0, 8);
  };

  const sortedItems = [...winnerItems].sort((a, b) => a.itemNumber - b.itemNumber);
  const grandTotal = sortedItems.reduce((sum, item) => sum + itemNetFee(item), 0);
  // Preview appraisals the winner has no item for still need their follow-up control, so they get a row too.
  const itemAppraisalIds = new Set(sortedItems.map(i => i.appraisalId));
  const extraRows = assigning ? previewRows.filter(p => !itemAppraisalIds.has(p.appraisalId)) : [];

  /** The reason text for a code, or nothing when the code is null or unknown (a bare status then). */
  const reasonFor = (code: string | null | undefined, values?: Record<string, string>) =>
    code && isReasonCode(code) ? t(REASON_KEYS[code], values) : undefined;

  /** What the finalize loop will do with the row: the badge status, and the reason shown beneath it. */
  const outcomeLabel = (row: AutoAssignPreviewAppraisal): { status: string; reason?: string } => {
    switch (row.predictedOutcome) {
      case 'Ready':
        // A PMA row is explained by its follow-up cell, so Ready carries no reason line.
        return { status: t('finalize.autoAssign.status.ready') };
      case 'Skipped':
        return { status: t('finalize.autoAssign.status.skipped'), reason: reasonFor(row.reason) };
      case 'Failed': {
        // A held task with no holder name must not read "task held by ".
        const holder = row.taskHeldBy?.trim();
        return {
          status: t('finalize.autoAssign.status.wontAssign'),
          reason:
            row.reason === 'taskHeld' && !holder
              ? reasonFor('taskHeldUnknown')
              : reasonFor(row.reason, { name: holder ?? '' }),
        };
      }
      case 'Parked':
        return {
          status: t('finalize.autoAssign.status.parked'),
          // Without an activity there is nothing to say after "at": bare status.
          reason: row.currentActivityId
            ? reasonFor('parkedAt', {
                activity: getActivityConfig(row.currentActivityId)?.title ?? row.currentActivityId,
              })
            : undefined,
        };
      default:
        // An outcome this build does not know (a newer API) still reads as a status, never blank.
        return { status: t('finalize.autoAssign.status.unknown') };
    }
  };

  const followupCell = (appraisalId: string) => {
    const row = readiness.get(appraisalId);
    if (row?.predictedOutcome !== 'Ready') return <span className="text-gray-400">—</span>;
    if (row.isPma)
      return <span className="text-xs text-gray-500">{t('finalize.autoAssign.pmaKeyer')}</span>;
    if (!manual)
      return (
        <span className="text-xs text-gray-500">{t('finalize.autoAssign.roundRobinHint')}</span>
      );
    const query = staffQueryOf.get(appraisalId);
    if (query?.isError)
      return (
        <span className="flex items-center gap-2 text-xs">
          <span className="text-danger">{t('finalize.autoAssign.staffLoadFailed')}</span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-medium text-primary hover:underline"
          >
            {t('finalize.autoAssign.retry')}
          </button>
        </span>
      );
    return (
      <StaffSelect
        compact
        options={query?.data ?? []}
        loading={isPending || (query?.isLoading ?? false)}
        value={staffByAppraisal[appraisalId] ?? ''}
        onChange={staffId => setStaffByAppraisal(prev => ({ ...prev, [appraisalId]: staffId }))}
        label={t('finalize.autoAssign.staffAria', { appraisal: appraisalLabelFor(appraisalId) })}
        placeholder={t('finalize.autoAssign.selectStaff')}
      />
    );
  };

  // The "same person for all" select shows the common pick, or blank while the rows differ.
  const firstPick = staffByAppraisal[manualRows[0]?.appraisalId ?? ''] ?? '';
  const sharedStaff = manualRows.every(a => (staffByAppraisal[a.appraisalId] ?? '') === firstPick)
    ? firstPick
    : '';

  // The readiness and follow-up columns need xl to fit without scrolling. xl from the first paint
  // (the preview is still loading) and narrowed only once a loaded preview says auto-assign is
  // unavailable. Not keyed on the switch, so toggling it does not resize the dialog.
  let dialogSize: 'md' | 'lg' | 'xl' = 'xl';
  if (!allowAutoAssign) dialogSize = 'md';
  else if (previewSaysUnavailable) dialogSize = 'lg';

  return (
    <Modal
      isOpen={isOpen}
      // Esc, backdrop and X must not dismiss the modal mid-request: it closes itself from the
      // mutation's per-call callbacks once the request settles.
      onClose={isPending ? () => {} : handleClose}
      title={t('finalize.title')}
      size={dialogSize}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-start gap-2">
          <Icon
            name="circle-check"
            style="solid"
            className="size-4 text-green-500 shrink-0 mt-0.5"
          />
          <div className="text-sm text-green-700">
            <p>
              <BoldTrans
                i18nKey={assigning ? 'finalize.awardBodyAssigning' : 'finalize.awardBody'}
                values={{ company: companyName }}
              />
            </p>
          </div>
        </div>

        {allowAutoAssign && (
          <div className="rounded-lg border border-gray-200 p-3 flex flex-col gap-3">
            <Switch
              checked={assigning || blockedByPreview}
              onChange={setWantsAssign}
              // Locked while the request runs, so the dialog cannot show settings other than what was sent.
              disabled={isPending || (!previewUnavailable && !autoAssignAvailable)}
              label={t('finalize.autoAssign.title')}
              description={t('finalize.autoAssign.description')}
            />
            {isPreviewFetching && (
              <p className="text-xs text-gray-500">{t('finalize.autoAssign.checking')}</p>
            )}
            {previewUnavailable && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-700">
                <span>{t('finalize.autoAssign.previewFailed')}</span>
                <button
                  type="button"
                  onClick={() => refetchPreview()}
                  className="font-medium text-primary hover:underline"
                >
                  {t('finalize.autoAssign.retry')}
                </button>
              </p>
            )}
            {preview && !preview.standalone && (
              <p className="text-xs text-amber-700">{t('finalize.autoAssign.notStandalone')}</p>
            )}
            {preview?.standalone && !preview.externalAssignmentEnabled && (
              <p className="text-xs text-amber-700">{t('finalize.autoAssign.notEnabled')}</p>
            )}

            {assigning && (
              <div className="flex flex-wrap items-end gap-3">
                <Toggle
                  label={t('finalize.autoAssign.followupMode')}
                  options={[t('finalize.autoAssign.roundRobin'), t('finalize.autoAssign.manual')]}
                  checked={manual}
                  onChange={setManual}
                  disabled={isPending}
                />
                {manual && manualRows.length > 1 && (
                  <StaffSelect
                    options={commonStaff}
                    loading={isPending || staffQueries.some(q => q.isLoading)}
                    value={sharedStaff}
                    // Only rows whose list has loaded and contains this person take it; the rest
                    // are left as they were, so a row that could not be filled still counts as missing.
                    // The blank option clears every manual row's pick.
                    onChange={staffId =>
                      setStaffByAppraisal(prev => {
                        const next = { ...prev };
                        manualRows.forEach(a => {
                          if (!staffId) {
                            delete next[a.appraisalId];
                          } else if (
                            staffQueryOf.get(a.appraisalId)?.data?.some(s => s.id === staffId)
                          ) {
                            next[a.appraisalId] = staffId;
                          }
                        });
                        return next;
                      })
                    }
                    label={t('finalize.autoAssign.sameForAll')}
                    placeholder={t('finalize.autoAssign.sameForAll')}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  {t('finalize.appraisal')}
                </th>
                {assigning && (
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    {t('finalize.autoAssign.readiness')}
                  </th>
                )}
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">
                  {t('finalize.feeNet')}
                </th>
                {assigning && (
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    {t('finalize.autoAssign.followup')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedItems.length === 0 && extraRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={assigning ? 4 : 2}
                    className="px-3 py-3 text-center text-sm text-gray-500"
                  >
                    {t('finalize.noItems')}
                  </td>
                </tr>
              ) : (
                [
                  ...sortedItems.map(item => ({
                    key: item.id,
                    appraisalId: item.appraisalId,
                    fee: itemNetFee(item),
                  })),
                  ...extraRows.map(p => ({
                    key: p.appraisalId,
                    appraisalId: p.appraisalId,
                    fee: null,
                  })),
                ].map(({ key, appraisalId, fee }) => {
                  const row = readiness.get(appraisalId);
                  // The badge keeps the short status on one line, the reason wraps beneath it.
                  const outcome = row ? outcomeLabel(row) : null;
                  return (
                    <tr key={key}>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {appraisalLabelFor(appraisalId)}
                      </td>
                      {assigning && (
                        <td className="px-3 py-2 text-sm">
                          {row && outcome && (
                            // The width cap sits on a div: Firefox ignores max-width on table cells.
                            <div className="max-w-[18rem]">
                              <Badge
                                size="sm"
                                tone={OUTCOME_TONE[row.predictedOutcome] ?? 'gray'}
                                className="whitespace-nowrap"
                              >
                                {outcome.status}
                              </Badge>
                              {outcome.reason && (
                                <p className="mt-0.5 text-xs text-gray-500">{outcome.reason}</p>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right text-sm text-gray-900 tabular-nums whitespace-nowrap">
                        {fee != null ? (
                          formatCurrency(fee)
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {assigning && (
                        <td className="px-3 py-2 text-sm">{followupCell(appraisalId)}</td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedItems.length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td
                    colSpan={assigning ? 2 : 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    {t('finalize.total')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {formatCurrency(grandTotal)}
                  </td>
                  {assigning && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {assigning && parkedRows.length > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-gray-700"
          >
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="size-3.5! text-amber-500 shrink-0"
            />
            <p>
              {t('finalize.autoAssign.parkedNote', {
                list: parkedRows
                  .map(a => a.appraisalNumber?.trim() || appraisalLabelFor(a.appraisalId))
                  .join(', '),
              })}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.notes')}{' '}
            <span className="text-xs text-gray-400">{t('fields.notesOptional')}</span>
          </label>
          <textarea
            {...register('reason')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
            placeholder={t('placeholders.notes')}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-col gap-0.5 text-xs text-gray-500">
            {missingStaff ? (
              <span>{t('finalize.autoAssign.manualIncomplete')}</span>
            ) : (
              assigning && (
                <>
                  <span className="flex flex-wrap gap-x-1">
                    <span>
                      {t('finalize.autoAssign.counts', {
                        ready: readyCount,
                        parked: parkedRows.length,
                      })}
                    </span>
                    {failedCount > 0 && (
                      <span>
                        · {t('finalize.autoAssign.willNotBeAssigned', { n: failedCount })}
                      </span>
                    )}
                  </span>
                  {/* autoAssign is still sent so the Failed / Parked outcomes get recorded. */}
                  {readyCount === 0 && <span>{t('finalize.autoAssign.noneReady')}</span>}
                </>
              )
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              // A plain award (switch off) does not use the preview, so it need not wait for it.
              disabled={
                isPending || (wantsAssign && isPreviewFetching) || missingStaff || blockedByPreview
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  {t('finalize.awarding')}
                </>
              ) : (
                <>
                  <Icon name="flag-checkered" style="solid" className="size-4 mr-2" />
                  {assigning && readyCount > 0
                    ? t('finalize.autoAssign.assignButton', { n: readyCount })
                    : t('finalize.awardButton')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default FinalizeModal;
