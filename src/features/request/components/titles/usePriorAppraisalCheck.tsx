import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  inProgressByCollateralOptions,
  lookupCollateralMasterOptions,
} from '@/features/collateralMaster/api/hooks';
import type {
  CollateralLookupResult,
  InProgressAppraisalDto,
} from '@/features/collateralMaster/api/types';
import { buildLookupParams } from '@/features/collateralMaster/utils/buildLookupParams';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { RequestTitleDtoType } from '../../schemas/form';
import { titleFamily } from '../../utils/titleList';

/** Saving never waits longer than this for the lookup: a slow master must not hold the user up. */
const LOOKUP_TIMEOUT_MS = 3000;

/** A land or condominium title is a deed; anything else (machinery) is just a property. */
const DEED_FAMILIES = new Set(['land', 'landBuilding', 'condo']);

/**
 * One appraisal's number, date and value, from ONE source row: the type's detail carries them
 * together; the last engagement stands in, as a whole, only for a detail that lacks them.
 */
export function priorAppraisalOf(data: CollateralLookupResult) {
  const detail = data.landDetail ?? data.condoDetail ?? data.machineDetail ?? data.leaseholdDetail;
  const engagement = data.lastEngagement;
  if (detail?.lastAppraisalId && detail.lastAppraisalNumber)
    return {
      id: detail.lastAppraisalId,
      number: detail.lastAppraisalNumber,
      date: detail.lastAppraisedDate,
      value: (data.landDetail ?? data.condoDetail)?.appraisalValue ?? data.lastAppraisedValue,
    };
  if (engagement)
    return {
      id: engagement.appraisalId,
      number: engagement.appraisalNumber,
      date: engagement.appraisalDate,
      value: data.lastAppraisedValue,
    };
  return null;
}

/** The lookup key of a title as typed on the form; null while any part of it is missing. */
export function lookupParamsOf(title: RequestTitleDtoType) {
  return buildLookupParams(title.collateralType, {
    titleNumber: title.titleNumber,
    province: title.titleAddress?.province ?? '',
    district: title.titleAddress?.district ?? '',
    subDistrict: title.titleAddress?.subDistrict ?? '',
    condoRegistrationNumber: title.condoRegistrationNumber,
    buildingNumber: title.buildingNumber,
    floorNumber: title.floorNumber,
    roomNumber: title.roomNumber,
    registrationNo: title.registrationStatus ? title.registrationNumber : '',
  });
}

/** A lookup that answers nothing within the cap (or fails) answers `null`: fail open. */
const capped = <T,>(request: Promise<T>) =>
  new Promise<T | null>(resolve => {
    const timer = setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS);
    request.then(resolve, () => resolve(null)).finally(() => clearTimeout(timer));
  });

/**
 * Before a title is saved from the drawer: if the collateral master already knows this property,
 * or another appraisal is working on it right now, say so and let the user go back or save anyway.
 *
 * `guard(action)` runs `action` straight away unless a match is found. It fails open: an
 * incomplete key, a miss, an error or a slow answer all save as if nothing had been checked (each
 * of the two lookups on its own).
 * Nothing is asked of a request that is submitted or read-only: its own appraisal is on record and
 * would match. Where the prior is locked (an Initiate draft) only the in-progress check runs: there
 * is no prior to suggest.
 *
 * A property is acknowledged only by "Continue saving", and then never asked about again for the
 * page's session. It is remembered by what identifies it (the lookup key), not by its row, so
 * reordering or deleting rows, closing and reopening the drawer, or a duplicate row all keep it.
 * `acknowledged` is owned by the page so it outlives the drawer; without one the hook keeps its own.
 */
