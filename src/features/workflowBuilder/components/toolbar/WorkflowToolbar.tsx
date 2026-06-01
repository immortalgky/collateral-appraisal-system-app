import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';

interface WorkflowToolbarProps {
  onSaveDraft: () => void;
  onPublish: () => void;
  onCreateDraft?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  isCreatingDraft?: boolean;
  isPublished?: boolean;
  versionNumber?: number;
  versionStatus?: string;
}

export function WorkflowToolbar({
  onSaveDraft,
  onPublish,
  onCreateDraft,
  isSaving = false,
  isPublishing = false,
  isCreatingDraft = false,
  isPublished = false,
  versionNumber,
  versionStatus,
}: WorkflowToolbarProps) {
  const { t } = useTranslation('workflowBuilder');
  const isDirty = useWorkflowStore(s => s.isDirty);
  const workflowMeta = useWorkflowStore(s => s.workflowMeta);
  const updateMeta = useWorkflowStore(s => s.updateMeta);
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
            title={t('toolbar.backToList')}
            aria-label={t('toolbar.backToList')}
          >
            ←
          </button>
          <input
            className="input input-ghost input-sm font-semibold text-base-content"
            value={workflowMeta.name}
            onChange={e => updateMeta({ name: e.target.value })}
            placeholder={t('toolbar.workflowNamePlaceholder')}
            readOnly={isPublished}
          />
          {versionNumber != null && (
            <span className={`badge badge-sm ${statusBadgeClass}`}>
              v{versionNumber} {versionStatus}
            </span>
          )}
          {isDirty && <span className="badge badge-warning badge-xs">{t('toolbar.unsaved')}</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => useWorkflowStore.getState().autoLayout()}
            className="btn btn-ghost btn-sm"
            title={t('toolbar.autoLayoutTitle')}
          >
            {t('toolbar.autoLayout')}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="btn btn-ghost btn-sm"
            title={t('toolbar.settingsTitle')}
          >
            {t('toolbar.settings')}
          </button>
          {isPublished ? (
            <button
              onClick={onCreateDraft}
              disabled={isCreatingDraft}
              className="btn btn-primary btn-sm"
            >
              {isCreatingDraft ? <span className="loading loading-spinner loading-xs" /> : null}
              {t('toolbar.editNewVersion')}
            </button>
          ) : (
            <>
              <button
                onClick={onSaveDraft}
                disabled={!isDirty || isSaving}
                className="btn btn-outline btn-primary btn-sm"
              >
                {isSaving ? <span className="loading loading-spinner loading-xs" /> : null}
                {t('toolbar.saveDraft')}
              </button>
              <button onClick={onPublish} disabled={isPublishing} className="btn btn-primary btn-sm">
                {isPublishing ? <span className="loading loading-spinner loading-xs" /> : null}
                {t('toolbar.publish')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('workflowBuilder');
  const workflowMeta = useWorkflowStore(s => s.workflowMeta);
  const updateMeta = useWorkflowStore(s => s.updateMeta);
  const updateMetadata = useWorkflowStore(s => s.updateMetadata);

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">{t('settings.title')}</h3>

        <div className="mt-4 flex flex-col gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">{t('settings.name')}</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.name}
              onChange={e => updateMeta({ name: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">{t('settings.description')}</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              rows={3}
              value={workflowMeta.description}
              onChange={e => updateMeta({ description: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">{t('settings.category')}</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.category}
              onChange={e => updateMeta({ category: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">{t('settings.author')}</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.metadata.author}
              onChange={e => updateMetadata({ author: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">{t('settings.version')}</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.metadata.version}
              onChange={e => updateMetadata({ version: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">{t('settings.tags')}</span>
            </label>
            <input
              className="input input-bordered input-sm w-full"
              value={workflowMeta.metadata.tags.join(', ')}
              onChange={e =>
                updateMetadata({
                  tags: e.target.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-sm">
            {t('settings.close')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
