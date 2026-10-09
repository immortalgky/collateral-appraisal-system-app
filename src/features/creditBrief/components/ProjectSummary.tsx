import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { getPropertyIcon } from '@/features/appraisal/utils/propertyTypeConfig';
import { totalArea } from '../sceneModel';
import type { BriefProject } from '../api/appraisalBrief';

/**
 * The collateral on a BLOCK appraisal.
 *
 * Its own row rather than a synthetic entry in CollateralList: a block appraisal
 * values a whole project and holds zero AppraisalProperties, so there is nothing
 * for that list to iterate. Without this the section rendered "no collateral on
 * this request" for every block appraisal in the system.
 */
interface ProjectSummaryProps {
  project: BriefProject;
}

const ProjectSummary = ({ project }: ProjectSummaryProps) => {
  const { t } = useTranslation('appraisal');
  const icon = getPropertyIcon(project.projectType ?? '');

  const area = totalArea([
    {
      areaRai: project.landAreaRai,
      areaNgan: project.landAreaNgan,
      areaSquareWa: project.landAreaSquareWa,
    } as never,
  ]);

  /**
   * What the project is made of, ahead of how big its plot is. A condo says
   * towers and storeys; a housing estate says houses and storeys; both beat the
   * land area, which on the dev database is unset more often than not.
   */
  const shape =
    project.towerCount > 0 && project.maxFloor
      ? t('activityTracking.brief.collateral.towerFloors', {
          towers: project.towerCount,
          floors: project.maxFloor,
        })
      : project.unitStoreys
        ? t('activityTracking.brief.collateral.houseStoreys', {
            count: project.unitForSaleCount ?? project.unitCount,
            floors: Math.round(project.unitStoreys),
          })
        : null;

  const facts = [
    shape,
    area
      ? t('activityTracking.brief.collateral.totalArea', {
          area: [
            `${area.rai} ${t('activityTracking.brief.collateral.rai')}`,
            `${area.ngan} ${t('activityTracking.brief.collateral.ngan')}`,
            `${area.wa} ${t('activityTracking.brief.collateral.wa')}`,
          ].join(' '),
        })
      : null,
    project.numberOfPhase
      ? t('activityTracking.brief.collateral.phases', { count: project.numberOfPhase })
      : null,
    project.developer
      ? t('activityTracking.brief.collateral.developer', { name: project.developer })
      : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-white text-amber-600 ring-1 ring-gray-200">
          <Icon name={icon.name} style={icon.style} className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-gray-900">
            {project.projectName || t('activityTracking.brief.collateral.project')}
            {project.projectType && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                <ParameterDisplay
                  group="PropertyType"
                  code={project.projectType}
                  fallback={project.projectType}
                />
              </span>
            )}
          </span>
          {facts.length > 0 && (
            <p className="truncate text-xs text-gray-500">{facts.join(' · ')}</p>
          )}
        </div>
      </div>
      {/* UnitForSaleCount is what the appraiser declared; unitCount is what was
          actually uploaded. Prefer the declaration, fall back to the count, so a
          project never shows a blank where it plainly has units.

          "ยูนิต" is condominium language. A housing estate is counted in หลัง,
          and the row was saying "3 ยูนิต" beside a fact line reading "3 หลัง". */}
      {!!(project.unitForSaleCount ?? project.unitCount) && (
        <span className="flex-none rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-600 ring-1 ring-gray-200">
          {t(
            project.towerCount > 0
              ? 'activityTracking.brief.collateral.unitsOrHouses_unit'
              : 'activityTracking.brief.collateral.unitsOrHouses_house',
            { count: project.unitForSaleCount ?? project.unitCount },
          )}
        </span>
      )}
    </div>
  );
};

export default ProjectSummary;
