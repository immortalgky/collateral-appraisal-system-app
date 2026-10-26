import type { CSSProperties, ReactNode, Ref } from 'react';
import { SCENE_HEIGHT } from '../scene3d/sceneSize';

/** The class of the area the scene (or its stand-in) fills, so the loading frame and the loaded hero cannot differ. */
export const HERO_HOST_CLASS = `cs3d ${SCENE_HEIGHT}`;

/**
 * The box and the hero shell of the collateral section, shared by the loaded 3D scene and the
 * frame shown while it loads: the same sky, border and cards in the same places.
 */
export const HeroBox = ({
  style,
  busy = false,
  flat = false,
  children,
}: {
  style: CSSProperties;
  busy?: boolean;
  /** No canvas (an application 3D cannot draw): the sky panel holds the title and the cards, and is as tall as they are. */
  flat?: boolean;
  children: ReactNode;
}) => (
  <div className="cs3d-box mb-3" aria-busy={busy || undefined} style={style}>
    <div className={flat ? 'cs3d-flat' : 'cs3d-hero'}>{children}</div>
  </div>
);

/** The chip, title and subtitle over the top-left of the scene. */
export const HeroTitle = ({
  chip,
  hero,
  ref,
}: {
  chip: string;
  hero: { title: string; subtitle: string };
  ref?: Ref<HTMLDivElement>;
}) => (
  <div ref={ref} className="cs3d-title">
    <span className="cs3d-chip">{chip}</span>
    <h4 className="cs3d-title-h">{hero.title}</h4>
    {hero.subtitle && <p>{hero.subtitle}</p>}
  </div>
);
