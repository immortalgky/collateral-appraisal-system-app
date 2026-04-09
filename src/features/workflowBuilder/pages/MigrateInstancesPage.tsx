import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useListRunningInstances, useMigrateInstances, useGetVersion } from '../api';
import { useMigrationStore } from '../hooks/useMigrationStore';
import { InstanceTable } from '../components/migrate/InstanceTable';
import { InstanceActionPanel } from '../components/migrate/InstanceActionPanel';
import type {
  InstanceImpact,
  PublishImpactReport,
  WorkflowSchema,
  MigrateInstancesResult,
} from '../types';

export default function MigrateInstancesPage() {
  const { workflowId = '', targetVersionId = '' } = useParams<{
    workflowId: string;
    targetVersionId: string;
  }>();
  const [searchParams] = useSearchParams();
  const fromVersionId = searchParams.get('fromVersionId') ?? undefined;
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [impactReport, setImpactReport] = useState<PublishImpactReport | null>(null);
  const [resultModal, setResultModal] = useState<MigrateInstancesResult | null>(null);

  const { actions, setAction, bulkSet, reset } = useMigrationStore();

  // Fetch running instances on the prior version
  const { data: instances = [], isLoading: loadingInstances } = useListRunningInstances(
    workflowId,
    fromVersionId ? { onVersionId: fromVersionId } : undefined,
  );

  // Fetch target schema for remap dropdown
  const { data: targetVersion } = useGetVersion(workflowId, targetVersionId);
  const targetSchema: WorkflowSchema | null = targetVersion?.jsonSchema
    ? (() => {
        try {
          return JSON.parse(targetVersion.jsonSchema) as WorkflowSchema;
        } catch {
          return null;
        }
      })()
    : null;

  const migrateMutation = useMigrateInstances(workflowId, targetVersionId);

  // Try to recover impact report from navigation state (set by WorkflowBuilderPage on publish success)
  useEffect(() => {
    const state = window.history.state as { impactReport?: PublishImpactReport } | null;
    if (state?.impactReport) {
      setImpactReport(state.impactReport);
    }
  }, []);

  // Build classifications from impact report sample + default
  const classifications: Record<string, InstanceImpact> = {};
  if (impactReport) {
    for (const c of impactReport.sample) {
      classifications[c.instanceId] = c.classification;
    }
  }
  // Instances not in the sample default to Safe
  for (const inst of instances) {
    if (!(inst.id in classifications)) {
      classifications[inst.id] = 'Safe';
    }
  }

  const selectedInstance = instances.find((i) => i.id === selectedId) ?? null;

  const safeIds = instances.filter((i) => classifications[i.id] === 'Safe').map((i) => i.id);
  const unsafeIds = instances.filter((i) => classifications[i.id] === 'Unsafe').map((i) => i.id);

  const bumpCount = Object.values(actions).filter((a) => a.kind === 'bump').length;
  const remapCount = Object.values(actions).filter((a) => a.kind === 'remap').length;
  const skipCount = Object.values(actions).filter((a) => a.kind === 'skip').length;

  const handleApply = () => {
    const safeInstanceIds: string[] = [];
    const manualRemaps: Record<string, string> = {};

    for (const [id, action] of Object.entries(actions)) {
      if (action.kind === 'bump') safeInstanceIds.push(id);
      else if (action.kind === 'remap' && action.newActivityId)
        manualRemaps[id] = action.newActivityId;
    }

    if (safeInstanceIds.length === 0 && Object.keys(manualRemaps).length === 0) {
      toast('No instances selected for migration.');
      return;
    }

    migrateMutation.mutate(
      {
        targetVersionId,
        safeInstanceIds,
        manualRemaps,
        migratedBy: 'current-user',
      },
      {
        onSuccess: (result) => {
          setResultModal(result);
          reset();
        },
        onError: () => {
          toast.error('Migration failed');
        },
      },
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/workflow-builder/${workflowId}`)}
            className="btn btn-ghost btn-sm"
          >
            ←
          </button>
          <h1 className="text-base font-semibold">Migrate Running Instances</h1>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => bulkSet(safeIds, { kind: 'bump' })}
            disabled={safeIds.length === 0}
          >
            All Safe → Migrate
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => bulkSet(unsafeIds, { kind: 'skip' })}
            disabled={unsafeIds.length === 0}
          >
            All Unsafe → Pin
          </button>
          <button className="btn btn-ghost btn-xs" onClick={reset}>
            Clear all
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="grid flex-1 grid-cols-[1fr_24rem] overflow-hidden">
        {/* Left — instance table */}
        <div className="overflow-y-auto border-r border-base-300 p-4">
          {loadingInstances ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner" />
            </div>
          ) : (
            <InstanceTable
              instances={instances}
              classifications={classifications}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Right — action panel */}
        <div className="overflow-y-auto">
          <InstanceActionPanel
            instance={selectedInstance}
            classification={selectedId ? classifications[selectedId] : undefined}
            targetSchema={targetSchema}
            breakingChanges={impactReport?.breakingChanges ?? []}
            currentAction={selectedId ? actions[selectedId] : undefined}
            onActionChange={(action) => {
              if (selectedId) setAction(selectedId, action);
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-base-300 bg-base-100 px-4 py-2">
        <p className="text-sm text-base-content/60">
          {bumpCount} migrating · {remapCount} remapping · {skipCount} pinned
        </p>
        <button
          className="btn btn-primary btn-sm"
          disabled={migrateMutation.isPending || (bumpCount === 0 && remapCount === 0)}
          onClick={handleApply}
        >
          {migrateMutation.isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          Apply migration
        </button>
      </div>

      {/* Result modal */}
      {resultModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Migration Complete</h3>
            <div className="mt-4 flex flex-col gap-1 text-sm">
              <p>
                <span className="text-success">{resultModal.migratedCount}</span> migrated
              </p>
              {resultModal.failedCount > 0 && (
                <p>
                  <span className="text-error">{resultModal.failedCount}</span> failed
                </p>
              )}
              {resultModal.skippedCount > 0 && (
                <p>{resultModal.skippedCount} skipped</p>
              )}
              {resultModal.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-error">Errors</p>
                  {resultModal.errors.map((e, i) => (
                    <p key={i} className="text-xs text-error">
                      {e.instanceId.slice(0, 8)}… — {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setResultModal(null);
                  navigate(`/workflow-builder/${workflowId}`);
                }}
              >
                Done
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setResultModal(null)} />
        </dialog>
      )}
    </div>
  );
}
