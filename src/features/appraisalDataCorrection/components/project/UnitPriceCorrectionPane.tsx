import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FormLayoutProvider } from '@shared/components/form';
import Textarea from '@/shared/components/inputs/Textarea';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import { EditorHeader } from '@/features/appraisal/components/EditorHeader';
import UnitPriceTab from '@/features/blockProject/components/tabs/UnitPriceTab';
import type { ProjectType } from '@/features/blockProject/types';
import type { PropertyCorrectionDtoType } from '@shared/schemas/v1';
import {
  useCorrectProjectData,
  useCorrectProjectUnitPriceImport,
} from '../../api/appraisalDataCorrection';
import { readApiError } from '../../utils/readApiError';
import LatestCorrectionCard from '../LatestCorrectionCard';

interface UnitPriceCorrectionPaneProps {
  appraisalId: string;
  projectType: ProjectType;
  editCount: number | undefined;
  latestEdit: PropertyCorrectionDtoType | undefined;
  onOpenHistory: () => void;
  onDirtyChange: (isDirty: boolean) => void;
}

/**
 * The block page's unit price tab in correction mode: the same assumption panel, flags, preview and
 * import, but Save (recalculate) and an import each write one audited correction with the reason typed
 * under the table. The appraisal total is not recomputed (the server's rule for corrections).
 */
export default function UnitPriceCorrectionPane({
  appraisalId,
  projectType,
  editCount,
  latestEdit,
  onOpenHistory,
  onDirtyChange,
}: UnitPriceCorrectionPaneProps) {
  const { t } = useTranslation('appraisalDataCorrection');
  const { t: tb } = useTranslation('blockProject');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const reasonRef = useRef<HTMLDivElement>(null);
  const { mutateAsync: correct } = useCorrectProjectData();
  const { mutateAsync: correctImport } = useCorrectProjectUnitPriceImport();

  // The tab reports its own edits (assumption form, unit flags). As in the other editors, a typed
  // reason alone is not an edit.
  const [tabDirty, setTabDirty] = useState(false);
  useEffect(() => {
    onDirtyChange(tabDirty);
    return () => onDirtyChange(false);
  }, [tabDirty, onDirtyChange]);
  const { blocker } = useUnsavedChangesWarning(tabDirty);

  /** The reason, or null after saying it is missing. */
  const requireReason = () => {
    const trimmed = reason.trim();
    if (trimmed) return trimmed;
    setReasonError(true);
    reasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    reasonRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
    return null;
  };

  const errorMessage = (error: unknown) => {
    const { errorCode, detail } = readApiError(error as Error);
    if (errorCode === 'APPRAISAL_NOT_COMPLETED') return t('detail.appraisalNotCompleted');
    if (errorCode === 'NO_CHANGES') return t('detail.noChangesSaved');
    return detail || t('detail.saveFailed');
  };

  const save = async (body: { assumption: unknown; unitPriceFlags: unknown[] }) => {
    const why = requireReason();
    if (!why) {
      toast.error(t('detail.reasonRequired'));
      throw new Error('reason required');
    }
    try {
      await correct({ appraisalId, target: 'unit-prices', reason: why, data: body });
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
    // The tab says it worked (its recalculation summary, or a toast).
    setReason('');
  };

  const importFile = async (file: File) => {
    const why = requireReason();
    // Shaped as an API error so the import dialog shows this message (errorText) and stays open.
    if (!why) throw { apiError: { detail: t('detail.reasonRequired') } };
    try {
      await correctImport({ appraisalId, file, reason: why });
    } catch (error) {
      throw { apiError: { detail: errorMessage(error) } };
    }
    setReason('');
  };

  const reasonSlot = (
    <div
      ref={reasonRef}
      className="rounded-section border border-(--palette-line) bg-(--palette-surface) px-4 py-3 shadow-sm"
    >
      <Textarea
        label={t('detail.reasonTitle')}
        required
        rows={2}
        maxLength={4000}
        value={reason}
        onChange={e => {
          setReason(e.target.value);
          if (e.target.value.trim()) setReasonError(false);
        }}
        error={reasonError ? t('detail.reasonRequired') : undefined}
      />
    </div>
  );

  const head = (
    <>
      <EditorHeader
        title={tb('page.tabs.unitPrice')}
        facts={
          editCount !== undefined && (
            <span>{editCount > 0 ? t('edits.count', { count: editCount }) : t('edits.none')}</span>
          )
        }
      />
      {latestEdit && (
        <div className="px-3 pt-3">
          <LatestCorrectionCard correction={latestEdit} onViewAll={onOpenHistory} />
        </div>
      )}
    </>
  );

  return (
    <FormLayoutProvider layout="standard">
      <div className="flex flex-1 min-h-0 flex-col">
        <UnitPriceTab
          projectType={projectType}
          correction={{ save, importFile, reasonSlot, head, onDirtyChange: setTabDirty }}
        />
      </div>
      <UnsavedChangesDialog blocker={blocker} />
    </FormLayoutProvider>
  );
}
