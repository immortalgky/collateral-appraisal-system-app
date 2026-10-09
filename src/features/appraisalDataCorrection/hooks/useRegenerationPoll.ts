import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useGetAppraisalDocuments } from '@/features/appraisal/api/appraisalDocuments';
import { useGetCorrectionContext } from '../api/appraisalDataCorrection';
import {
  hasNewSummaryFile,
  pollOutcome,
  POLL_INTERVAL_MS,
  type Regeneration,
} from '../utils/documentCorrection';

/**
 * Waits for a regenerated summary. Runs in the detail PAGE, next to the state it drives, so switching to a
 * property mid-job neither pauses the wait nor swallows the "done" toast.
 */
export function useRegenerationPoll(
  appraisalId: string | undefined,
  regen: Regeneration | null,
  setRegen: (next: Regeneration | null) => void,
) {
  const { t } = useTranslation('appraisalDataCorrection');
  const { refetch } = useGetAppraisalDocuments(appraisalId);
  const { data: source } = useGetCorrectionContext(appraisalId);
  const externalSystem = source?.externalSystem ?? null;

  const polling = regen?.status === 'polling';
  const baselineIds = regen?.baselineIds;
  const startedAt = regen?.startedAt ?? 0;
  const notifiedExternal = regen?.notifyExternal ?? false;
  const doneMessage =
    notifiedExternal && externalSystem
      ? t('documents.toast.regenerateDoneNotified', { system: externalSystem })
      : t('documents.toast.regenerateDone');

  // Regeneration only enqueues a job (202), so the new file has to be waited for: refetch every 5 s
  // until a D042/D043 file outside the baseline appears or 60 s pass. Cleanup covers unmount and a
  // finished poll alike.
  useEffect(() => {
    if (!polling || !baselineIds) return;
    let finished = false;
    const timer = setInterval(async () => {
      // No cancelRefetch: a list slower than one interval would otherwise be cancelled on every tick.
      const { data: fresh } = await refetch({ cancelRefetch: false });
      if (finished) return;
      const outcome = pollOutcome(
        hasNewSummaryFile(baselineIds, fresh?.types),
        Date.now() - startedAt,
      );
      if (outcome === 'waiting') return;
      finished = true;
      clearInterval(timer);
      if (outcome === 'done') {
        toast.success(doneMessage);
        setRegen(null);
      } else {
        setRegen({ baselineIds, startedAt, notifyExternal: notifiedExternal, status: 'timeout' });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      finished = true;
      clearInterval(timer);
    };
  }, [polling, baselineIds, startedAt, notifiedExternal, refetch, doneMessage, setRegen]);
}
