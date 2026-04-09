import { useMigrationStore } from '../../hooks/useMigrationStore';
import type { RunningInstanceSummary, InstanceImpact, MigrationAction } from '../../types';

interface Props {
  instances: RunningInstanceSummary[];
  classifications: Record<string, InstanceImpact>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function actionLabel(action: MigrationAction | undefined): string {
  if (!action) return '—';
  if (action.kind === 'bump') return 'Migrate';
  if (action.kind === 'skip') return 'Pinned';
  return `Remap: ${action.newActivityId}`;
}

export function InstanceTable({ instances, classifications, selectedId, onSelect }: Props) {
  const actions = useMigrationStore((s) => s.actions);

  if (instances.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        No running instances on the previous version — nothing to migrate.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm w-full">
        <thead>
          <tr>
            <th>Instance</th>
            <th>Name</th>
            <th>Current Activity</th>
            <th>Started</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((inst) => {
            const classification = classifications[inst.id];
            const action = actions[inst.id];
            const isSelected = inst.id === selectedId;

            return (
              <tr
                key={inst.id}
                className={`cursor-pointer hover ${isSelected ? 'bg-primary/10' : ''}`}
                onClick={() => onSelect(inst.id)}
              >
                <td className="font-mono text-xs">{inst.id.slice(0, 8)}…</td>
                <td className="max-w-[10rem] truncate text-sm">{inst.name}</td>
                <td className="text-sm">{inst.currentActivityId}</td>
                <td className="text-xs text-base-content/60">
                  {new Date(inst.startedOn).toLocaleDateString()}
                </td>
                <td>
                  {classification ? (
                    <span
                      className={`badge badge-xs ${
                        classification === 'Safe' ? 'badge-success' : 'badge-error'
                      }`}
                    >
                      {classification}
                    </span>
                  ) : (
                    <span className="badge badge-xs badge-ghost">Unknown</span>
                  )}
                </td>
                <td className="text-xs text-base-content/60">{actionLabel(action)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
