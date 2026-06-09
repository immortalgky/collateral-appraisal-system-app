import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { useActivityProgressStore } from '../store/activityProgressStore';

interface ActivityCompletionChecklistProps {
  /**
   * True while the completion mutation is in flight. Drives whether spinners are
   * shown: once the request settles, no spinner should linger even if SignalR never
   * delivered live steps (e.g. the hub was disconnected).
   */
  pending?: boolean;
  /**
   * True when the SignalR hub isn't connected, so live step-by-step progress won't
   * arrive. Only affects the submitting message wording.
   */
  liveUnavailable?: boolean;
}

/**
 * Renders the live pipeline step checklist inside the completion ConfirmDialog.
 * Reads from activityProgressStore; props only convey the mutation/hub lifecycle.
 */
const ActivityCompletionChecklist = ({
  pending = false,
  liveUnavailable = false,
}: ActivityCompletionChecklistProps) => {
  const { t } = useTranslation('appraisal');
  const steps = useActivityProgressStore(s => s.steps);
  const overall = useActivityProgressStore(s => s.overall);

  // No steps yet — pipeline hasn't sent PipelineStarted (or no steps configured).
  if (steps.length === 0) {
    // Request has settled with no live steps (e.g. SignalR disconnected): don't spin
    // forever — the error/success result is shown elsewhere.
    if (!pending) return null;

    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 py-5 text-sm text-gray-500">
        <Icon name="spinner" style="solid" className="size-4 shrink-0 animate-spin text-primary" />
        <span>
          {liveUnavailable
            ? t('completionChecklist.submittingNoLive')
            : t('completionChecklist.submitting')}
        </span>
      </div>
    );
  }

  const settled = steps.filter(s => s.status !== 'pending' && s.status !== 'running').length;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-left">
      {/* Header: label + progress count */}
      <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {t('completionChecklist.title')}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-gray-400">
          {settled}/{steps.length}
        </span>
      </div>

      <ul className="space-y-0.5">
        {steps.map(step => {
          const isRunning = step.status === 'running';
          // A step left 'running' after the request settled (connection dropped
          // mid-pipeline) must not spin forever — show it as a neutral incomplete marker.
          const showSpin = isRunning && pending;
          return (
            <li
              key={step.stepName}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                showSpin ? 'bg-primary/5' : ''
              }`}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {(step.status === 'pending' || (isRunning && !pending)) && (
                  <span className="size-3.5 rounded-full border-2 border-gray-300" />
                )}
                {showSpin && (
                  <Icon name="spinner" style="solid" className="size-4 animate-spin text-primary" />
                )}
                {step.status === 'passed' && (
                  <Icon name="circle-check" style="solid" className="size-[18px] text-emerald-500" />
                )}
                {step.status === 'skipped' && (
                  <Icon name="circle-minus" style="solid" className="size-[18px] text-gray-300" />
                )}
                {step.status === 'failed' && (
                  <Icon name="circle-xmark" style="solid" className="size-[18px] text-danger" />
                )}
              </span>
              <span
                className={`text-sm leading-tight ${
                  step.status === 'pending' || (isRunning && !pending)
                    ? 'text-gray-400'
                    : showSpin
                      ? 'font-medium text-gray-800'
                      : step.status === 'passed'
                        ? 'text-gray-500'
                        : step.status === 'skipped'
                          ? 'italic text-gray-400'
                          : 'font-medium text-danger'
                }`}
              >
                {step.displayName}
              </span>
            </li>
          );
        })}
      </ul>

      {overall === 'done' && (
        <div className="mt-1 flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-xs font-medium text-emerald-600">
          <Icon name="circle-check" style="solid" className="size-3.5 shrink-0" />
          <span>{t('completionChecklist.allPassed')}</span>
        </div>
      )}
    </div>
  );
};

export default ActivityCompletionChecklist;
