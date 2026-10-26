import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/shared/components/Icon';
import type { BriefAsset, BriefMachine, BriefProject } from '../api/appraisalBrief';
import { SceneEngine, type HoverCard } from '../scene3d/engine';
import { ZOOM_IN, ZOOM_OUT } from '../scene3d/depth';
import type { BuiltCallout } from '../scene3d/kit';

import { buildSceneSpec } from '../scene3d/model';
import { useUIStore } from '@/shared/store';
import { usePaletteVars } from '../scene3d/usePaletteVars';
import { useSceneEnv } from '../scene3d/useSceneEnv';
import { useSummary } from '../scene3d/useSummary';
import { HERO_HOST_CLASS, HeroBox, HeroTitle } from './CollateralHero';
import CollateralSummary from './CollateralSummary';

interface Props {
  assets: BriefAsset[];
  project: BriefProject | null;
  machines?: BriefMachine[];
  /** The appraisal the brief is of: new data (re-frame, replay the rise) is another appraisal; the same one only relabels. */
  appraisalId: string;
  /** WebGL failed to start or the context was lost: the caller shows the CSS scene instead. */
  onUnavailable: () => void;
}

/**
 * The collateral as a three.js model built from the descriptive fields of the appraisal. The
 * picture assumes (where things stand, roof form, what a land use looks like) but the cards and
 * hover tips state only recorded data. Orbit with the pointer; the wheel scrolls the page and
 * +/- zoom. One canvas, rendered on demand, fully released on unmount.
 */
