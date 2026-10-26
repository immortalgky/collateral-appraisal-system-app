import { Suspense, useLayoutEffect, useRef, useState } from 'react';
import { canDraw3D } from '../scene3d/drawable';
import { retryingLazy } from '../scene3d/retryingLazy';
import { usePaletteVars } from '../scene3d/usePaletteVars';
import { detectGpu } from '../scene3d/webgl';
import type { BriefAsset, BriefMachine, BriefProject } from '../api/appraisalBrief';
import CollateralScene from './CollateralScene';
import CollateralSummaryStack from './CollateralSummaryStack';

/** What the scenes draw. */
interface View {
  assets: BriefAsset[];
  project: BriefProject | null;
  machines?: BriefMachine[];
}

interface Props extends View {
  /** The appraisal the brief is of: a failure belongs to it, whatever refetches the data. */
  appraisalId: string;
}

type Scene3DProps = Props & { onUnavailable: () => void };

/**
 * The CSS scene with the summary cards stacked under it (the 3D scene carries its own over its
 * canvas). The cards need no three.js and are bundled with the brief, so the property list is
 * there from the first paint, wherever 3D is unavailable. `compact` is the permanent view of an
 * application 3D never draws; the default stands in for a 3D hero that was lost.
 */
const CssSceneWithSummary = ({
  assets,
  project,
  machines,
  compact = false,
}: View & { compact?: boolean }) => {
  const paletteVars = usePaletteVars();
  return (
    <div className="cs3d-stack" style={paletteVars}>
      <CollateralScene assets={assets} project={project} compact={compact} />
      <CollateralSummaryStack assets={assets} project={project} machines={machines} />
    </div>
  );
};

// three.js is its own chunk, fetched only when a brief with something to draw opens. A failed
// fetch shows the CSS scene (same props) and is retried the next time the section mounts.
const scene3D = retryingLazy<Scene3DProps>(
  () => import('./CollateralScene3D'),
  CssSceneWithSummary,
);

/**
 * The 3D scene where WebGL works and the application is one site we can draw; the CSS isometric
 * scene everywhere else (no WebGL, a lost context, mixed kinds, a tower-less project) and while
 * the 3D chunk loads, at the same size so nothing jumps. The 3D scene carries the summary cards
 * over its canvas; under the CSS scene they stack below it.
 */
const CollateralSceneSwitch = ({ assets, project, machines, appraisalId }: Props) => {
  // The component this mount uses, fixed for its lifetime (see retryingLazy).
  const [Scene3D] = useState(scene3D);
  const drawable = canDraw3D(assets, project);
  // The GPU is probed once, for an application 3D could draw, before the first paint (a layout
  // effect: no work during render, and no flash of the wrong view); StrictMode's second run of the
  // effect finds `probed` set. A failed probe is not kept across mounts. Until then, the loading frame.
  const [gl, setGl] = useState<boolean | null>(null);
  const probed = useRef(false);
  useLayoutEffect(() => {
    if (!drawable || probed.current) return;
    probed.current = true;
    setGl(detectGpu().available);
  }, [drawable]);
  // A failure belongs to the appraisal it happened on: another appraisal starts fresh, and a
  // refetch of the same one does not clear it.
  const [failedFor, setFailedFor] = useState<string | null>(null);

  // An application 3D cannot draw: the hero without a model, whatever happened before.
  if (!drawable) {
    return <CollateralSummaryStack assets={assets} project={project} machines={machines} flat />;
  }
  // No WebGL on this browser: the CSS scene is the permanent view, at its own height.
  if (gl === false) {
    return <CssSceneWithSummary assets={assets} project={project} machines={machines} compact />;
  }
  // Lost after 3D was tried: the CSS scene stands in for the hero, at its height.
  if (failedFor === appraisalId) {
    return <CssSceneWithSummary assets={assets} project={project} machines={machines} />;
  }
  return (
    // While the 3D chunk loads: the hero without its canvas, laid out as the loaded one is.
    <Suspense
      fallback={
        <CollateralSummaryStack assets={assets} project={project} machines={machines} frame />
      }
    >
      <Scene3D
        assets={assets}
        project={project}
        machines={machines}
        appraisalId={appraisalId}
        onUnavailable={() => setFailedFor(appraisalId)}
      />
    </Suspense>
  );
};

export default CollateralSceneSwitch;
