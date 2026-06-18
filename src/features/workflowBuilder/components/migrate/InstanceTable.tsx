import { useTranslation } from 'react-i18next';
import { useMigrationStore } from '../../hooks/useMigrationStore';
import type { RunningInstanceSummary, InstanceImpact, MigrationAction } from '../../types';

interface Props {
  instances: RunningInstanceSummary[];
  classifications: Record<string, InstanceImpact>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function useActionLabel(action: MigrationAction | undefined): string {
  const { t } = useTranslation('workflowBuilder');
  if (!action) return t('migrate.table.actionLabels.none');
  if (action.kind === 'bump') return t('migrate.table.actionLabels.migrate');
  if (action.kind === 'skip') return t('migrate.table.actionLabels.pinned');
  return t('migrate.table.actionLabels.remap', { activityId: action.newActivityId });
}

function ActionLabel({ action }: { action: MigrationAction | undefined }) {
  const label = useActionLabel(action);
  return <>{label}</>;
}

export function InstanceTable({ instances, classifications, selectedId, onSelect }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const actions = useMigrationStore(s => s.actions);

  if (instances.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        {t('migrate.table.noInstances')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm w-full">
        <thead>
          <tr>
            <th>{t('migrate.table.columns.instance')}</th>
            <th>{t('migrate.table.columns.name')}</th>
            <th>{t('migrate.table.columns.currentActivity')}</th>
            <th>{t('migrate.table.columns.started')}</th>
            <th>{t('migrate.table.columns.status')}</th>
            <th>{t('migrate.table.columns.action')}</th>
          </tr>
        </thead>
        <tbody>
          {instances.map(inst => {
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
                    <span className="badge badge-xs badge-ghost">
                      {t('migrate.table.classification.unknown')}
                    </span>
                  )}
                </td>
                <td className="text-xs text-base-content/60">
                  <ActionLabel action={action} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
