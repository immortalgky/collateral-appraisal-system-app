import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usePreviewPublish, usePublishVersion } from '../../api';
import type { PublishImpactReport, PublishVersionResponse } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  definitionId: string;
  versionId: string;
  publishedBy: string;
  onPublished: (result: PublishVersionResponse) => void;
}

const impactColor: Record<string, string> = {
  Low: 'badge-info',
  Medium: 'badge-warning',
  High: 'badge-error',
  Critical: 'badge-error',
};

export function PublishPreviewModal({
  open,
  onClose,
  definitionId,
  versionId,
  publishedBy,
  onPublished,
}: Props) {
  const [report, setReport] = useState<PublishImpactReport | null>(null);

  const previewMutation = usePreviewPublish();
  const publishMutation = usePublishVersion();

  // Fetch preview whenever modal opens
  useEffect(() => {
    if (!open) return;
    setReport(null);
    previewMutation.mutate(
      { definitionId, versionId },
      { onSuccess: setReport },
    );
  }, [open, definitionId, versionId]);

  if (!open) return null;

  const handlePublish = () => {
    if (!report) return;
    publishMutation.mutate(
      {
        definitionId,
        versionId,
        publishedBy,
        confirmedBreakingChangeHash: report.breakingChangeHash || null,
      },
      {
        onSuccess: (result) => {
          if (!result.isSuccess) {
            toast.error(result.errorMessage || 'Publish failed');
            return;
          }
          toast.success(`Workflow published (v${result.version})`);
          onPublished(result);
        },
        onError: (err: unknown) => {
          // 409 — breaking changes changed since preview; refresh report
          const conflict = err as { impactReport?: PublishImpactReport };
          if (conflict?.impactReport) {
            setReport(conflict.impactReport);
            toast.error('Breaking changes updated — please review again');
            return;
          }
          toast.error('Failed to publish workflow');
        },
      },
    );
  };

  const isLoading = previewMutation.isPending;
  const isPublishing = publishMutation.isPending;
  const hasInstances = report && (report.safeCount > 0 || report.unsafeCount > 0);

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="text-lg font-bold">Publish Workflow</h3>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner" />
          </div>
        ) : report ? (
          <div className="mt-4 flex flex-col gap-4">
            {/* Breaking changes */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">Breaking Changes</h4>
              {report.breakingChanges.length === 0 ? (
                <p className="text-sm text-success">No breaking changes detected ✓</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.breakingChanges.map((bc, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-base-300 p-2"
                    >
                      <span className={`badge badge-sm shrink-0 ${impactColor[bc.impact] ?? 'badge-ghost'}`}>
                        {bc.impact}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm">{bc.description}</p>
                        <p className="text-xs text-base-content/60">
                          {bc.affectedComponent}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Running instance impact */}
            {hasInstances && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Running Instances</h4>
                <p className="text-sm">
                  {report.safeCount + report.unsafeCount} running instance
                  {report.safeCount + report.unsafeCount !== 1 ? 's' : ''} affected —{' '}
                  <span className="text-success">{report.safeCount} safe</span>,{' '}
                  <span className="text-error">{report.unsafeCount} need manual action</span>
                </p>
                {report.sample.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="table table-xs w-full">
                      <thead>
                        <tr>
                          <th>Instance</th>
                          <th>Current Activity</th>
                          <th>Started</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.sample.map((inst) => (
                          <tr key={inst.instanceId}>
                            <td className="font-mono text-xs">
                              {inst.instanceId.slice(0, 8)}…
                            </td>
                            <td>{inst.currentActivityId}</td>
                            <td>{new Date(inst.startedOn).toLocaleDateString()}</td>
                            <td>
                              <span
                                className={`badge badge-xs ${
                                  inst.classification === 'Safe'
                                    ? 'badge-success'
                                    : 'badge-error'
                                }`}
                              >
                                {inst.classification}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {report.unsafeCount > 0 && (
                  <p className="mt-2 text-xs text-base-content/60">
                    Unsafe instances will stay pinned on the current (now deprecated) version.
                    You can migrate them manually after publishing.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : previewMutation.isError ? (
          <p className="mt-4 text-sm text-error">
            Failed to load preview. You can still publish without impact analysis.
          </p>
        ) : null}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={isPublishing}>
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isLoading || isPublishing}
            className="btn btn-primary btn-sm"
          >
            {isPublishing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            {hasInstances && report!.unsafeCount > 0
              ? 'Publish & Migrate'
              : 'Publish'}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
