import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Icon from '@/shared/components/Icon';
import { useChangeProjectType } from '../api/project';
import { PROJECT_TYPE_LABEL } from '../data/options';
import type { ProjectType } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChildCounts {
  models: number;
  towers: number;
  units: number;
  hasLand: boolean;
  hasPricing: boolean;
}

interface ChangeProjectTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The current project type (pre-selected, disabled in the radio group). */
  currentProjectType: ProjectType;
  appraisalId: string;
  /** Base path for navigation: '/appraisals/{id}' or '/tasks/{taskId}'. */
  basePath: string;
  childCounts: ChildCounts;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_TYPES: ProjectType[] = ['Condo', 'LandAndBuilding'];

function buildWarningLines(
  from: ProjectType,
  to: ProjectType,
  counts: ChildCounts,
): string[] {
  const lines: string[] = [];

  if (counts.models > 0) {
    lines.push(`${counts.models} Model${counts.models !== 1 ? 's' : ''} will be deleted`);
  }
  // Towers only exist on Condo projects
  if (from === 'Condo' && to === 'LandAndBuilding' && counts.towers > 0) {
    lines.push(`${counts.towers} Tower${counts.towers !== 1 ? 's' : ''} will be deleted`);
  }
  if (counts.units > 0) {
    lines.push(`${counts.units} Unit${counts.units !== 1 ? 's' : ''} will be deleted`);
  }
  // Land only exists on LandAndBuilding projects
  if (from === 'LandAndBuilding' && to === 'Condo' && counts.hasLand) {
    lines.push('Project Land details will be deleted');
  }
  if (counts.hasPricing) {
    lines.push('Pricing assumptions will be reset');
  }
  return lines;
}

function targetRoute(basePath: string, newType: ProjectType): string {
  const segment = newType === 'Condo' ? 'block-condo' : 'block-village';
  return `${basePath}/${segment}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChangeProjectTypeDialog({
  isOpen,
  onClose,
  currentProjectType,
  appraisalId,
  basePath,
  childCounts,
}: ChangeProjectTypeDialogProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProjectType>(
    currentProjectType === 'Condo' ? 'LandAndBuilding' : 'Condo',
  );

  const { mutate: changeType, isPending } = useChangeProjectType();

  // Reset selection to the non-current type whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelected(currentProjectType === 'Condo' ? 'LandAndBuilding' : 'Condo');
    }
  }, [isOpen, currentProjectType]);

  const warningLines = buildWarningLines(currentProjectType, selected, childCounts);
  const canConfirm = selected !== currentProjectType;

  const handleConfirm = () => {
    changeType(
      { appraisalId, newProjectType: selected },
      {
        onSuccess: () => {
          const route = targetRoute(basePath, selected);
          navigate(route, { replace: true });
          onClose();
        },
        onError: (error: unknown) => {
          const apiError = (error as { response?: { data?: { detail?: string } } })
            ?.response?.data?.detail;
          toast.error(apiError ?? 'Failed to change project type');
          // Keep dialog open so user can retry or cancel
        },
      },
    );
  };

  // Reset selection on open so the dialog is always in a clean state
  const handleClose = () => {
    if (!isPending) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Project Type"
      size="sm"
      showCloseButton={!isPending}
    >
      <div className="space-y-5">
        {/* Radio group */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Select new project type</p>
          <div className="space-y-2">
            {ALL_TYPES.map(type => {
              const isCurrent = type === currentProjectType;
              const isChecked = type === selected;
              return (
                <label
                  key={type}
                  className={[
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isCurrent
                      ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                      : isChecked
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={type}
                    checked={isChecked}
                    disabled={isCurrent || isPending}
                    onChange={() => setSelected(type)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {PROJECT_TYPE_LABEL[type]}
                  </span>
                  {isCurrent && (
                    <span className="ml-auto text-xs text-gray-400 font-normal">Current</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Destructive warning */}
        {warningLines.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <Icon
                name="triangle-exclamation"
                style="solid"
                className="size-4 text-amber-500 shrink-0 mt-0.5"
              />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-800">
                  The following data will be permanently deleted:
                </p>
                <ul className="space-y-0.5">
                  {warningLines.map(line => (
                    <li key={line} className="text-xs text-amber-700 flex items-center gap-1.5">
                      <span className="size-1 rounded-full bg-amber-500 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isPending}
            className="flex-1 px-4 py-2.5 bg-danger hover:bg-danger/80 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                Changing...
              </span>
            ) : (
              'Change Type'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
