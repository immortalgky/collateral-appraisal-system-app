import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import DataErrorState from '@/shared/components/DataErrorState';
import type { PropertyCorrectionDtoType } from '@shared/schemas/v1';
import { useGetProject } from '@/features/blockProject/api/project';
import { useGetProjectLand } from '@/features/blockProject/api/projectLand';
import {
  useGetProjectModelById,
  useGetProjectModels,
} from '@/features/blockProject/api/projectModel';
import {
  useGetProjectTowerById,
  useGetProjectTowers,
} from '@/features/blockProject/api/projectTower';
import { CondoShellContext } from '@/features/blockProject/components/condo/CondoShellContext';
import ProjectInfoForm from '@/features/blockProject/forms/ProjectInfoForm';
import { ProjectLandFormBody } from '@/features/blockProject/forms/ProjectLandForm';
import ModelDetailForm from '@/features/blockProject/forms/ModelDetailForm';
import TowerDetailForm from '@/features/blockProject/forms/TowerDetailForm';
import {
  projectInfoForm,
  projectModelForm,
  projectTowerForm,
} from '@/features/blockProject/schemas/form';
import { isCondo, type Project, type ProjectType } from '@/features/blockProject/types';
import {
  modelToForm,
  modelToPayload,
  projectToInfoForm,
  towerToForm,
} from '@/features/blockProject/utils/formMappers';
import { createProjectLandForm } from '@/features/appraisal/schemas/form';
import { mapProjectLandPropertyResponseToForm } from '@/features/appraisal/utils/mappers';
import { countUnder, latestOf, PROJECT_PANES, projectRowPane } from '../../utils/correctionHistory';
import { ProjectCorrectionEditor } from './ProjectCorrectionEditor';
import UnitPriceCorrectionPane from './UnitPriceCorrectionPane';

/** What every project editor shares with the page: the history and the rail's markers. */
interface PaneContext {
  appraisalId: string;
  projectType: ProjectType;
  corrections: PropertyCorrectionDtoType[] | undefined;
  editCounts: ReadonlyMap<string, number>;
  onOpenHistory: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  onSelect: (pane: string) => void;
}

/** The history props of one editor: its own rows only. */
const historyOf = (ctx: PaneContext, pane: string) => ({
  editCount: ctx.corrections && (ctx.editCounts.get(pane) ?? 0),
  latestEdit: latestOf(ctx.corrections ?? [], pane),
  onOpenHistory: ctx.onOpenHistory,
  onDirtyChange: ctx.onDirtyChange,
});

// ── Project info ─────────────────────────────────────────────────────────────

function InfoEditor({ ctx, project }: { ctx: PaneContext; project: Project }) {
  const { t } = useTranslation('blockProject');
  const query = useGetProject(ctx.appraisalId);
  const schema = useMemo(() => projectInfoForm(ctx.projectType), [ctx.projectType]);
  return (
    <ProjectCorrectionEditor
      appraisalId={ctx.appraisalId}
      target="info"
      record={query}
      schema={schema}
      toForm={(p: Project) => projectToInfoForm(p, ctx.projectType)}
      title={project.projectName || t('page.tabs.projectInfo')}
      titleMuted={!project.projectName}
      {...historyOf(ctx, PROJECT_PANES.info)}
    >
      {/* No type pill: a correction never changes the project type. */}
      <ProjectInfoForm projectType={ctx.projectType} />
    </ProjectCorrectionEditor>
  );
}

// ── Project land ─────────────────────────────────────────────────────────────

function LandEditor({ ctx }: { ctx: PaneContext }) {
  const { t } = useTranslation('blockProject');
  const query = useGetProjectLand(ctx.appraisalId);
  return (
    <ProjectCorrectionEditor
      appraisalId={ctx.appraisalId}
      target="land"
      record={query}
      schema={createProjectLandForm}
      // The block page's own hydration: the land DTO is close enough to the property land response.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toForm={land => mapProjectLandPropertyResponseToForm(land as any)}
      title={t('page.tabs.projectLand')}
      {...historyOf(ctx, PROJECT_PANES.land)}
    >
      <ProjectLandFormBody />
    </ProjectCorrectionEditor>
  );
}

