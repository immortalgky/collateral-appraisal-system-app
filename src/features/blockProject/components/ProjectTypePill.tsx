import Dropdown from '@/shared/components/inputs/Dropdown';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import type { ProjectType } from '../types';

interface ProjectTypeSelectorProps {
  projectType: ProjectType;
  /** Pending selection not yet confirmed — shown in the dropdown but not saved. */
  pendingType: ProjectType | null;
  hasExistingProject: boolean;
  /** Called when the user picks from the dropdown. null means revert to current type. */
  onPendingTypeChange: (newType: ProjectType | null) => void;
}

/**
 * Project Type selector — sits inline next to the Project Name field.
 *
 * Picking a different value stores a pending selection (shown immediately in the
 * dropdown) but does NOT trigger the confirmation dialog. The parent intercepts
 * Save and shows `ChangeProjectTypeDialog` at that point, so the user confirms
 * the destructive change only when they explicitly try to save.
 */
export default function ProjectTypePill({
  projectType,
  pendingType,
  hasExistingProject,
  onPendingTypeChange,
}: ProjectTypeSelectorProps) {
  const typeOptions = useParameterOptions('ProjectType');
  const isReadOnly = usePageReadOnly();
  const canChange = !isReadOnly && hasExistingProject;

  const handleChange = (next: string | null | undefined) => {
    if (!canChange || !next) return;
    // Selecting the current saved type clears the pending selection (revert)
    onPendingTypeChange(next === projectType ? null : (next as ProjectType));
  };

  return (
    <Dropdown
      label="Project Type"
      options={typeOptions}
      value={pendingType ?? projectType}
      onChange={handleChange}
      disabled={!canChange}
      showValuePrefix={false}
      placeholder="Select project type"
    />
  );
}
