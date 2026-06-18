/**
 * GroupReferencesSection
 *
 * Shown inside the PricingAnalysisAccordion detail pane (Properties tab).
 * Displays all market references scoped to the group's PricingAnalysis
 * (those whose HostMethodId belongs to one of the group's methods).
 *
 * Actions: Open (drill-in) · Delete. No Add, no Apply.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { Icon } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import {
  useGetGroupReferences,
  useDeleteReference,
  PricingAnalysisSubjectType,
  type ReferenceDto,
} from '../api/references';
import { useGetComparativeAnalysisTemplates } from '@features/templateManagement/api/comparativeTemplate';
import { MarketReferenceModal } from './MarketReferenceModal';
import type { PropertyGroupItemDto } from '@/features/appraisal/api';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupReferencesSectionProps {
  /** The group's PricingAnalysis id (state.pricingAnalysisId) */
  pricingAnalysisId: string | undefined;
  /** Group methods for resolving host-method label */
  groupMethods: Array<{ id?: string; methodType: string; label: string }>;
  /** Group properties for resolving machinery item name */
  groupProperties: PropertyGroupItemDto[];
  /** Market surveys available for opening in the panel */
  marketSurveys: MarketComparableDetailType[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Map backend method type codes to display labels */
function methodTypeBadge(methodType: string): string {
  switch (methodType) {
    case 'WQS':
    case 'WQS_MARKET':
      return 'WQS';
    case 'SaleGrid':
    case 'SAG_MARKET':
      return 'SAG';
    case 'DirectComparison':
    case 'DC_MARKET':
      return 'DC';
    default:
      return methodType;
  }
}

// ── MachinerySubjectProperty (per-reference lazy fetch) ───────────────────────

function useMachineryDetail(
  appraisalId: string | undefined,
  propertyId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'property', propertyId, 'machinery-detail'],
    queryFn: async (): Promise<Record<string, unknown>> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/machinery-detail`,
      );
      return data as Record<string, unknown>;
    },
    enabled: enabled && !!appraisalId && !!propertyId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

// ── ReferenceRow ──────────────────────────────────────────────────────────────

interface ReferenceRowProps {
  ref_: ReferenceDto;
  groupMethods: GroupReferencesSectionProps['groupMethods'];
  groupProperties: PropertyGroupItemDto[];
  marketSurveys: MarketComparableDetailType[];
  templateList: TemplateDtoType[];
  readOnly: boolean;
  onDelete: (ref: ReferenceDto) => void;
}

function ReferenceRow({
  ref_,
  groupMethods,
  groupProperties,
  marketSurveys,
  templateList,
  readOnly,
  onDelete,
}: ReferenceRowProps) {
  const { t } = useTranslation('pricingAnalysis');
  const appraisalId = useAppraisalId();
  const [isOpen, setIsOpen] = useState(false);

  // Resolve host-method label from group methods
  const hostMethod = groupMethods.find(m => m.id === ref_.hostMethodId);
  const hostMethodLabel = hostMethod?.label ?? ref_.hostMethodId ?? '—';

  // Resolve item label by subjectType
  const isMachinery = ref_.subjectType === PricingAnalysisSubjectType.MachineryCostRef;
  const isRoom = ref_.subjectType === PricingAnalysisSubjectType.RoomIncomeRef;

  let itemLabel: string;
  if (isMachinery) {
    const prop = groupProperties.find(p => p.propertyId === ref_.anchorId);
    itemLabel = prop?.machineName ?? prop?.propertyName ?? t('groupReferences.subjects.machineryCostRef');
  } else if (isRoom) {
    itemLabel = ref_.anchorRefKey ?? t('groupReferences.subjects.roomIncomeRef');
  } else {
    // Static t() calls (typed i18n keys); dynamic template keys aren't allowed by the typed t().
    const subjectLabels: Record<number, string> = {
      [PricingAnalysisSubjectType.IncomeLandRef]: t('groupReferences.subjects.incomeLandRef'),
      [PricingAnalysisSubjectType.LeaseholdLandRef]: t('groupReferences.subjects.leaseholdLandRef'),
      [PricingAnalysisSubjectType.ProfitRentRef]: t('groupReferences.subjects.profitRentRef'),
    };
    itemLabel = subjectLabels[ref_.subjectType] ?? t('groupReferences.subjects.machineryCostRef');
  }

  // Fetch machinery detail for the subject-property auto-fill when drilling in
  const { data: machineryDetail } = useMachineryDetail(
    appraisalId ?? undefined,
    ref_.anchorId,
    isMachinery,
  );

  const subjectProperty = isMachinery ? machineryDetail : undefined;

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {/* Host method + item */}
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-400 truncate">{hostMethodLabel}</span>
            <span className="text-xs font-medium text-gray-800 truncate">{itemLabel}</span>
          </div>

          {/* Method badges + values */}
          {ref_.methods.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {ref_.methods.map(m => (
                <div key={m.methodId} className="flex items-center gap-1">
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                      'bg-primary/10 text-primary border border-primary/20',
                    )}
                  >
                    {methodTypeBadge(m.methodType)}
                  </span>
                  <span className="text-xs tabular-nums text-gray-700">
                    {m.valuePerUnit != null ? formatNumber(m.valuePerUnit) : t('groupReferences.noValue')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Icon name="arrow-up-right-from-square" className="size-3" />
            {t('groupReferences.openReference')}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onDelete(ref_)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 border border-red-200/50 rounded-lg hover:bg-red-50 transition-colors"
              title={t('groupReferences.deleteReference')}
            >
              <Icon name="trash" style="solid" className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Drill-in modal — no onApplyValue so apply button is hidden */}
      <MarketReferenceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        subjectType={ref_.subjectType}
        anchorId={ref_.anchorId}
        anchorRefKey={ref_.anchorRefKey}
        hostMethodId={ref_.hostMethodId}
        marketSurveys={marketSurveys}
        templateList={templateList}
        subjectProperty={subjectProperty}
        currentAnchorLabel={ref_.anchorRefKey ?? undefined}
        readOnly={readOnly}
      />
    </>
  );
}

// ── GroupReferencesSection ────────────────────────────────────────────────────

export function GroupReferencesSection({
  pricingAnalysisId,
  groupMethods,
  groupProperties,
  marketSurveys,
}: GroupReferencesSectionProps) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const [deleteTarget, setDeleteTarget] = useState<ReferenceDto | null>(null);

  const { data, isLoading } = useGetGroupReferences(pricingAnalysisId);
  const deleteMutation = useDeleteReference();
  // Fetch WQS/SAG/DC comparative template list for the drill-in panels
  const { data: templateList = [] } = useGetComparativeAnalysisTemplates();

  const references = data?.references ?? [];

  // Render nothing when there are no references (and not loading)
  if (!isLoading && references.length === 0) return null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({
        pricingAnalysisId: deleteTarget.pricingAnalysisId,
        subjectType: deleteTarget.subjectType,
        anchorId: deleteTarget.anchorId,
        anchorRefKey: deleteTarget.anchorRefKey,
        groupPricingAnalysisId: pricingAnalysisId,
      });
    } catch {
      toast.error(t('groupReferences.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="mt-3 space-y-1.5">
        {/* Section header */}
        <div className="flex items-center gap-1.5 mb-1">
          <Icon name="chart-bar" className="size-3 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {t('groupReferences.sectionTitle')}
          </span>
          {references.length > 0 && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
              {references.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-3">
            <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-1">
            {references.map(ref => (
              <ReferenceRow
                key={ref.pricingAnalysisId}
                ref_={ref}
                groupMethods={groupMethods}
                groupProperties={groupProperties}
                marketSurveys={marketSurveys}
                templateList={templateList}
                readOnly={readOnly}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title={t('groupReferences.deleteReference')}
        message={t('groupReferences.deleteConfirm')}
      />
    </>
  );
}