// ── Model and tower ──────────────────────────────────────────────────────────

function ModelEditor({ ctx, modelId }: { ctx: PaneContext; modelId: string }) {
  const { t } = useTranslation('appraisalDataCorrection');
  const query = useGetProjectModelById(ctx.appraisalId, modelId);
  const condo = isCondo(ctx.projectType);
  // Condo: the model form's tower selector.
  const { data: towers } = useGetProjectTowers(ctx.appraisalId, condo);
  const schema = useMemo(() => projectModelForm(ctx.projectType), [ctx.projectType]);
  return (
    <ProjectCorrectionEditor
      key={modelId}
      appraisalId={ctx.appraisalId}
      target="models"
      targetId={modelId}
      record={query}
      schema={schema}
      toForm={model => modelToForm(model, ctx.projectType)}
      toPayload={modelToPayload}
      title={query.data?.modelName || t('project.unnamedModel')}
      titleMuted={!query.data?.modelName}
      onBack={() => ctx.onSelect(PROJECT_PANES.models)}
      {...historyOf(ctx, projectRowPane('models', modelId))}
    >
      <ModelDetailForm projectType={ctx.projectType} towers={condo ? (towers ?? []) : []} />
    </ProjectCorrectionEditor>
  );
}

function TowerEditor({ ctx, towerId }: { ctx: PaneContext; towerId: string }) {
  const { t } = useTranslation('appraisalDataCorrection');
  const query = useGetProjectTowerById(ctx.appraisalId, towerId);
  return (
    <ProjectCorrectionEditor
      key={towerId}
      appraisalId={ctx.appraisalId}
      target="towers"
      targetId={towerId}
      record={query}
      schema={projectTowerForm}
      toForm={towerToForm}
      title={query.data?.towerName || t('project.unnamedTower')}
      titleMuted={!query.data?.towerName}
      onBack={() => ctx.onSelect(PROJECT_PANES.towers)}
      {...historyOf(ctx, projectRowPane('towers', towerId))}
    >
      <TowerDetailForm savedTower={query.data ?? undefined} />
    </ProjectCorrectionEditor>
  );
}

/**
 * The models or towers of the project, to pick one to correct. Details only: no add or delete, as a
 * property correction cannot add or remove a property.
 */
