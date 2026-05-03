import Dropdown, { type ListBoxItem } from '@/shared/components/inputs/Dropdown';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { PROJECT_TYPE_LABEL } from '../data/options';
import type { ProjectType } from '../types';
import ChangeProjectTypeDialog, { type ChildCounts } from './ChangeProjectTypeDialog';

interface ProjectTypeSelectorProps {
  projectType: ProjectType;
  appraisalId: string;
  basePath: string;
  hasExistingProject: boolean;
  childCounts: ChildCounts;
}

const TYPE_OPTIONS: ListBoxItem[] = [
  { id: 'Condo', value: 'Condo', label: PROJECT_TYPE_LABEL.Condo },
  { id: 'LandAndBuilding', value: 'LandAndBuilding', label: PROJECT_TYPE_LABEL.LandAndBuilding },
];

/**
 * Project Type selector — sits inline next to the Project Name field.
 *
 * Picking a different value opens the existing `ChangeProjectTypeDialog` so the
 * user explicitly confirms the destructive change (models / towers / units /
 * land / pricing get reset). The dropdown's bound value never moves until the
 * server confirms the switch, so cancelling the dialog leaves the UI in sync.
 *
 * The component renders only the Dropdown (with its own label) so the parent
 * controls the grid placement (col-span-N).
 */
export default function ProjectTypePill({
  projectType,
  appraisalId,
  basePath,
  hasExistingProject,
  childCounts,
}: ProjectTypeSelectorProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isReadOnly = usePageReadOnly();
  const canChange = !isReadOnly && hasExistingProject;

  const handleChange = (next: string | null | undefined) => {
    if (!canChange) return;
    if (!next || next === projectType) return;
    onOpen();
  };

  return (
    <>
      <Dropdown
        label="Project Type"
        options={TYPE_OPTIONS}
        value={projectType}
        onChange={handleChange}
        disabled={!canChange}
        showValuePrefix={false}
        placeholder="Select project type"
      />

      {canChange && (
        <ChangeProjectTypeDialog
          isOpen={isOpen}
          onClose={onClose}
          currentProjectType={projectType}
          appraisalId={appraisalId}
          basePath={basePath}
          childCounts={childCounts}
        />
      )}
    </>
  );
}