const CollateralScene3D = ({ assets, project, machines, appraisalId, onUnavailable }: Props) => {
  const env = useSceneEnv();
  const paletteVars = usePaletteVars();
  const spec = useMemo(() => {
    try {
      return buildSceneSpec(assets, project, env);
    } catch (e) {
      console.error('Collateral 3D scene could not be built; showing the CSS scene', e);
      return null;
    }
  }, [assets, project, env]);
  const summary = useSummary(env, assets, project, machines);

  // The engine outlives renders; it calls the LATEST onUnavailable, not the first render's.
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  });
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const tipPos = useRef({ x: 0, y: 0 });
  const hideTimer = useRef<number | undefined>(undefined);
  /** The pointer is on a pin (its dot or its pill). */
  const overPin = useRef(false);
  const tipKey = useRef<string | null>(null);
  const calloutEls = useRef<(HTMLElement | null)[]>([]);
  const leaderEls = useRef<(SVGLineElement | null)[]>([]);
  const [engine, setEngine] = useState<SceneEngine | null>(null);
  const [callouts, setCallouts] = useState<BuiltCallout[]>([]);
  const [tip, setTip] = useState<Pick<HoverCard, 'title' | 'rows'> | null>(null);

  // The tip follows the pointer by style, not by state: only a change of object re-renders.
  const placeTip = useCallback(() => {
    const el = tipRef.current;
    const host = hostRef.current;
    if (!el || !host) return;
    const { x, y } = tipPos.current;
    // The card must fit a short canvas: clip what does not.
    el.style.maxHeight = `${host.clientHeight - 12}px`;
    el.style.left = `${Math.max(4, Math.min(x + 14, host.clientWidth - el.offsetWidth - 8))}px`;
    el.style.top = `${Math.max(4, Math.min(y + 14, host.clientHeight - el.offsetHeight - 8))}px`;
  }, []);

  // One engine per mount; its cleanup releases the WebGL context.
  useEffect(() => {
    const host = hostRef.current;
    const layer = layerRef.current;
    if (!host || !layer) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let created: SceneEngine;
    try {
      created = new SceneEngine(
        host,
        layer,
        {
          onHover: (card, dismiss) => {
            // A card a pin owns closes by its own rules (the pointer leaving it for good, a blur,
            // Escape) or by a press, tap or click on the canvas (`dismiss`, any pointer type), not
            // because the pointer merely moves over empty canvas; and a mesh under the pointer does
            // not take it while the pointer is on the pin.
            const pinOwned = tipKey.current?.startsWith('pin:');
            if (!card) {
              if (pinOwned && !dismiss) return;
              tipKey.current = null;
              setTip(null);
              return;
            }
            if (pinOwned && overPin.current) return;
            tipPos.current = { x: card.x, y: card.y };
            if (card.key === tipKey.current) placeTip();
            else {
              tipKey.current = card.key;
              setTip({ title: card.title, rows: card.rows });
            }
          },
          onUnavailable: () => unavailable.current(),
        },
        reduced,
      );
    } catch (e) {
      console.error('Collateral 3D scene could not start; showing the CSS scene', e);
      unavailable.current();
      return;
    }
    setEngine(created);
    return () => {
      window.clearTimeout(hideTimer.current);
      created.dispose();
      setEngine(null);
    };
  }, [placeTip]);

  // (Re)build the scene whenever the model changes. Another appraisal re-frames the camera and
  // replays the rise; the same appraisal under new labels (parameters loaded, language switched)
  // or after an edit rebuilds in place, and the engine re-frames only if what is drawn changed
  // materially.
  const loaded = useRef<{ engine: SceneEngine; id: string } | null>(null);
  useEffect(() => {
    if (!engine) return;
    if (!spec) {
      unavailable.current();
      return;
    }
    try {
      const same = loaded.current?.engine === engine && loaded.current.id === appraisalId;
      const built = [...(same ? engine.relabel(spec, env) : engine.load(spec, env))];
      setCallouts(built);
      // A card a pin owns has to follow the rebuild: it reads the pin's new text (a language, new
      // data) when that pin is still there, and closes when it is not or another appraisal loaded.
      const open = tipKey.current;
      if (open?.startsWith('pin:')) {
        const pin = same ? built.find(c => `pin:${c.key}` === open) : undefined;
        if (pin) setTip({ title: pin.title, rows: pin.rows ?? [] });
        else {
          tipKey.current = null;
          setTip(null);
        }
      }
      loaded.current = { engine, id: appraisalId };
      engine.setLabel(spec.summary);
    } catch (e) {
      console.error('Collateral 3D scene could not be drawn; showing the CSS scene', e);
      unavailable.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, spec]);

  // Hand the rendered callout elements to the engine, which moves them every frame.
  useLayoutEffect(() => {
    engine?.setCalloutEls(
      calloutEls.current.slice(0, callouts.length),
      leaderEls.current.slice(0, callouts.length),
    );
  }, [engine, callouts]);

  // What the pins keep clear of and the subject is framed around: the title, the toolbar, the hint
  // and the glass cards (re-read when the cards change, as they are rendered by the summary).
  useLayoutEffect(() => {
    if (!engine) return;
    const cards = [...(cardsRef.current?.querySelectorAll<HTMLElement>('.cs3d-gcard') ?? [])];
    engine.setReserved([titleRef.current, hintRef.current, toolbarRef.current, ...cards]);
    engine.setFrameEls({
      title: titleRef.current,
      column: columnRef.current,
      overview: overviewRef.current,
    });
  }, [engine, summary]);

  useLayoutEffect(placeTip, [tip, placeTip]);

  // A pin opens the same card as the mesh under it, below the pin; the pointer leaving, a blur or
  // Escape closes it, and a tap keeps it until the next tap on the canvas.
  const showPin = (i: number, anchor: HTMLElement) => {
    const host = hostRef.current;
    const c = callouts[i];
    if (!host || !c) return;
    window.clearTimeout(hideTimer.current);
    const hr = host.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    // Relative to the canvas's own box (inside the host's border), as the engine measures it.
    tipPos.current = {
      x: r.left - hr.left - host.clientLeft - 14,
      y: r.bottom - hr.top - host.clientTop - 6,
    };
    const key = `pin:${c.key}`;
    if (key === tipKey.current) placeTip();
    else {
      tipKey.current = key;
      setTip({ title: c.title, rows: c.rows ?? [] });
    }
  };
  // The tip hangs from the dot, whichever of the pin's parts the pointer is on.
  const dotOf = (pin: HTMLElement) => pin.querySelector<HTMLElement>('.cs3d-co-idx') ?? pin;
  const hidePin = () => {
    window.clearTimeout(hideTimer.current);
    tipKey.current = null;
    setTip(null);
  };
  // The pointer crossing the gap between a pin's dot and its pill leaves the pin for a moment: the
  // card closes only if it has not come back within a beat, so that crossing does not flicker. A
  // card the pointer has since opened on a mesh is not the pin's to close.
  const leavePin = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (tipKey.current?.startsWith('pin:')) hidePin();
    }, 150);
  };

  // The palette follows the theme the app is in (ThemeProvider writes the same value to <html>).
  const dark = useUIStore(s => s.theme) === 'dark';
  useEffect(() => {
    engine?.restyle(dark);
  }, [engine, dark]);

  return (
    <HeroBox style={paletteVars}>
      <div ref={hostRef} role="group" aria-label={env.t('regionLabel')} className={HERO_HOST_CLASS}>
        <div ref={layerRef} className="cs3d-callouts">
          {/* Every leader line in one layer under all pins: a pill hides any line that crosses it. */}
          <svg className="cs3d-leaders" aria-hidden="true">
            {callouts.map((c, i) => (
              <line
                key={`l-${c.key}`}
                ref={el => {
                  leaderEls.current[i] = el;
                }}
                className={c.tone}
                x1="0"
                y1="0"
                x2="0"
                y2="0"
              />
            ))}
          </svg>
          {callouts.map((c, i) => (
            <div
              key={c.key}
              ref={el => {
                calloutEls.current[i] = el;
              }}
              className={`cs3d-co${c.tone ? ` ${c.tone}` : ''}`}
              hidden
              // The dot and its pill are one hover region: moving between them neither hides nor re-opens the card.
              role="presentation"
              onPointerEnter={e => {
                overPin.current = true;
                showPin(i, dotOf(e.currentTarget));
              }}
              onPointerLeave={e => {
                overPin.current = false;
                if (e.pointerType !== 'touch') leavePin();
              }}
              onClick={e => showPin(i, dotOf(e.currentTarget))}
            >
              <span
                className="cs3d-co-idx"
                role="button"
                tabIndex={0}
                aria-label={`${c.title}${c.sub ? `: ${c.sub}` : ''}`}
                onFocus={e => showPin(i, e.currentTarget)}
                onBlur={() => {
                  // A card that has since become a mesh's is not this pin's to close.
                  if (tipKey.current === `pin:${c.key}`) hidePin();
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') hidePin();
                  else if (e.key === 'Enter' || e.key === ' ') {
                    // Space on a role=button would otherwise scroll the page.
                    e.preventDefault();
                    showPin(i, e.currentTarget);
                  }
                }}
              />
              {/* The pill repeats what the dot says: the dot is the control. */}
              <div className="cs3d-co-card">
                <span className="cs3d-co-t">{c.title}</span>
                {c.badge && <span className="cs3d-badge">{c.badge}</span>}
              </div>
            </div>
          ))}
        </div>

        <HeroTitle ref={titleRef} chip={env.t('hero.chip')} hero={summary.hero} />
        <p ref={hintRef} className="cs3d-hint">
          {env.t('hint')}
        </p>
        <div ref={toolbarRef} className="cs3d-toolbar">
          <button
            type="button"
            aria-label={env.t('zoomIn')}
            title={env.t('zoomIn')}
            onClick={() => engine?.zoom(ZOOM_IN)}
          >
            <Icon name="plus" />
          </button>
          <button
            type="button"
            aria-label={env.t('zoomOut')}
            title={env.t('zoomOut')}
            onClick={() => engine?.zoom(ZOOM_OUT)}
          >
            <Icon name="minus" />
          </button>
          <button type="button" onClick={() => engine?.reset()}>
            <Icon name="rotate-left" />
            {env.t('reset')}
          </button>
        </div>

        {tip && (
          <div ref={tipRef} className="cs3d-tip">
            <h4>{tip.title}</h4>
            {tip.rows.length > 0 && (
              <table>
                <tbody>
                  {tip.rows.map((r, i) => (
                    <tr key={`${r.label}-${i}`}>
                      <td>{r.label}</td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <CollateralSummary
        hero={summary.hero}
        items={summary.items}
        nf={env.nf}
        cardsRef={cardsRef}
        overviewRef={overviewRef}
        columnRef={columnRef}
      />
    </HeroBox>
  );
};

export default CollateralScene3D;
