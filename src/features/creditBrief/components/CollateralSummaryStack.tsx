import { useTranslation } from 'react-i18next';
import type { BriefAsset, BriefMachine, BriefProject } from '../api/appraisalBrief';
import { usePaletteVars } from '../scene3d/usePaletteVars';
import { useSceneEnv } from '../scene3d/useSceneEnv';
import { useSummary } from '../scene3d/useSummary';
import { HERO_HOST_CLASS, HeroBox, HeroTitle } from './CollateralHero';
import CollateralSummary from './CollateralSummary';

interface Props {
  assets: BriefAsset[];
  project: BriefProject | null;
  machines?: BriefMachine[];
  /**
   * The hero without its canvas, while the 3D chunk loads: the same box, sky, title and cards in
   * the same places as CollateralScene3D (over the scene area from 640px of width, under it
   * below), so nothing moves when the canvas arrives.
   */
  frame?: boolean;
  /**
   * The hero without a model, for an application 3D cannot draw: the same title and cards on the
   * same sky, with no canvas, toolbar or pins, as tall as its content.
   */
  flat?: boolean;
}

/** The summary cards on their own, stacked under the CSS scene (the 3D scene carries its own). */
const CollateralSummaryStack = ({
  assets,
  project,
  machines,
  frame = false,
  flat = false,
}: Props) => {
  const { t } = useTranslation('appraisal');
  const env = useSceneEnv();
  const paletteVars = usePaletteVars();
  const { hero, items } = useSummary(env, assets, project, machines);
  const cards = <CollateralSummary hero={hero} items={items} nf={env.nf} />;
  if (flat) {
    return (
      <HeroBox style={paletteVars} flat>
        <HeroTitle chip={t('activityTracking.brief.collateral.scene3d.hero.chip')} hero={hero} />
        {cards}
      </HeroBox>
    );
  }
  if (!frame) return cards;
  return (
    <HeroBox style={paletteVars} busy>
      <div className={HERO_HOST_CLASS}>
        <HeroTitle chip={t('activityTracking.brief.collateral.scene3d.hero.chip')} hero={hero} />
      </div>
      {cards}
    </HeroBox>
  );
};

export default CollateralSummaryStack;
