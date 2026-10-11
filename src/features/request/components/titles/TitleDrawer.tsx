import clsx from 'clsx';
import { useCallback, useEffect, useId, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TitleLookupIntegration } from '@/features/collateralMaster/components/TitleLookupIntegration';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { FormFields } from '@/shared/components/form';
import { scrollToField } from '@/shared/components/form/utils';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { makeTitleInfoFields } from '../../configs/fields';
import DopaAddressForm from '../../forms/DopaAddressForm';
import TitleBuildingForm from '../../forms/TitleBuildingForm';
import TitleDocumentAddressForm from '../../forms/TitleDocumentAddressForm';
import TitleMachineForm from '../../forms/TitleMachineForm';
import TitleVehicleForm from '../../forms/TitleVehicleForm';
import TitleVesselForm from '../../forms/TitleVesselForm';
import type { RequestTitleDtoType } from '../../schemas/form';
import {
  defaultTitleType,
  missingFieldPaths,
  movableIdentity,
  summariseTitleNumber,
  titleFamily,
} from '../../utils/titleList';
import { TitleDocumentsSection } from '../DocumentUploader';
import { TitleDeedBlock } from './TitleDeedBlock';
import { useMissingFieldLabel } from './titleHooks';

const SLIDE_MS = 200;
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-3">
    <h3 className="m-0 border-b border-gray-100 pb-1.5 text-sm font-semibold text-gray-800">
      {title}
    </h3>
    {children}
  </section>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-6 gap-3">{children}</div>
);

/**
 * The fields of the title at `index`, laid out for its type. Keyed by the caller on `index`, so
 * moving to another title mounts a fresh body (the address checkbox, the deed view and the
 * lookup banner all start over for that title).
 */
function TitleDrawerBody({ index, readOnly }: { index: number; readOnly: boolean }) {
  const { t } = useTranslation('request');
  const { getValues, setValue } = useFormContext();
  const collateralType = useWatch({ name: `titles.${index}.collateralType` }) as string | undefined;
  const family = titleFamily(collateralType);

  const typeField = useMemo(
    () =>
      makeTitleInfoFields(t)
        .filter(field => field.name === 'collateralType')
        .map(field => ({ ...field, wrapperClassName: 'col-span-6 md:col-span-3' })),
    [t],
  );

  // Choosing a type here makes a land, land-with-building or condo title a โฉนด unless it already
  // has a type, as adding one from the menu does. Only on a change made here, not on opening.
  const previousType = useRef(collateralType);
  useEffect(() => {
    if (previousType.current === collateralType) return;
    previousType.current = collateralType;
    if (readOnly || !collateralType) return;
    const path = `titles.${index}.titleType`;
    const fallback = defaultTitleType(collateralType);
    if (fallback && !getValues(path)) setValue(path, fallback, { shouldDirty: true });
  }, [collateralType, readOnly, index, getValues, setValue]);

  return (
    <div className="grid gap-6">
      {/* Collateral lookup banner — fires when dedup-key fields fill in */}
      {!readOnly && <TitleLookupIntegration titleIndex={index} />}

      <Grid>
        <FormFields fields={typeField} namePrefix="titles" index={index} />
      </Grid>

      {family === 'none' && (
        <div className="py-8 text-center text-gray-500">
          <Icon style="regular" name="hand-pointer" className="mx-auto mb-2 size-8 text-gray-400" />
          <p className="m-0">{t('titleOptions.noCollateralType')}</p>
        </div>
      )}

      {(family === 'land' || family === 'landBuilding') && (
        <TitleDeedBlock index={index} family={family} />
      )}
      {(family === 'landBuilding' || family === 'building') && (
        <Section title={t('titleSection.drawer.section.building')}>
          <Grid>
            <TitleBuildingForm index={index} variant={family === 'building' ? 3 : 2} />
          </Grid>
        </Section>
      )}
      {family === 'condo' && <TitleDeedBlock index={index} family={family} />}
      {family === 'vehicle' && (
        <Section title={t('titleSection.drawer.section.vehicle')}>
          <Grid>
            <TitleVehicleForm index={index} />
          </Grid>
        </Section>
      )}
      {family === 'machine' && (
        <Section title={t('titleSection.drawer.section.machine')}>
          <Grid>
            <TitleMachineForm index={index} />
          </Grid>
        </Section>
      )}
      {family === 'vessel' && (
        <Section title={t('titleSection.drawer.section.vessel')}>
          <Grid>
            <TitleVesselForm index={index} />
          </Grid>
        </Section>
      )}

      {/* Every type keeps both addresses: the schema requires them for movables too. */}
      {family !== 'none' && (
        <Section title={t('titleSection.drawer.section.address')}>
          <div className="grid gap-4 md:grid-cols-2">
            <TitleDocumentAddressForm index={index} isReadOnly={readOnly} />
            <DopaAddressForm index={index} isReadOnly={readOnly} />
          </div>
        </Section>
      )}
    </div>
  );
}

