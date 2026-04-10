import { useNavigate } from 'react-router-dom';
import { useGetVersions, useListRunningInstances } from '../api';
import type { WorkflowDefinitionVersion } from '../types';

interface Props {
  definitionId: string;
  currentVersionId?: string;
  onClose: () => void;
  onSelectVersion?: (version: WorkflowDefinitionVersion) => void;
}

function InstanceCountBadge({
  definitionId,
  versionId,
}: {
  definitionId: string;
  versionId: string;
}) {
  const { data: instances } = useListRunningInstances(definitionId, { onVersionId: versionId });
  const count = instances?.length ?? 0;
  if (count === 0) return null;
  return (
    <span
      className="badge badge-xs badge-warning"
      title={`${count} running instance${count !== 1 ? 's' : ''}`}
    >
      {count} running
    </span>
  );
}

export function VersionHistoryPanel({
  definitionId,
  currentVersionId,
  onClose,
  onSelectVersion,
}: Props) {
  const navigate = useNavigate();
  const { data: versions, isLoading } = useGetVersions(definitionId);

  // Find the currently Published version id for the "Migrate" button target
  const publishedVersion = versions?.find((v) => v.status === 'Published');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Published':
        return 'badge-success';
      case 'DRAFT':
        return 'badge-warning';
      case 'Deprecated':
        return 'badge-ghost';
      case 'Archived':
        return 'badge-neutral';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="text-lg font-bold">Version History</h3>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner" />
          </div>
        ) : !versions || versions.length === 0 ? (
          <p className="py-4 text-sm text-base-content/60">No versions found.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  v.id === currentVersionId
                    ? 'border-primary bg-primary/5'
                    : 'border-base-300'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">v{v.version}</span>
                    <span className={`badge badge-sm ${statusBadge(v.status)}`}>
                      {v.status}
                    </span>
                    {v.id === currentVersionId && (
                      <span className="badge badge-primary badge-sm badge-outline">
                        current
                      </span>
                    )}
                    <InstanceCountBadge definitionId={definitionId} versionId={v.id} />
                  </div>
                  <div className="mt-1 text-xs text-base-content/60">
                    {v.publishedAt
                      ? `Published ${new Date(v.publishedAt).toLocaleDateString()} by ${v.publishedBy}`
                      : v.createdAt
                        ? `Created ${new Date(v.createdAt).toLocaleDateString()} by ${v.createdBy}`
                        : `By ${v.createdBy}`}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {v.status === 'Deprecated' && publishedVersion && (
                    <button
                      onClick={() =>
                        navigate(
                          `/workflow-builder/${definitionId}/versions/${publishedVersion.id}/migrate?fromVersionId=${v.id}`,
                        )
                      }
                      className="btn btn-warning btn-xs"
                    >
                      Migrate
                    </button>
                  )}
                  {onSelectVersion && v.id !== currentVersionId && (
                    <button
                      onClick={() => onSelectVersion(v)}
                      className="btn btn-ghost btn-xs"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-sm">
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
