import { useEffect, useCallback, useState } from 'react';
import { useParams, useBlocker, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWorkflowStore } from '../hooks/useWorkflowStore';
import {
  useGetLatestVersion,
  useCreateDefinition,
  useSaveDraftSchema,
} from '../api';
import { WorkflowCanvas } from '../components/canvas/WorkflowCanvas';
import { ActivityPalette } from '../components/palette/ActivityPalette';
import { PropertyPanel } from '../components/panels/PropertyPanel';
import { WorkflowToolbar } from '../components/toolbar/WorkflowToolbar';
import { PublishPreviewModal } from '../components/publish/PublishPreviewModal';
import { ActivityType } from '../types';
import type { PublishVersionResponse } from '../types';
import { normalizeSchema } from '../utils/normalizeSchema';

export default function WorkflowBuilderPage() {
  const { workflowId = 'new' } = useParams<{ workflowId: string }>();
  const isNew = workflowId === 'new';
  const navigate = useNavigate();
  const [showPublishModal, setShowPublishModal] = useState(false);

  const loadFromSchema = useWorkflowStore((s) => s.loadFromSchema);
  const addActivity = useWorkflowStore((s) => s.addActivity);
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const markClean = useWorkflowStore((s) => s.markClean);
  const toSchema = useWorkflowStore((s) => s.toSchema);
  const reset = useWorkflowStore((s) => s.reset);

  // Fetch latest version for existing workflows
  const { data: latestVersion } = useGetLatestVersion(workflowId);

  const createDefinitionMutation = useCreateDefinition();
  const saveDraftMutation = useSaveDraftSchema();

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
        toast.error('Failed to parse workflow schema');
      }
    }
  }, [isNew, latestVersion]);

  // Unsaved changes guard
  useBlocker(
    useCallback(
      () => {
        if (isDirty) {
          return !window.confirm(
            'You have unsaved changes. Are you sure you want to leave?',
          );
        }
        return false;
      },
      [isDirty],
    ),
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
    if (!isDirty) return;
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
          onSuccess: (result) => {
            if (!result.isValid) {
              toast.error(
                result.validationErrors?.[0] || 'Validation failed',
              );
              return;
            }
            markClean();
            toast.success('Workflow created');
            navigate(`/workflow-builder/${result.id}`, { replace: true });
          },
          onError: () => {
            toast.error('Failed to create workflow');
          },
        },
      );
      return;
    }

    // For existing workflows, update draft schema
    if (!latestVersion) {
      toast.error('No version found to save');
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
        onSuccess: (result) => {
          if (!result.isSuccess) {
            toast.error(result.errorMessage || 'Save failed');
            return;
          }
          markClean();
          toast.success('Draft saved');
        },
        onError: () => {
          toast.error('Failed to save draft');
        },
      },
    );
  }, [
    isDirty,
    isNew,
    workflowId,
    latestVersion,
    toSchema,
    markClean,
    navigate,
    createDefinitionMutation,
    saveDraftMutation,
  ]);

  const handlePublish = useCallback(() => {
    if (!latestVersion) {
      toast.error('No version found to publish');
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
            toast.error('Failed to save before publishing');
          },
        },
      );
    } else {
      setShowPublishModal(true);
    }
  }, [workflowId, latestVersion, isDirty, toSchema, markClean, saveDraftMutation]);

  const handlePublished = useCallback(
    (result: PublishVersionResponse) => {
      setShowPublishModal(false);
      markClean();
      const hasInstances =
        result.impactReport &&
        (result.impactReport.safeCount > 0 || result.impactReport.unsafeCount > 0);
      if (hasInstances) {
        navigate(
          `/workflow-builder/${workflowId}/versions/${result.versionId}/migrate`,
          { state: { impactReport: result.impactReport } },
        );
      }
    },
    [workflowId, navigate, markClean],
  );

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <WorkflowToolbar
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        isSaving={
          saveDraftMutation.isPending || createDefinitionMutation.isPending
        }
        isPublishing={saveDraftMutation.isPending && showPublishModal}
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
