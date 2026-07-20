import { useState } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { useBackfillHostCollateralId } from '../api/hooks';

export default function BackfillHostCollateralIdPage() {
  const [confirmBackfill, setConfirmBackfill] = useState(false);

  const { mutate: backfillHostCollateralId, isPending: isStarting } =
    useBackfillHostCollateralId();

  const handleStartBackfill = () => {
    backfillHostCollateralId(undefined, {
      onSuccess: data => {
        toast.success(
          data.jobId
            ? `Host ID backfill started — job ${data.jobId}`
            : 'Host ID backfill started',
        );
        setConfirmBackfill(false);
      },
      onError: (e: any) => {
        toast.error(e.apiError?.detail ?? 'Failed to start host ID backfill');
        setConfirmBackfill(false);
      },
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Host Collateral ID Backfill</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Copies the AS400 Host Collateral ID already recorded on appraisal source data onto
            the matching collateral master — one per appraisal. Safe to re-run.
          </p>
        </div>
        <Button size="sm" onClick={() => setConfirmBackfill(true)} isLoading={isStarting}>
          <Icon style="solid" name="play" className="size-3.5 mr-1.5" />
          Start Host ID Backfill
        </Button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-2 py-16">
        <Icon style="regular" name="circle-info" className="size-10 text-gray-300" />
        <p className="text-gray-500 font-medium">Fire-and-forget backfill job</p>
        <p className="text-xs text-gray-400 max-w-md text-center">
          This job runs server-side; there is no live progress view. Check the server logs to
          confirm the outcome after triggering.
        </p>
      </div>

      {/* Backfill confirm */}
      <ConfirmDialog
        isOpen={confirmBackfill}
        onClose={() => setConfirmBackfill(false)}
        onConfirm={handleStartBackfill}
        title="Start Host ID Backfill?"
        message="This will copy the AS400 Host Collateral ID onto matching collateral masters. It is safe to re-run."
        confirmText="Start Host ID Backfill"
        variant="primary"
        isLoading={isStarting}
      />
    </div>
  );
}
