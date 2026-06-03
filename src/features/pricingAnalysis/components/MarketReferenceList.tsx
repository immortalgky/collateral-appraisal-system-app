/**
 * MarketReferenceList
 *
 * Shows the list of saved reference analyses for a field and lets the user:
 *  - Add a new reference (calls CreateOrGetReference)
 *  - Open an existing reference (switches to MarketReferenceMethodPanel)
 *  - One-click apply a method's valuePerUnit to the target field
 *  - Delete a reference
 */
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import {
  useGetReferences,
  useCreateOrGetReference,
  type PricingAnalysisSubjectType,
  type ReferenceDto,
} from '../api/references';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketReferenceListProps {
  subjectType: PricingAnalysisSubjectType;
  anchorId: string;
  anchorRefKey?: string | null;
  hostMethodId?: string | null;
  /** Called when user clicks "Open" on a reference to drill into the panel */
  onOpenReference: (ref: ReferenceDto) => void;
  /** Called when user clicks "Use this value". When omitted, the apply button is hidden. */
  onApplyValue?: (value: number) => void;
  /** If true, apply and delete actions are hidden (read-only mode) */
  readOnly?: boolean;
  /** Friendly label for room-type anchor mismatch detection */
  currentAnchorLabel?: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function formatNumber(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function methodTypeLabel(methodType: string): string {
  switch (methodType) {
    case 'WQS_MARKET': return 'WQS';
    case 'SAG_MARKET': return 'SAG';
    case 'DC_MARKET': return 'DC';
    default: return methodType;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketReferenceList({
  subjectType,
  anchorId,
  anchorRefKey,
  hostMethodId,
  onOpenReference,
  onApplyValue,
  readOnly,
  currentAnchorLabel,
}: MarketReferenceListProps) {
  const { t } = useTranslation('pricingAnalysis');

  const { data, isLoading, isError, refetch } = useGetReferences(subjectType, anchorId, anchorRefKey);
  const createMutation = useCreateOrGetReference();

  const references = data?.references ?? [];

  const handleAdd = async () => {
    try {
      const result = await createMutation.mutateAsync({
        subjectType,
        anchorId,
        anchorRefKey,
        hostMethodId,
      });
      // Find the newly created reference and open it
      await refetch();
      // Use the response to find/open the new ref — create a minimal ReferenceDto
      const syntheticRef: ReferenceDto = {
        pricingAnalysisId: result.pricingAnalysisId,
        subjectType,
        anchorId,
        anchorRefKey: anchorRefKey ?? null,
        hostMethodId: hostMethodId ?? null,
        status: 'active',
        methods: [],
      };
      onOpenReference(syntheticRef);
    } catch {
      toast.error(t('marketRef.createFailed'));
    }
  };

  const handleApply = (value: number) => {
    onApplyValue?.(value);
    toast.success(t('marketRef.applySuccess'));
  };

  // Detect unmatched room anchor (anchorRefKey has been renamed externally)
  const isRoomRef = anchorRefKey != null;
  const isUnmatched =
    isRoomRef && currentAnchorLabel != null && currentAnchorLabel !== anchorRefKey;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-gray-500">
        <Icon name="triangle-exclamation" className="size-5 text-red-400" />
        <span>{t('marketRef.loadFailed')}</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-primary hover:underline"
        >
          {t('errors.loadFailed')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Unmatched warning */}
      {isUnmatched && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Icon name="triangle-exclamation" className="size-3.5 shrink-0 mt-0.5 text-amber-500" />
          <span>{t('marketRef.unmatchedRoom')}</span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : references.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-10 border border-dashed border-gray-200 rounded-xl text-center">
          <Icon name="chart-bar" className="size-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">{t('marketRef.noReferences')}</p>
          <p className="text-xs text-gray-400 max-w-xs">{t('marketRef.noReferencesHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {references.map((ref, refIdx) => (
            <div
              key={ref.pricingAnalysisId}
              className="rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Reference header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  #{refIdx + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenReference(ref)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <Icon name="arrow-up-right-from-square" className="size-3" />
                    {t('marketRef.openReference')}
                  </button>
                  {/* Delete: hidden until backend exposes DELETE /pricing-analysis/{id} for references */}
                </div>
              </div>

              {/* Methods */}
              {ref.methods.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400">{t('marketRef.noValue')}</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {ref.methods.map(method => (
                    <div
                      key={method.methodId}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            'bg-blue-50 text-blue-700 border border-blue-100',
                          )}
                        >
                          {methodTypeLabel(method.methodType)}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{t('marketRef.valuePerUnit')}</span>
                          <span
                            className={clsx(
                              'text-sm font-semibold tabular-nums',
                              method.valuePerUnit != null ? 'text-gray-900' : 'text-gray-400',
                            )}
                          >
                            {method.valuePerUnit != null
                              ? formatNumber(method.valuePerUnit)
                              : t('marketRef.noValue')}
                          </span>
                        </div>
                        {method.finalValue != null && (
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">{t('marketRef.finalValue')}</span>
                            <span className="text-sm font-medium text-gray-700 tabular-nums">
                              {formatNumber(method.finalValue)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Apply button — only shown when onApplyValue is provided */}
                      {!readOnly && onApplyValue && method.valuePerUnit != null && (
                        <button
                          type="button"
                          onClick={() => handleApply(method.valuePerUnit!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          <Icon name="check" className="size-3" />
                          {t('marketRef.applyValue')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!readOnly && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={createMutation.isPending}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-primary border border-dashed border-primary/40 rounded-xl hover:bg-primary/5 hover:border-primary/60 transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? (
            <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <>
              <Icon name="plus" className="size-3.5" />
              {t('marketRef.addReference')}
            </>
          )}
        </button>
      )}

    </div>
  );
}
