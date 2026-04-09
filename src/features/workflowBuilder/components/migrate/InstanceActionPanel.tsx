import type {
  RunningInstanceSummary,
  InstanceImpact,
  MigrationAction,
  WorkflowSchema,
  BreakingChange,
} from '../../types';

interface Props {
  instance: RunningInstanceSummary | null;
  classification: InstanceImpact | undefined;
  targetSchema: WorkflowSchema | null;
  breakingChanges: BreakingChange[];
  currentAction: MigrationAction | undefined;
  onActionChange: (action: MigrationAction) => void;
}

export function InstanceActionPanel({
  instance,
  classification,
  targetSchema,
  breakingChanges,
  currentAction,
  onActionChange,
}: Props) {
  if (!instance) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-base-content/50">
        Select an instance to configure its migration action.
      </div>
    );
  }

  // Non-terminal activities in target schema (exclude EndActivity types)
  const targetActivities =
    targetSchema?.activities.filter((a) => !a.isEndActivity) ?? [];

  const remapValue =
    currentAction?.kind === 'remap' ? currentAction.newActivityId : '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-sm font-semibold">{instance.name}</p>
        <p className="font-mono text-xs text-base-content/60">
          {instance.id.slice(0, 8)}…
        </p>
        <p className="mt-1 text-xs text-base-content/60">
          Currently at:{' '}
          <span className="font-medium text-base-content">
            {instance.currentActivityId}
          </span>
        </p>
      </div>

      {/* Warning banner for unsafe instances */}
      {classification === 'Unsafe' && breakingChanges.length > 0 && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-3">
          <p className="mb-1 text-xs font-semibold text-error">Breaking changes</p>
          {/* TODO: Ideally filter to only changes affecting THIS instance's reachable path */}
          {breakingChanges.map((bc, i) => (
            <p key={i} className="text-xs text-base-content/70">
              • {bc.description} ({bc.affectedComponent})
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {classification === 'Safe' ? (
          <>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                className="radio radio-sm radio-primary"
                checked={currentAction?.kind === 'bump' || currentAction === undefined}
                onChange={() => onActionChange({ kind: 'bump' })}
              />
              <span className="text-sm">Migrate to new version</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                className="radio radio-sm"
                checked={currentAction?.kind === 'skip'}
                onChange={() => onActionChange({ kind: 'skip' })}
              />
              <span className="text-sm">Leave pinned on old version</span>
            </label>
          </>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                className="radio radio-sm mt-0.5"
                checked={currentAction?.kind === 'skip' || currentAction === undefined}
                onChange={() => onActionChange({ kind: 'skip' })}
              />
              <span className="text-sm">
                Leave pinned on old version{' '}
                <span className="badge badge-xs badge-ghost ml-1">recommended</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                className="radio radio-sm radio-warning"
                checked={currentAction?.kind === 'remap'}
                onChange={() =>
                  onActionChange({ kind: 'remap', newActivityId: remapValue })
                }
              />
              <span className="text-sm">Manual remap</span>
            </label>

            {currentAction?.kind === 'remap' && (
              <div className="ml-6">
                <select
                  className="select select-bordered select-sm w-full"
                  value={remapValue}
                  onChange={(e) =>
                    onActionChange({ kind: 'remap', newActivityId: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Select target activity…
                  </option>
                  {targetActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 opacity-50">
              <input type="radio" className="radio radio-sm" disabled />
              <span className="text-sm">
                Cancel instance{' '}
                <span className="text-xs text-base-content/50">
                  — use the cancel endpoint separately
                </span>
              </span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
