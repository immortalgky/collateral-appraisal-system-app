import { Suspense, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TitleDeedSheet } from '@/features/appraisal/components/TitleDeedSheet';
import { TitleFormView } from '@/features/appraisal/components/TitleFormView';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { makeTitleCondoFields, makeTitleLandFields } from '../../configs/fields';
import TitleCondoForm from '../../forms/TitleCondoForm';
import TitleLandForm from '../../forms/TitleLandForm';
import { isLandFamily, type TitleFamily } from '../../utils/titleList';
import { DeedTypePills } from './DeedTypePills';
import { TitleNumbersSummary } from './TitleNumbersField';

type TitleView = 'deed' | 'form';

const VIEW_KEY = 'cas.requestTitleView';
/** Title types with a paper to draw; ตราจอง and others are keyed in the form view only. */
const PAPER_TITLE_TYPES = new Set(['DEED', 'NS3K', 'NS3', 'NS3KO']);

/** The view the user picked last time, per browser. Storage can be unavailable; fall back quietly. */
const readView = (): TitleView => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'form' ? 'form' : 'deed';
  } catch {
    return 'deed';
  }
};

/** The request page names the area parts after the DTO, not the land page's `rai` / `ngan` / `squareWa`. */
const AREA_NAMES = { rai: 'areaRai', ngan: 'areaNgan', squareWa: 'areaSquareWa' };

const OWNER_AND_NOTES = ['ownerName', 'notes'] as const;
/** On the paper the holder is written on the paper itself, so only the notes remain below. */
const NOTES_ONLY = ['notes'] as const;

const Heading = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-1.5">
    <h3 className="m-0 text-sm font-semibold text-gray-800">{children}</h3>
    {aside && <div className="ml-auto">{aside}</div>}
  </div>
);

/** A condominium's title is a โฉนด / อ.ช.2: that is the one deed type it is offered. */
const CONDO_DEED_TYPES = ['DEED'] as const;
/** The condominium's own fields, as they are shown beside its paper. */
const CONDO_FORM_EXCLUDE = ['titleType'] as const;
/** Under the condominium's paper, one block each: its land title numbers (the box), then the notes. */
const CONDO_NUMBERS = ['titleNumber'] as const;
const CONDO_NOTES = ['notes'] as const;

/**
 * The deed of a land, land-with-building or condominium title: the type pills, then either the
 * deed drawn as the paper (the default where there is one: the four land deed types, and always
 * the condominium's; the choice is remembered per browser) or the plain fields; then the holder
 * and the notes. Both views edit the same form fields.
 */
export function TitleDeedBlock({ index, family }: { index: number; family: TitleFamily }) {
  const { t } = useTranslation('request');
  const condo = family === 'condo';
  const landFields = useMemo(
    () => (condo ? makeTitleCondoFields(t) : makeTitleLandFields(t)),
    [t, condo],
  );
  const titleField = landFields.find(field => field.name === 'titleType');
  const holderField = landFields.find(field => field.name === 'ownerName');

  const titleType = useWatch({ name: `titles.${index}.titleType` }) as string | undefined;
  const address = useWatch({ name: `titles.${index}.titleAddress` }) as
    | {
        subDistrictName?: string | null;
        districtName?: string | null;
        provinceName?: string | null;
      }
    | undefined;

  const [view, setView] = useState<TitleView>(readView);
  const chooseView = (next: TitleView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just won't be remembered.
    }
  };

  const canPaper = condo || (isLandFamily(family) && PAPER_TITLE_TYPES.has(titleType ?? ''));
  // The saved preference stays as it was, so switching back to a โฉนด brings the paper back.
  const shown: TitleView = canPaper ? view : 'form';

  return (
    <>
      <section className="grid gap-3">
        <Heading
          aside={
            <SegmentedControl
              label={t('titleSection.drawer.view')}
              value={shown}
              onChange={chooseView}
              options={[
                {
                  value: 'deed',
                  label: t('titleSection.drawer.viewDocument'),
                  icon: 'file-lines',
                  disabled: !canPaper,
                },
                { value: 'form', label: t('titleSection.drawer.viewForm'), icon: 'list-check' },
              ]}
            />
          }
        >
          {t('titleSection.drawer.section.deed')}
        </Heading>
        <DeedTypePills
          index={index}
          field={titleField}
          dependents={condo ? undefined : landFields}
          codes={condo ? CONDO_DEED_TYPES : undefined}
        />
        {shown === 'deed' ? (
          <>
            {/* The paper's wording is in the appraisal namespace, which loads on first use. */}
            <Suspense fallback={<div className="h-[48rem] animate-pulse rounded bg-gray-100" />}>
              <div className="grid justify-items-center">
                <TitleDeedSheet
                  fields={landFields}
                  scope={{ name: 'titles', index }}
                  areaNames={AREA_NAMES}
                  holderField={holderField}
                  variant={condo ? 'condo' : undefined}
                  landTitleNumbers={condo ? <TitleNumbersSummary index={index} /> : undefined}
                  address={{
                    subDistrict: address?.subDistrictName,
                    district: address?.districtName,
                    province: address?.provinceName,
                  }}
                />
              </div>
            </Suspense>
            <p className="m-0 text-center text-xs text-gray-500">
              {t('titleSection.drawer.paperNote')}
            </p>
          </>
        ) : (
          <div className="grid grid-cols-6 gap-3">
            {condo ? (
              <TitleCondoForm index={index} exclude={CONDO_FORM_EXCLUDE} />
            ) : (
              // The land page's own form view (document / position / area groups, the total under
              // the area), reading this title's row; its wording is in the appraisal namespace.
              <Suspense
                fallback={<div className="col-span-6 h-64 animate-pulse rounded bg-gray-100" />}
              >
                <div className="col-span-6">
                  <TitleFormView
                    fields={landFields}
                    scope={{ name: 'titles', index }}
                    areaNames={AREA_NAMES}
                    className=""
                    showGroupTitles={false}
                  />
                </div>
              </Suspense>
            )}
          </div>
        )}
      </section>
      {/* A condominium's form view holds every field above. Under its paper the land titles come
          first, then the title detail, each a block of its own; the land's goes on to the holder. */}
      {condo && shown === 'deed' && (
        <section className="grid gap-3">
          <div className="grid grid-cols-6 gap-3">
            <TitleCondoForm index={index} include={CONDO_NUMBERS} />
          </div>
        </section>
      )}
      {(shown === 'deed' || !condo) && (
        <section className="grid gap-3">
          <div className="grid grid-cols-6 gap-3">
            {condo ? (
              <TitleCondoForm index={index} include={CONDO_NOTES} />
            ) : (
              <TitleLandForm
                index={index}
                include={shown === 'deed' ? NOTES_ONLY : OWNER_AND_NOTES}
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}
