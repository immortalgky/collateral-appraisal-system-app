import { useEffect, useCallback, useState } from 'react';
import { useParams, useBlocker, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../hooks/useWorkflowStore';
import {
  useGetLatestVersion,
  useCreateDefinition,
  useSaveDraftSchema,
  useCreateDraft,
} from '../api';
import { WorkflowCanvas } from '../components/canvas/WorkflowCanvas';
import { ActivityPalette } from '../components/palette/ActivityPalette';
import { PropertyPanel } from '../components/panels/PropertyPanel';
import { WorkflowToolbar } from '../components/toolbar/WorkflowToolbar';
import { PublishPreviewModal } from '../components/publish/PublishPreviewModal';
import { ActivityType, VersionStatus } from '../types';
import type { PublishVersionResponse } from '../types';
import { normalizeSchema } from '../utils/normalizeSchema';

export default function WorkflowBuilderPage() {
  const { t } = useTranslation('workflowBuilder');
  const { workflowId = 'new' } = useParams<{ workflowId: string }>();
  const isNew = workflowId === 'new';
  const navigate = useNavigate();
  const [showPublishModal, setShowPublishModal] = useState(false);

  const loadFromSchema = useWorkflowStore(s => s.loadFromSchema);
  const addActivity = useWorkflowStore(s => s.addActivity);
  const isDirty = useWorkflowStore(s => s.isDirty);
  const markClean = useWorkflowStore(s => s.markClean);
  const toSchema = useWorkflowStore(s => s.toSchema);
  const reset = useWorkflowStore(s => s.reset);

  // Fetch latest version for existing workflows
  const { data: latestVersion } = useGetLatestVersion(workflowId);

  const createDefinitionMutation = useCreateDefinition();
  const saveDraftMutation = useSaveDraftSchema();
  const createDraftMutation = useCreateDraft();

  // Published versions are immutable — editing requires creating a new draft version
  const isPublished = latestVersion?.status === VersionStatus.PUBLISHED;

  // Load data into store
  useEffect(() => {
    if (isNew) {
      reset();
      addActivity(ActivityType.START, { x: 250, y: 50 });
      markClean();
      return;
    }

    if (latestVersion?.jsonSchema) {
      try {
        const raw = JSON.parse(latestVersion.jsonSchema);
        const schema = normalizeSchema(raw);
        loadFromSchema(schema);
      } catch {
        toast.error(t('errors.failedToParseSchema'));
      }
    }
  }, [isNew, latestVersion]);

  // Unsaved changes guard
  useBlocker(
    useCallback(() => {
      if (isDirty) {
        return !window.confirm(t('unsavedChanges.confirm'));
      }
      return false;
    }, [isDirty, t]),
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [workflowId, isDirty, latestVersion]);

  const handleSaveDraft = useCallback(() => {
    if (!isDirty || isPublished) return;
    const schema = toSchema();

    // For new workflows, create definition + v1 draft first
    if (isNew) {
      createDefinitionMutation.mutate(
        {
          name: schema.name || 'Untitled Workflow',
          description: schema.description || '',
          category: schema.category || 'General',
          workflowSchema: schema,
          createdBy: 'current-user',
        },
        {
          onSuccess: result => {
            if (!result.isValid) {
              toast.error(result.validationErrors?.[0] || t('errors.validationFailed'));
              return;
            }
            markClean();
            toast.success(t('toasts.workflowCreated'));
            navigate(`/workflow-builder/${result.id}`, { replace: true });
          },
          onError: () => {
            toast.error(t('errors.failedToCreate'));
          },
        },
      );
      return;
    }

    // For existing workflows, update draft schema
    if (!latestVersion) {
      toast.error(t('errors.noVersionToSave'));
      return;
    }

    saveDraftMutation.mutate(
      {
        definitionId: workflowId,
        versionId: latestVersion.id,
        workflowSchema: schema,
        updatedBy: 'current-user',
      },
      {
        onSuccess: result => {
          if (!result.isSuccess) {
            toast.error(result.errorMessage || t('errors.saveFailed'));
            return;
          }
          markClean();
          toast.success(t('toasts.draftSaved'));
        },
        onError: () => {
          toast.error(t('errors.failedToSaveDraft'));
        },
      },
    );
  }, [
    isDirty,
    isPublished,
    isNew,
    workflowId,
    latestVersion,
    toSchema,
    markClean,
    navigate,
    createDefinitionMutation,
    saveDraftMutation,
    t,
  ]);

  // Create a new draft version (clone of the published schema) so the workflow can be edited.
  // The hook invalidates the latestVersion query; the load effect then reloads the new draft.
  const handleCreateDraft = useCallback(() => {
    createDraftMutation.mutate(
      { definitionId: workflowId, createdBy: 'current-user' },
      {
        onSuccess: result => {
          if (!result.isSuccess) {
            toast.error(result.errorMessage || t('errors.failedToCreateDraft'));
            return;
          }
          markClean();
          toast.success(t('toasts.draftVersionCreated'));
        },
        onError: () => {
          toast.error(t('errors.failedToCreateDraft'));
        },
      },
    );
  }, [workflowId, createDraftMutation, markClean, t]);

  const handlePublish = useCallback(() => {
    if (!latestVersion) {
      toast.error(t('errors.noVersionToPublish'));
      return;
    }

    // Save draft first if dirty, then open preview modal
    if (isDirty) {
      const schema = toSchema();
      saveDraftMutation.mutate(
        {
          definitionId: workflowId,
          versionId: latestVersion.id,
          workflowSchema: schema,
          updatedBy: 'current-user',
        },
        {
          onSuccess: () => {
            markClean();
            setShowPublishModal(true);
          },
          onError: () => {
            toast.error(t('errors.failedToSaveBeforePublishing'));
          },
        },
      );
    } else {
      setShowPublishModal(true);
    }
  }, [workflowId, latestVersion, isDirty, toSchema, markClean, saveDraftMutation, t]);

  const handlePublished = useCallback(
    (result: PublishVersionResponse) => {
      setShowPublishModal(false);
      markClean();
      const hasInstances =
        result.impactReport &&
        (result.impactReport.safeCount > 0 || result.impactReport.unsafeCount > 0);
      if (hasInstances) {
        navigate(`/workflow-builder/${workflowId}/versions/${result.versionId}/migrate`, {
          state: { impactReport: result.impactReport },
        });
      }
    },
    [workflowId, navigate, markClean],
  );

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <WorkflowToolbar
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onCreateDraft={handleCreateDraft}
        isSaving={saveDraftMutation.isPending || createDefinitionMutation.isPending}
        isPublishing={saveDraftMutation.isPending && showPublishModal}
        isCreatingDraft={createDraftMutation.isPending}
        isPublished={isPublished}
        versionNumber={latestVersion?.version}
        versionStatus={latestVersion?.status}
      />

      <div className="flex flex-1 overflow-hidden">
        <ActivityPalette />

        <div className="flex-1">
          <WorkflowCanvas />
        </div>

        <PropertyPanel />
      </div>

      {showPublishModal && latestVersion && (
        <PublishPreviewModal
          open={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          definitionId={workflowId}
          versionId={latestVersion.id}
          publishedBy="current-user"
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}