function RowList({
  ctx,
  list,
  rows,
  isLoading,
  isError,
  onRetry,
}: {
  ctx: PaneContext;
  list: 'models' | 'towers';
  rows: { id: string; name?: string; sub?: string }[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation('appraisalDataCorrection');
  const { t: tb } = useTranslation('blockProject');

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="flex items-center justify-center py-10">
        <Icon
          name="spinner"
          style="solid"
          className="size-6 animate-spin text-(--palette-primary-text)"
        />
      </div>
    );
  } else if (isError) {
    body = <DataErrorState variant="inline" onRetry={onRetry} />;
  } else if (rows.length === 0) {
    body = (
      <p className="px-4 py-8 text-center text-sm text-(--palette-gray-500)">
        {t(list === 'models' ? 'project.noModels' : 'project.noTowers')}
      </p>
    );
  } else {
    body = (
      <ul className="divide-y divide-(--palette-line-soft)">
        {rows.map(row => {
          const pane = projectRowPane(list, row.id);
          const edits = countUnder(ctx.editCounts, pane);
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => ctx.onSelect(pane)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-(--palette-surface-2)"
              >
                <Icon
                  style="solid"
                  name={
                    list === 'towers'
                      ? 'building'
                      : isCondo(ctx.projectType)
                        ? 'layer-group'
                        : 'house'
                  }
                  className="text-sm text-(--palette-gray-400)"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      'block truncate text-sm font-medium',
                      row.name ? 'text-(--palette-ink)' : 'italic text-(--palette-ink-2)',
                    )}
                  >
                    {row.name ||
                      t(list === 'models' ? 'project.unnamedModel' : 'project.unnamedTower')}
                  </span>
                  {row.sub && (
                    <span className="block truncate text-xs text-(--palette-gray-500)">
                      {row.sub}
                    </span>
                  )}
                </span>
                {edits > 0 && (
                  <span className="shrink-0 rounded-full bg-(--dc-warn-wash) px-2 py-0.5 text-xs font-medium text-(--dc-warn)">
                    {t('rail.edits', { count: edits })}
                  </span>
                )}
                <Icon
                  name="chevron-right"
                  style="solid"
                  className="text-xs text-(--palette-gray-400)"
                />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 pt-[0.8571rem]">
      <section className="rounded-section border border-(--palette-line) bg-(--palette-surface) shadow-sm">
        <header className="flex items-center gap-2 border-b border-(--palette-line-soft) px-4 py-[0.6429rem]">
          <h2 className="text-base font-semibold text-gray-800">
            {tb(list === 'models' ? 'page.tabs.models' : 'page.tabs.towers')}
          </h2>
          <span className="ml-auto text-xs text-(--palette-ink-2)">
            {t('project.pickToCorrect')}
          </span>
        </header>
        {body}
      </section>
    </div>
  );
}

function ModelList({ ctx }: { ctx: PaneContext }) {
  const { data, isLoading, isError, refetch } = useGetProjectModels(ctx.appraisalId);
  return (
    <RowList
      ctx={ctx}
      list="models"
      rows={(data ?? []).map(m => ({ id: m.id, name: m.modelName, sub: m.modelDescription }))}
      isLoading={isLoading}
      isError={isError && !data}
      onRetry={() => refetch()}
    />
  );
}

function TowerList({ ctx }: { ctx: PaneContext }) {
  const { data, isLoading, isError, refetch } = useGetProjectTowers(ctx.appraisalId);
  return (
    <RowList
      ctx={ctx}
      list="towers"
      rows={(data ?? []).map(tw => ({ id: tw.id, name: tw.towerName }))}
      isLoading={isLoading}
      isError={isError && !data}
      onRetry={() => refetch()}
    />
  );
}

// ── The pane ─────────────────────────────────────────────────────────────────

interface ProjectCorrectionPaneProps extends Omit<PaneContext, 'projectType'> {
  project: Project;
  /** A `project:…` selection (see PROJECT_PANES). */
  pane: string;
}

/**
 * The editor of the project entry selected in the rail. The block forms read the project's type from
 * the block page's shell context (`useBlockProjectType`), so the pane provides one: the stored type,
 * no tabs, never the expanded-table mode.
 */
export default function ProjectCorrectionPane({
  project,
  pane,
  ...rest
}: ProjectCorrectionPaneProps) {
  const ctx: PaneContext = { ...rest, projectType: project.projectType };
  const [, list, rowId] = pane.split(':');

  let editor: ReactNode;
  if (pane === PROJECT_PANES.info) editor = <InfoEditor ctx={ctx} project={project} />;
  else if (pane === PROJECT_PANES.land) editor = <LandEditor ctx={ctx} />;
  else if (pane === PROJECT_PANES.unitPrice)
    editor = (
      <UnitPriceCorrectionPane
        appraisalId={ctx.appraisalId}
        projectType={ctx.projectType}
        {...historyOf(ctx, PROJECT_PANES.unitPrice)}
      />
    );
  else if (list === 'models')
    editor = rowId ? <ModelEditor ctx={ctx} modelId={rowId} /> : <ModelList ctx={ctx} />;
  else if (list === 'towers')
    editor = rowId ? <TowerEditor ctx={ctx} towerId={rowId} /> : <TowerList ctx={ctx} />;

  return (
    <CondoShellContext.Provider
      value={{
        projectType: project.projectType,
        tabs: [],
        activeTab: '',
        onTabChange: () => {},
        focus: false,
        onFocusChange: () => {},
      }}
    >
      {editor}
    </CondoShellContext.Provider>
  );
}
