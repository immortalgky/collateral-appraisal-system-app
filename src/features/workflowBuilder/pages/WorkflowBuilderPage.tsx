import { useEffect, useCallback } from 'react';
import { useParams, useBlocker, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWorkflowStore } from '../hooks/useWorkflowStore';
import {
  useGetLatestVersion,
  useCreateDefinition,
  useSaveDraftSchema,
  usePublishVersion,
} from '../api';
import { WorkflowCanvas } from '../components/canvas/WorkflowCanvas';
import { ActivityPalette } from '../components/palette/ActivityPalette';
import { PropertyPanel } from '../components/panels/PropertyPanel';
import { WorkflowToolbar } from '../components/toolbar/WorkflowToolbar';
import { ActivityType } from '../types';
import { normalizeSchema } from '../utils/normalizeSchema';

export default function WorkflowBuilderPage() {
  const { workflowId = 'new' } = useParams<{ workflowId: string }>();
  const isNew = workflowId === 'new';
  const navigate = useNavigate();

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
  const publishMutation = usePublishVersion();

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

    const confirmed = window.confirm(
      'Are you sure you want to publish this workflow? This will make it the live version.',
    );
    if (!confirmed) return;

    // Save draft first if dirty, then publish
    const doPublish = () => {
      publishMutation.mutate(
        {
          definitionId: workflowId,
          versionId: latestVersion.id,
          publishedBy: 'current-user',
        },
        {
          onSuccess: (result) => {
            if (!result.isSuccess) {
              toast.error(result.errorMessage || 'Publish failed');
              return;
            }
            markClean();
            toast.success(`Workflow published (v${result.version})`);
          },
          onError: () => {
            toast.error('Failed to publish workflow');
          },
        },
      );
    };

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
            doPublish();
          },
          onError: () => {
            toast.error('Failed to save before publishing');
          },
        },
      );
    } else {
      doPublish();
    }
  }, [
    workflowId,
    latestVersion,
    isDirty,
    toSchema,
    markClean,
    saveDraftMutation,
    publishMutation,
  ]);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <WorkflowToolbar
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        isSaving={
          saveDraftMutation.isPending || createDefinitionMutation.isPending
        }
        isPublishing={publishMutation.isPending}
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
    </div>
  );
}
