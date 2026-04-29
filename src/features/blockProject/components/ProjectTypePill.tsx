import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { PROJECT_TYPE_LABEL } from '../data/options';
import type { ProjectType } from '../types';
import ChangeProjectTypeDialog, { type ChildCounts } from './ChangeProjectTypeDialog';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectTypePillProps {
  projectType: ProjectType;
  appraisalId: string;
  basePath: string;
  hasExistingProject: boolean;
  childCounts: ChildCounts;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const PILL_STYLES: Record<ProjectType, { pill: string; icon: string; iconCls: string }> = {
  Condo: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'building',
    iconCls: 'text-blue-500',
  },
  LandAndBuilding: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'house',
    iconCls: 'text-emerald-500',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectTypePill({
  projectType,
  appraisalId,
  basePath,
  hasExistingProject,
  childCounts,
}: ProjectTypePillProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isReadOnly = usePageReadOnly();
  const styles = PILL_STYLES[projectType];

  const showEditButton = !isReadOnly && hasExistingProject;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Type pill */}
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
            styles.pill,
          )}
        >
          <Icon name={styles.icon} style="solid" className={clsx('size-3', styles.iconCls)} />
          <span>Project Type: {PROJECT_TYPE_LABEL[projectType]}</span>
        </span>

        {/* Edit affordance — hidden when read-only or no project exists yet */}
        {showEditButton && (
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center justify-center size-6 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Change project type"
            title="Change project type"
          >
            <Icon name="pencil" style="solid" className="size-3" />
          </button>
        )}
      </div>

      {showEditButton && (
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
