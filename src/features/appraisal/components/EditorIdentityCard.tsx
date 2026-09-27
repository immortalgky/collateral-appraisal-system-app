import type { ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { SKYLINE, type SkylineKind } from '@shared/components/dinoLoader/dinoSprites';
import { CITY_LANDMARKS } from '@shared/components/dinoLoader/dinoGame';
import type { PhotoSectionView } from './PropertyPhotoSection';

/** One entry in the bar under an editor's header. */
export interface EditorTab {
  id: string;
  label: string;
  /** A quiet number beside the label, e.g. how many survey factors the template has. */
  count?: number;
  /** Fields in this part that failed validation, so an error out of sight still shows. */
  errorCount?: number;
}

/** Thumbnails shown before the rest fold into "+N". */
const MAX_THUMBS = 6;

interface EditorIdentityCardProps {
  /** Absent where there are no photos to show, e.g. outside an appraisal. */
  view?: PhotoSectionView;
  /** The line above the name: type chip, number, position. */
  top: ReactNode;
  title: ReactNode;
  /** Grey italic, for a name that is not there yet ("new", "untitled"). */
  titleMuted?: boolean;
  /** The facts under the name. */
  children?: ReactNode;
  /** A narrow column on the right, e.g. a comparable's price. */
  aside?: ReactNode;
}

/**
 * The card at the top of an editor, one short band: the cover photo as a framed tile on the left
 * (an "add first photo" tile before there is one), then type, name and key facts on white, the other
 * thumbnails and an optional aside on the right. The photo is an object, never a faded backdrop. Shared by the property and market comparable forms so the two read as one family.
 * Mock: header-options.html (A).
 */
export const EditorIdentityCard = ({
  view,
  top,
  title,
  titleMuted = false,
  children,
  aside,
}: EditorIdentityCardProps) => {
  const { t } = useTranslation('appraisal');
  const photos = view?.photos ?? [];
  const canAdd = !!view && !view.readOnly;
  // The chosen cover, or the first photo when none is set, fills the tile; the rest line up on the right.
  const cover = photos.find(p => p.id === view?.thumbnailId) ?? photos[0];
  const rest = photos.filter(p => p !== cover);
  const hidden = rest.length - (MAX_THUMBS - 1);
  const showTile = !!view && (!!cover || canAdd);

  const tile = showTile && (
    <button
      type="button"
      onClick={cover ? () => view.onPreview(cover) : view.onAdd}
      title={cover ? cover.fileName : undefined}
      aria-label={cover ? cover.fileName : t('editorHeader.addFirstPhoto')}
      className={clsx(
        'relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg',
        cover
          ? 'bg-gray-100 ring-1 ring-gray-200'
          : 'flex-col gap-1 border border-dashed border-gray-300 bg-gray-50 text-[0.6875rem] text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-700',
      )}
    >
      {!cover ? (
        <>
          <Icon name="plus" style="solid" className="size-3" />
          {t('editorHeader.addFirstPhoto')}
        </>
      ) : cover.isUploading ? (
        <Icon name="spinner" style="solid" className="size-4 animate-spin text-gray-400" />
      ) : (
        <img src={cover.url} alt={cover.fileName} className="size-full object-cover" />
      )}
      {cover && photos.length > 1 && (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[0.625rem] font-semibold leading-4 text-white tabular-nums">
          {photos.length}
        </span>
      )}
    </button>
  );

  // Only once there is a cover: before that the tile itself is the add button.
  const thumbs = view && cover && (rest.length > 0 || canAdd) && (
    <div className="flex shrink-0 items-center gap-1">
      {rest.slice(0, MAX_THUMBS - 1).map((photo, i) => {
        const folds = hidden > 0 && i === MAX_THUMBS - 2;
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => view.onPreview(photo)}
            title={photo.fileName}
            className="relative flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200"
          >
            {photo.isUploading ? (
              <Icon name="spinner" style="solid" className="size-3 animate-spin text-gray-400" />
            ) : (
              <img src={photo.url} alt={photo.fileName} className="size-full object-cover" />
            )}
            {folds && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[11px] font-semibold text-white">
                +{hidden + 1}
              </span>
            )}
          </button>
        );
      })}
      {canAdd && (
        <button
          type="button"
          onClick={view.onAdd}
          title={t('editorHeader.addPhoto')}
          aria-label={t('editorHeader.addPhoto')}
          className="inline-flex size-8 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-700"
        >
          <Icon name="plus" style="solid" className="size-3" />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={clsx(
        // `isolate` keeps the skyline's -z-10 inside the card. A hairline border plus a firmer
        // shadow: the shadow alone left the card's edge lost against the page.
        '@container relative isolate flex items-center gap-3.5 overflow-hidden rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_8px_24px_rgba(15,23,42,0.10)]',
      )}
    >
      {!showTile && <PixelSkyline />}
      {tile}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">{top}</div>
        <h2
          className={clsx(
            'text-base font-semibold leading-snug',
            titleMuted ? 'italic text-gray-400' : 'text-gray-900',
          )}
        >
          {title}
        </h2>
        {children}
      </div>
      {thumbs}
      {aside && (
        <div className="flex min-w-[8.5rem] flex-col items-end border-l border-gray-100 pl-4 text-right">
          {aside}
        </div>
      )}
    </div>
  );
};