export function usePriorAppraisalCheck(
  index: number,
  title: RequestTitleDtoType | undefined,
  readOnly: boolean,
  acknowledged?: Set<string>,
) {
  const { t } = useTranslation('request');
  const queryClient = useQueryClient();
  const submitted = !!useWatch({ name: 'meta.isSubmitted' });
  const priorLocked = !!useWatch({ name: 'meta.priorLocked' });
  const prevAppraisalId: string | undefined = useWatch({ name: 'detail.prevAppraisalId' });
  // The prior the request already follows is no news: it is not asked about again
  const newPriorOf = (data: CollateralLookupResult | null) => {
    const found = data && priorAppraisalOf(data);
    return found && found.id !== prevAppraisalId ? found : null;
  };
  const ownAcknowledged = useRef(new Set<string>());
  const known = acknowledged ?? ownAcknowledged.current;
  const [checking, setChecking] = useState(false);
  // Read by an answer that comes back late, after `checking` as this render saw it has gone stale
  const busy = useRef(false);
  const [match, setMatch] = useState<{
    data: CollateralLookupResult | null;
    inFlight: InProgressAppraisalDto[];
    key: string;
    action: () => void;
  } | null>(null);

  const params = title && !readOnly && !submitted ? lookupParamsOf(title) : null;
  const key = JSON.stringify(params);

  const guard = async (action: () => void): Promise<void> => {
    if (busy.current) return;
    if (!params || known.has(key)) {
      action();
      return;
    }

    busy.current = true;
    setChecking(true);
    let data: CollateralLookupResult | null = null;
    let inFlight: InProgressAppraisalDto[] = [];
    try {
      [data, inFlight] = await Promise.all([
        priorLocked ? null : capped(queryClient.fetchQuery(lookupCollateralMasterOptions(params))),
        capped(queryClient.fetchQuery(inProgressByCollateralOptions(params))).then(r => r ?? []),
      ]);
    } finally {
      busy.current = false;
      setChecking(false);
    }

    // The drawer is on another title now: that save is no longer the one being asked about, so it
    // neither goes through nor asks. The same title with another key (its number or place was
    // edited while we waited) is still being saved: ask again about what it is now.
    const now = latest.current;
    if (now.index !== index) return;
    if (now.key !== key) return now.guard(action);

    if (newPriorOf(data) || inFlight.length > 0) {
      setMatch({ data, inFlight, key, action });
    } else {
      action();
    }
  };

  // This render's view of the drawer, for an answer that comes back after the title has moved on
  const latest = useRef({ index, key, guard });
  useEffect(() => {
    latest.current = { index, key, guard };
  });

  const prior = newPriorOf(match?.data ?? null);
  const inFlight = match?.inFlight ?? [];
  const deed = DEED_FAMILIES.has(titleFamily(title?.collateralType));
  const dialog: ReactNode = (
    <ConfirmDialog
      isOpen={!!match && (!!prior || inFlight.length > 0)}
      onClose={() => setMatch(null)}
      onConfirm={() => {
        if (!match) return;
        known.add(match.key);
        setMatch(null);
        match.action();
      }}
      title={t(
        inFlight.length > 0
          ? deed
            ? 'titleSection.priorCheck.titleInProgress'
            : 'titleSection.priorCheck.titleInProgressGeneric'
          : deed
            ? 'titleSection.priorCheck.title'
            : 'titleSection.priorCheck.titleGeneric',
      )}
      confirmText={t('titleSection.priorCheck.continue')}
      cancelText={t('titleSection.priorCheck.back')}
      variant="warning"
    >
      {match && title && (
        <div className="grid gap-2 text-sm">
          <p className="m-0 text-gray-600">
            {t(
              prior
                ? 'titleSection.priorCheck.message'
                : 'titleSection.priorCheck.inProgressMessage',
            )}
          </p>
          <p className="m-0 font-medium text-gray-900">{identityOf(title, t)}</p>
          {inFlight.length > 0 && (
            <div className="grid gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
              <p className="m-0 font-semibold text-red-700">
                {t('titleSection.priorCheck.inProgressHeading')}
              </p>
              {inFlight.map(a => (
                <p key={a.appraisalId} className="m-0 text-gray-700">
                  {t('titleSection.priorCheck.report')}{' '}
                  <span className="font-medium">
                    {a.appraisalNumber ?? t('requestForm.priorSummary.noReportNumber')}
                  </span>
                  {' · '}
                  {t('titleSection.priorCheck.status')}{' '}
                  {/* A status without a translation shows as the backend sent it */}
                  {t(`requestForm.priorSummary.status.${a.status}`, { defaultValue: a.status })}
                </p>
              ))}
            </div>
          )}
          {prior && match.data && (
            <div className="grid gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              {inFlight.length > 0 && (
                <p className="m-0 font-semibold text-amber-700">
                  {t('titleSection.priorCheck.priorHeading')}
                </p>
              )}
              <p className="m-0 text-gray-700">
                {t('titleSection.priorCheck.report')}{' '}
                <span className="font-medium">{prior.number}</span>
              </p>
              {prior.date && (
                <p className="m-0 text-gray-700">
                  {t('titleSection.priorCheck.date')} {formatDate(prior.date, 'dd/MM/yyyy')}
                </p>
              )}
              {/* No value to show for a missing or zero one; whole baht as the prior block writes it */}
              {!!prior.value && (
                <p className="m-0 text-gray-700">
                  {t('titleSection.priorCheck.value')}{' '}
                  {formatNumber(prior.value, Number.isInteger(prior.value) ? 0 : 2)}
                </p>
              )}
              <p className="m-0 text-gray-700">
                {t('titleSection.priorCheck.count', { n: match.data.engagementCount })}
              </p>
            </div>
          )}
        </div>
      )}
    </ConfirmDialog>
  );

  return { guard, checking, dialog };
}

/** What the user typed for this title, so the warning names the property it is about. */
export function identityOf(title: RequestTitleDtoType, t: TFunction<'request'>) {
  const family = titleFamily(title.collateralType);
  if (family === 'condo')
    return [
      title.condoRegistrationNumber,
      title.buildingNumber && t('titleSection.cell.building', { n: title.buildingNumber }),
      title.floorNumber && t('titleSection.cell.floor', { n: title.floorNumber }),
      title.roomNumber && t('titleSection.cell.condoUnit', { room: title.roomNumber }),
    ]
      .filter(Boolean)
      .join(' · ');
  if (family === 'machine') return title.registrationNumber;
  const place = [
    title.titleAddress?.subDistrictName,
    title.titleAddress?.districtName,
    title.titleAddress?.provinceName,
  ]
    .filter(Boolean)
    .join(' ');
  return [title.titleNumber, place].filter(Boolean).join(' · ');
}
