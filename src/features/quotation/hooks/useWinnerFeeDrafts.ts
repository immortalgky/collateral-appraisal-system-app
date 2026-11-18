import { useState } from 'react';
import { useUpdateAppraisalFee } from '@/features/appraisal/api';
import { isFeeChanged, type SavedFee } from '../utils/winnerFee';

export interface FeeDraft {
  feeId: string;
  feePaymentType: string;
  bankAbsorbAmount: number | null;
}

/** appraisalId → unsaved fee change made in the pick-winner dialog. */
export type FeeDrafts = Record<string, FeeDraft>;

/**
 * Fee changes made while picking a winner are held here and only saved on confirm,
 * so closing the dialog discards them.
 */
export function useWinnerFeeDrafts() {
  const [drafts, setDrafts] = useState<FeeDrafts>({});
  const [isSaving, setIsSaving] = useState(false);
  const updateAppraisalFee = useUpdateAppraisalFee();

  const setDraft = (appraisalId: string, draft: FeeDraft, saved: SavedFee | undefined) =>
    setDrafts(prev => {
      if (isFeeChanged(saved, draft)) return { ...prev, [appraisalId]: draft };
      return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== appraisalId));
    });

  const reset = () => {
    setDrafts({});
  };

  /** Resolves true when every draft saved; failed ones stay as drafts so the user can retry. */
  const saveAll = async () => {
    const entries = Object.entries(drafts);
    if (entries.length === 0) return true;

    setIsSaving(true);
    try {
      const results = await Promise.allSettled(
        entries.map(([appraisalId, draft]) =>
          updateAppraisalFee.mutateAsync({
            appraisalId,
            feeId: draft.feeId,
            feePaymentType: draft.feePaymentType,
            bankAbsorbAmount: draft.bankAbsorbAmount ?? 0,
          }),
        ),
      );
      const failedEntries = entries.filter((_, i) => results[i].status === 'rejected');
      setDrafts(Object.fromEntries(failedEntries));
      return failedEntries.length === 0;
    } finally {
      setIsSaving(false);
    }
  };

  return { drafts, setDraft, reset, saveAll, isSaving };
}