/** Buildings from the dino loader's Bangkok skyline, left to right, as they stand in the corner. */
const SCENE: SkylineKind[] = [
  'SKY_HOUSE',
  'SKY_TOWER_A',
  'SKY_MAHANAKHON',
  'SKY_SHOPHOUSE',
  'SKY_BAIYOKE',
  'SKY_YAK',
  'SKY_TOWER_C',
  'SKY_TOWER_D',
];
const SCENE_GAP = 2;

/**
 * Every sprite's '#' cells as one SVG path per tone, bottom-aligned, built once. Landmarks take the
 * stronger tone, the rest the lighter one — the same split the loader's renderer makes.
 */
const scene = (() => {
  const height = Math.max(...SCENE.map(kind => SKYLINE[kind].length));
  const paths = { landmark: '', other: '' };
  let x = 0;
  for (const kind of SCENE) {
    const rows = SKYLINE[kind];
    const top = height - rows.length;
    let d = '';
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') d += `M${x + i} ${top + y}h1v1h-1z`;
    });
    paths[CITY_LANDMARKS.has(kind) ? 'landmark' : 'other'] += d;
    x += rows[0].length + SCENE_GAP;
  }
  return { width: x - SCENE_GAP, height, ...paths };
})();

const PixelSkyline = () => (
  <svg
    viewBox={`0 0 ${scene.width} ${scene.height}`}
    shapeRendering="crispEdges"
    aria-hidden="true"
    className="pointer-events-none absolute bottom-0 right-4 -z-10 h-[70%] max-h-28 w-auto opacity-70"
  >
    <path d={scene.other} fill="#D7ECE8" />
    <path d={scene.landmark} fill="#A8D8CF" />
  </svg>
);

interface EditorTabBarProps {
  barRef?: Ref<HTMLDivElement>;
  tabs: EditorTab[];
  activeId?: string;
  /** Names the bar for screen readers. */
  label: string;
  onSelect: (id: string) => void;
  /** `tabs` swaps what is shown; `sections` jumps to a part of one long page. */
  mode?: 'tabs' | 'sections';
}

/**
 * The underline bar pinned under an editor's header. The header renders it as a direct child of
 * the form's scroll container — a sticky element only sticks inside its parent.
 */
export const EditorTabBar = ({
  barRef,
  tabs,
  activeId,
  label,
  onSelect,
  mode = 'tabs',
}: EditorTabBarProps) => {
  const isTabs = mode === 'tabs';
  const List = isTabs ? 'div' : 'nav';
  return (
    <div ref={barRef} className="sticky top-0 z-10 bg-white px-3 pt-3">
      <List
        role={isTabs ? 'tablist' : undefined}
        aria-label={label}
        // The baseline is an inset shadow, not a border the tabs overlap with -mb-px: the bar scrolls
        // sideways, and that overflow clipped the overlapping pixel, halving the active underline.
        className="flex h-[34px] items-stretch gap-1 overflow-x-auto px-1 shadow-[inset_0_-1px_0_var(--color-gray-200)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeId;
          const state = isTabs
            ? { role: 'tab', 'aria-selected': isActive }
            : { 'aria-current': isActive ? ('location' as const) : undefined };
          return (
            <button
              key={tab.id}
              type="button"
              {...state}
              onClick={() => onSelect(tab.id)}
              className={clsx(
                // Same tab as the pricing screen's method tabs (MethodTabs.tsx).
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[12.5px] font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              {!!tab.count && <span className="tabular-nums text-gray-400">{tab.count}</span>}
              {!!tab.errorCount && (
                <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white">
                  {tab.errorCount}
                </span>
              )}
            </button>
          );
        })}
      </List>
    </div>
  );
};
