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

/** Thumbnails shown beside the cover before the rest fold into "+N". */
const MAX_THUMBS = 6;

const COVER_BOX = 'relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg @2xl:w-44';

interface EditorIdentityCardProps {
  /** Absent where there are no photos to show, e.g. outside an appraisal. */
  view?: PhotoSectionView;
  /** Tag the first photo as the cover, for things that have no cover setting of their own. */
  firstIsCover?: boolean;
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
 * The card at the top of an editor: the cover on the left; type, name, key facts and the photo
 * row beside it. Shared by the property and market comparable forms so the two read as one family.
 */
export const EditorIdentityCard = ({
  view,
  firstIsCover = false,
  top,
  title,
  titleMuted = false,
  children,
  aside,
}: EditorIdentityCardProps) => {
  const { t } = useTranslation('appraisal');
  const photos = view?.photos ?? [];
  const cover = photos[0];
  const canAdd = !!view && !view.readOnly;
  const hidden = photos.length - MAX_THUMBS;
  const isCover = (id: string, index: number) =>
    id === view?.thumbnailId || (firstIsCover && index === 0);

  let coverSlot: ReactNode;
  if (cover) {
    coverSlot = (
      <button
        type="button"
        onClick={() => view?.onPreview(cover)}
        className={clsx(
          COVER_BOX,
          'flex items-center justify-center bg-gray-100 shadow-[0_6px_18px_rgba(13,148,136,0.16)] ring-3 ring-white',
        )}
      >
        {cover.isUploading ? (
          <Icon name="spinner" style="solid" className="size-5 animate-spin text-gray-400" />
        ) : (
          <img src={cover.url} alt={cover.fileName} className="size-full object-cover" />
        )}
        {isCover(cover.id, 0) && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gray-900/70 px-2 py-px text-[10.5px] font-semibold text-white">
            {t('editorHeader.cover')}
          </span>
        )}
      </button>
    );
  } else if (canAdd) {
    coverSlot = (
      <button
        type="button"
        onClick={view.onAdd}
        className={clsx(
          COVER_BOX,
          'flex flex-col items-center justify-center gap-0.5 border-[1.5px] border-dashed border-gray-300 bg-white/60 px-2 text-center transition-colors hover:border-primary-300 hover:bg-primary-50',
        )}
      >
        <span className="text-xs font-semibold text-primary-700">
          + {t('editorHeader.addFirstPhoto')}
        </span>
        <span className="text-[11px] leading-tight text-gray-400">
          {t('editorHeader.firstIsCover')}
        </span>
      </button>
    );
  } else {
    coverSlot = (
      <div
        className={clsx(COVER_BOX, 'flex flex-col items-center justify-center gap-1 bg-white/60')}
      >
        <Icon name="images" style="solid" className="size-5 text-gray-300" />
        <span className="text-[11px] text-gray-400">{t('editorHeader.noPhotos')}</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        // White, with the loader's pixel skyline in the bottom-right corner behind the content;
        // `isolate` keeps its -z-10 inside the card. A soft shadow lifts it off the page in place of
        // a border.
        '@container relative isolate grid gap-4 overflow-hidden rounded-xl bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_20px_rgba(13,148,136,0.08)]',
        aside ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)]',
      )}
    >
      <PixelSkyline />
      {coverSlot}
      <div className="flex min-w-0 flex-col gap-1">
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
        {view && (photos.length > 0 || canAdd) && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            {photos.slice(0, MAX_THUMBS).map((photo, i) => {
              const folds = hidden > 0 && i === MAX_THUMBS - 1;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => view.onPreview(photo)}
                  title={photo.fileName}
                  className={clsx(
                    'relative flex h-[42px] w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100',
                    isCover(photo.id, i) && !folds && 'ring-2 ring-amber-400 ring-offset-1',
                  )}
                >
                  {photo.isUploading ? (
                    <Icon
                      name="spinner"
                      style="solid"
                      className="size-3.5 animate-spin text-gray-400"
                    />
                  ) : (
                    <img src={photo.url} alt={photo.fileName} className="size-full object-cover" />
                  )}
                  {folds && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
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
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Icon name="plus" style="solid" className="size-3" />
                {t('editorHeader.addPhoto')}
              </button>
            )}
            {photos.length > 0 && (
              <button
                type="button"
                onClick={() => view.onPreview(photos[0])}
                className="px-1.5 py-1 text-xs text-gray-500 transition-colors hover:text-gray-800"
              >
                {t('editorHeader.viewAll', { n: photos.length })}
              </button>
            )}
          </div>
        )}
      </div>
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
    <div ref={barRef} className="sticky top-0 z-10 bg-white px-6 pt-3">
      <List
        role={isTabs ? 'tablist' : undefined}
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary text-gray-900'
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