export interface TitleDrawerProps {
  /** Index into the `titles` array. */
  index: number;
  /** The title's place in its own table and that table's size, for "item i of N". */
  position: number;
  total: number;
  /** Previous / next in the order the table shows; undefined at either end. */
  onPrev?: () => void;
  onNext?: () => void;
  /**
   * ✕, Escape and a click outside: leave without saving. The values live in the form as they are
   * typed, so the caller puts the title back as it was (and drops one added here), like Cancel.
   */
  onClose: () => void;
  /** "Save": close and keep the title, blank or not. */
  onSave: () => void;
  /** The Cancel button: the same as `onClose`. */
  onCancel: () => void;
  onSaveAndAdd: () => void;
  readOnly: boolean;
  /**
   * What the document list needs from the page (the upload session, the saved request). Without it
   * the editor has no documents section.
   */
  documents?: {
    getOrCreateSession: () => Promise<string>;
    requestId?: string;
    showCarryForward?: boolean;
  };
}

/**
 * The wide right-hand editor for one title. Values are live in the page's form, as the old inline
 * editor's were: "Save" just closes, and every other way out (Cancel, ✕, Esc, a click outside) leaves
 * it to the caller to put the title back as it was.
 */
export function TitleDrawer({
  index,
  position,
  total,
  onPrev,
  onNext,
  onClose,
  onSave,
  onCancel,
  onSaveAndAdd,
  readOnly,
  documents,
}: TitleDrawerProps) {
  const { t } = useTranslation(['request', 'common']);
  const labelOf = useMissingFieldLabel();
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const collateralTypes = useParametersByGroup('CollateralType');

  const title = useWatch({ name: `titles.${index}` }) as RequestTitleDtoType | undefined;
  const missing = useMemo(() => (title ? missingFieldPaths(title) : []), [title]);

  const family = titleFamily(title?.collateralType);
  const typeName = title?.collateralType
    ? (collateralTypes.find(p => p.code === title.collateralType)?.description ??
      title.collateralType)
    : t('titleSection.drawer.newTitle');
  const condoNumbers = family === 'condo' ? summariseTitleNumber(title?.titleNumber) : null;
  const number = (
    family === 'vehicle' || family === 'machine' || family === 'vessel'
      ? movableIdentity(title as RequestTitleDtoType)
      : condoNumbers
        ? // A condominium's number is a list of land titles: the first of them and how many more.
          `${condoNumbers.first}${condoNumbers.rest > 0 ? ` +${condoNumbers.rest}` : ''}`
        : title?.titleNumber
  )?.trim();

  // Slides in from the right over a fading scrim. Transform and opacity only, set up once on mount:
  // no state, so it costs the form no render, and Prev / Next (which keep this component mounted)
  // never replay it. Closing is instant: the parent unmounts the drawer, and its close handlers can
  // refuse (a pending upload) or open a confirm, so nothing here waits on them.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const options = { duration: SLIDE_MS, easing: 'ease-out' };
    backdropRef.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], options);
    panelRef.current?.animate?.(
      [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }],
      options,
    );
  }, []);

  // Focus goes into the panel on open and back to where it was on close, so the keyboard user is
  // not left behind the scrim, and Escape works before anything inside has been focused.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  // Escape closes, but never takes a field's own Escape (closing a dropdown) or an open confirm
  // dialog's with it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // An open confirm (daisyUI dialog) or a modal (Headless UI) takes the Escape with it
      if (
        document.querySelector('dialog.modal-open, [role="dialog"][data-headlessui-state~="open"]')
      )
        return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // A click on the scrim closes, but only when the press started there too: selecting text in a
  // field and releasing outside the panel must not count.
  const pressedScrim = useRef(false);
  const onScrimMouseDown = useCallback((event: React.MouseEvent) => {
    pressedScrim.current = event.target === event.currentTarget;
  }, []);
  const onScrimClick = useCallback(
    (event: React.MouseEvent) => {
      if (pressedScrim.current && event.target === event.currentTarget) onClose();
      pressedScrim.current = false;
    },
    [onClose],
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* The scrim is its own layer, so fading it does not fade the panel with it */}
      <div
        ref={backdropRef}
        data-drawer-backdrop
        aria-hidden
        className="absolute inset-0 bg-black/40"
        onMouseDown={onScrimMouseDown}
        onClick={onScrimClick}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-[min(1160px,75vw)] flex-col bg-white shadow-2xl outline-none"
      >
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2
              id={headingId}
              className="m-0 truncate text-base font-semibold"
              title={number || undefined}
            >
              {typeName}
              {number ? ` · ${number}` : ''}
            </h2>
            <p className="m-0 text-sm text-gray-500">
              {t('titleSection.drawer.position', { pos: position, total })}
            </p>
          </div>
          <div
            role="group"
            aria-label={t('titleSection.drawer.nav')}
            className="flex items-center gap-1.5"
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-full!"
              disabled={!onPrev}
              onClick={onPrev}
            >
              <Icon style="solid" name="chevron-left" className="mr-1.5 size-3" />
              {t('titleSection.drawer.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full!"
              disabled={!onNext}
              onClick={onNext}
            >
              {t('titleSection.drawer.next')}
              <Icon style="solid" name="chevron-right" className="ml-1.5 size-3" />
            </Button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:actions.close')}
            title={t('common:actions.close')}
            className="flex size-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon style="regular" name="xmark" className="size-5" />
          </button>
        </header>

        {!readOnly &&
          (missing.length > 0 ? (
            <div
              role="status"
              className="mx-5 mt-3 flex shrink-0 flex-wrap items-baseline gap-x-1.5 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            >
              <b className="text-amber-700">
                {t('titleSection.drawer.missing', { count: missing.length })}
              </b>
              {missing.map((path, i) => (
                <span key={path}>
                  {i > 0 && <span className="mr-1.5 text-amber-700/60">·</span>}
                  <button
                    type="button"
                    onClick={() => scrollToField(`titles.${index}.${path}`)}
                    className="text-amber-700 underline underline-offset-2 hover:no-underline"
                  >
                    {labelOf(path)}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div
              role="status"
              className="mx-5 mt-3 shrink-0 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
            >
              {t('titleSection.drawer.complete')}
            </div>
          ))}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
          <TitleDrawerBody key={index} index={index} readOnly={readOnly} />
          {/* Not keyed by the title: Prev / Next must not unmount it under an upload in flight */}
          {documents && (
            <div className="mt-6">
              <TitleDocumentsSection
                {...documents}
                index={index}
                heading={t('titleSection.drawer.section.documents')}
              />
            </div>
          )}
        </div>

        <footer
          className={clsx(
            'flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-200 px-5 py-3',
            readOnly ? 'justify-end' : 'justify-between',
          )}
        >
          {readOnly ? (
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common:actions.close')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                {t('common:actions.cancel')}
              </Button>
              <span className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onSaveAndAdd}>
                  {t('titleSection.drawer.saveAndAdd')}
                </Button>
                <Button variant="primary" size="sm" onClick={onSave}>
                  {t('common:actions.save')}
                </Button>
              </span>
            </>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
