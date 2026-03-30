import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';

interface WorkflowToolbarProps {
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  versionNumber?: number;
  versionStatus?: string;
}

export function WorkflowToolbar({
  onSaveDraft,
  onPublish,
  isSaving = false,
  isPublishing = false,
  versionNumber,
  versionStatus,
}: WorkflowToolbarProps) {
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const workflowMeta = useWorkflowStore((s) => s.workflowMeta);
  const updateMeta = useWorkflowStore((s) => s.updateMeta);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const statusBadgeClass =
    versionStatus === 'Published'
      ? 'badge-success'
      : versionStatus === 'Draft'
        ? 'badge-warning'
        : 'badge-ghost';

  return (
    <>
      <div className="flex h-12 items-center justify-between border-b border-base-300 bg-base-100 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workflow-builder')}
            className="btn btn-ghost btn-sm"
            title="Back to list"
          >
            ←
          </button>
          <input
            className="input input-ghost input-sm font-semibold text-base-content"
            value={workflowMeta.name}
            onChange={(e) => updateMeta({ name: e.target.value })}
            placeholder="Workflow Name"
          />
          {versionNumber != null && (
            <span className={`badge badge-sm ${statusBadgeClass}`}>
              v{versionNumber} {versionStatus}
            </span>
          )}
          {isDirty && (
            <span className="badge badge-warning badge-xs">Unsaved</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => useWorkflowStore.getState().autoLayout()}
            className="btn btn-ghost btn-sm"
            title="Auto-arrange nodes"
          >
            Auto Layout
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="btn btn-ghost btn-sm"
            title="Workflow Settings"
          >
            Settings
          </button>
          <button
            onClick={onSaveDraft}
            disabled={!isDirty || isSaving}
            className="btn btn-outline btn-primary btn-sm"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            Save Draft
          </button>
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="btn btn-primary btn-sm"
          >
            {isPublishing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            Publish
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const workflowMeta = useWorkflowStore((s) => s.workflowMeta);
  const updateMeta = useWorkflowStore((s) => s.updateMeta);
  const updateMetadata = useWorkflowStore((s) => s.updateMetadata);

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Workflow Settings</h3>

        <div className="mt-4 flex flex-col gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Name</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.name}
              onChange={(e) => updateMeta({ name: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              rows={3}
              value={workflowMeta.description}
              onChange={(e) => updateMeta({ description: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Category</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.category}
              onChange={(e) => updateMeta({ category: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Author</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.metadata.author}
              onChange={(e) => updateMetadata({ author: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Version</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.metadata.version}
              onChange={(e) => updateMetadata({ version: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Tags (comma-separated)</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.metadata.tags.join(', ')}
              onChange={(e) =>
                updateMetadata({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>

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
