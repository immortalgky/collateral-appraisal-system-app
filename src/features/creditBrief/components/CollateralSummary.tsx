import { memo, useCallback, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { HeroModel, TileIcon } from '../scene3d/heroModel';
import type { SummaryItem } from '../scene3d/summaryItems';

/**
 * The cards of the collateral hero: the overview tiles, the one big figure, the percentage bars
 * and the property list. Over the 3D canvas from 640px of its own width (compact below 1180px) (see collateralScene.css), stacked
 * under the scene everywhere else, and under the CSS scene when 3D is unavailable.
 */

/** The shared sprite icons (`public/icons`): the property glyphs for what the collateral is, solid ones for the rest. */
type Glyph = { style: 'solid' | 'property'; name: string };
const solid = (name: string): Glyph => ({ style: 'solid', name });

const TILE_ICON: Record<TileIcon, Glyph> = {
  area: solid('vector-square'),
  width: solid('arrows-left-right'),
  shape: solid('draw-polygon'),
  use: solid('seedling'),
  floors: solid('layer-group'),
  usable: solid('border-all'),
  age: solid('clock'),
  cond: solid('circle-check'),
  room: solid('door-open'),
  view: solid('eye'),
  height: solid('building'),
  building: solid('city'),
  units: solid('cubes'),
  sold: solid('tag'),
  plots: solid('table-cells'),
  machine: solid('gear'),
  models: solid('house'),
  progress: solid('gauge'),
};

const ITEM_ICON: Record<SummaryItem['kind'], Glyph> = {
  land: { style: 'property', name: 'land' },
  building: { style: 'property', name: 'building' },
  condo: { style: 'property', name: 'condo' },
  machine: solid('gear'),
  project: solid('flag'),
  other: solid('shapes'),
};

/** The machines listed before the "show N more machines" toggle. */
const MACHINE_CAP = 5;

/** The report sentence: three lines, then a fade and a toggle that only appears when it overflows. */
function Sentence({ lines }: { lines: string[] }) {
  const { t } = useTranslation('appraisal');
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOver(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Web fonts change where the lines break.
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [lines, open]);
  return (
    <>
      <div ref={ref} className={`cs3d-sent${open ? ' open' : ''}${over ? ' fade' : ''}`}>
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      {(open || over) && (
        <button
          type="button"
          className="cs3d-tog"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {t(
            open
              ? 'activityTracking.brief.collateral.scene3d.hero.less'
              : 'activityTracking.brief.collateral.scene3d.hero.more',
          )}
        </button>
      )}
    </>
  );
}

function Machines({ sections, nf }: { sections: SummaryItem['machines']; nf: Nf }) {
  const { t } = useTranslation('appraisal');
  const [open, setOpen] = useState(false);
  const total = sections.reduce((n, s) => n + s.lines.length, 0);
  let at = 0;
  return (
    <>
      <div className={`cs3d-mach${open ? ' open' : ''}`}>
        {sections.map((sec, n) => {
          const from = at;
          at += sec.lines.length;
          return (
            <div key={`${n}:${sec.head}`} className="cs3d-plain">
              <div className={`cs3d-plain-l${from >= MACHINE_CAP ? ' more' : ''}`}>{sec.head}</div>
              {sec.lines.map((l, i) => (
                <p key={i} className={from + i >= MACHINE_CAP ? 'more' : undefined}>
                  {i + 1}. {l}
                </p>
              ))}
            </div>
          );
        })}
      </div>
      {total > MACHINE_CAP && (
        <button
          type="button"
          className="cs3d-tog"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {open
            ? t('activityTracking.brief.collateral.scene3d.hero.less')
            : t('activityTracking.brief.collateral.scene3d.hero.moreMachines', {
                count: total - MACHINE_CAP,
                n: nf(total - MACHINE_CAP),
              })}
        </button>
      )}
    </>
  );
}

function Item({ item, nf }: { item: SummaryItem; nf: Nf }) {
  return (
    <section className={`cs3d-item k-${item.kind}`}>
      <div className="cs3d-item-h">
        <span className="cs3d-tile">
          <Icon {...ITEM_ICON[item.kind]} className="text-lg" />
        </span>
        <div className="cs3d-item-x">
          <div className="cs3d-item-t">{item.title}</div>
          {item.key && <div className="cs3d-item-k">{item.key}</div>}
        </div>
        {item.figure && (
          <span className="cs3d-fig">
            {item.figure.value}
            {item.figure.unit && <span> {item.figure.unit}</span>}
          </span>
        )}
      </div>
      <div className="cs3d-body">
        {/* Keyed by what it says: another appraisal's text starts collapsed, and is measured afresh. */}
        {item.lines.length > 0 && <Sentence key={item.lines.join('\n')} lines={item.lines} />}
        {item.dev.length > 0 && (
          <div className="cs3d-plain">
            <div className="cs3d-plain-l">{item.devLabel}</div>
            {item.dev.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        )}
        {item.machines.length > 0 && (
          <Machines
            key={item.machines.map(m => `${m.head}\n${m.lines.join('\n')}`).join('\n\n')}
            sections={item.machines}
            nf={nf}
          />
        )}
        {item.kv.length > 0 && (
          <dl className="cs3d-kvs">
            {item.kv.map(row => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value || '-'}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/** The number formatter of the scene's environment, for what the cards count themselves. */
type Nf = (n: number, digits?: number) => string;

interface Props {
  hero: HeroModel;
  nf: Nf;
  items: SummaryItem[];
  cardsRef?: Ref<HTMLDivElement>;
  overviewRef?: Ref<HTMLElement>;
  columnRef?: Ref<HTMLDivElement>;
}

/** A soft fade at the top and bottom of the list, only where it really continues. */
function useFades() {
  const ref = useRef<HTMLDivElement>(null);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--ft', el.scrollTop > 2 ? '20px' : '0px');
    el.style.setProperty(
      '--fb',
      el.scrollTop + el.clientHeight < el.scrollHeight - 2 ? '20px' : '0px',
    );
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // The content changes size when a sentence opens or the items change.
    const mo = new MutationObserver(update);
    mo.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);
  return { ref, update };
}

const CollateralSummary = ({ hero, items, nf, cardsRef, overviewRef, columnRef }: Props) => {
  const { t } = useTranslation('appraisal');
  const k = 'activityTracking.brief.collateral.scene3d.hero.';
  const fades = useFades();
  return (
    <div ref={cardsRef} className="cs3d-cards">
      {hero.tiles.length > 0 && (
        <section ref={overviewRef} className="cs3d-gcard cs3d-ov" aria-label={t(`${k}overview`)}>
          <h3>{t(`${k}overview`)}</h3>
          <div className="cs3d-ov-grid">
            {hero.tiles.map(tile => (
              <div key={tile.icon} className="cs3d-ov-t">
                <span className="cs3d-ov-i">
                  <Icon {...TILE_ICON[tile.icon]} className="text-xl" />
                </span>
                <div className="min-w-0">
                  <div className="cs3d-ov-l">{tile.label}</div>
                  <div className="cs3d-ov-v">{tile.value}</div>
                  {tile.note && <div className="cs3d-ov-w">{tile.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div ref={columnRef} className="cs3d-col">
        {hero.figure && (
          <section className="cs3d-gcard cs3d-hi" aria-label={hero.figure.label}>
            <div className="cs3d-hi-l">{hero.figure.label}</div>
            <div className="cs3d-hi-v">
              {hero.figure.value}
              <span className="cs3d-hi-u"> {hero.figure.unit}</span>
            </div>
            {hero.figure.caption && <div className="cs3d-hi-c">{hero.figure.caption}</div>}
          </section>
        )}
        {hero.bars.length > 0 && (
          <section className="cs3d-gcard cs3d-ins" aria-label={t(`${k}barsLabel`)}>
            {hero.bars.map(b => (
              <div key={b.label}>
                <div className="cs3d-bar-t">
                  <span>{b.label}</span>
                  <b>{nf(b.percent, 2)}%</b>
                </div>
                <div
                  className="cs3d-bar-tr"
                  role="progressbar"
                  aria-label={b.label}
                  aria-valuenow={b.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="cs3d-bar-f" style={{ width: `${b.percent}%` }} />
                </div>
                {b.note && <div className="cs3d-bar-n">{b.note}</div>}
              </div>
            ))}
          </section>
        )}
        <section className="cs3d-gcard cs3d-listcard" aria-label={t(`${k}list`)}>
          <h3>{t(`${k}list`)}</h3>
          <div ref={fades.ref} className="cs3d-sum" onScroll={fades.update}>
            {items.map(item => (
              <Item key={item.id} item={item} nf={nf} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// Its props are stable between hovers (the summary is memoised, the refs are refs), and the scene
// re-renders on every card it shows: the card stack must not render with it.
export default memo(CollateralSummary);
