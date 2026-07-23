/**
 * Live session focus card: promotes the next pending decision item so the secretary can act
 * on it without hunting through the tables mid-meeting.
 *
 * Only rendered when the caller has already established that the user may decide (secretary
 * permission + an item-action-eligible status) — the same gate the row actions use.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import type { AppraisalType, MeetingItemDto } from '../../api/types';
import { useMeetingFormat } from '../../utils/useMeetingFormat';
import ReleaseItemDialog from '../ReleaseItemDialog';
import RouteBackItemDialog from '../RouteBackItemDialog';

interface NowDecidingPanelProps {
  meetingId: string;
  item: MeetingItemDto | null;
  remaining: number;
  /** False when the viewer may watch but not decide — the panel then shows context only. */
  canDecide: boolean;
}

const KNOWN_TYPES = new Set<string>(['New', 'ReAppraisal', 'Progressive', 'PreAppraisal']);

const NowDecidingPanel = ({ meetingId, item, remaining, canDecide }: NowDecidingPanelProps) => {
  const { t } = useTranslation('meeting');
  const { formatMoney } = useMeetingFormat();
  const releaseDialog = useDisclosure();
  const routeBackDialog = useDisclosure();

  if (!item) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <Icon name="circle-check" style="solid" className="size-5 shrink-0 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-700">{t('session.allReleased')}</p>
      </section>
    );
  }

  const label = item.appraisalNumber ?? item.appraisalId.slice(0, 8);
  const typeLabel =
    item.appraisalType && KNOWN_TYPES.has(item.appraisalType)
      ? t(`decisionGroups.${item.appraisalType}` as `decisionGroups.${AppraisalType}`)
      : t('decisionGroups.other');

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t('session.nowDeciding')}
            </h3>
            <span className="text-xs text-amber-600/80">
              {t(remaining === 1 ? 'session.remaining' : 'session.remainingPlural', {
                n: remaining,
              })}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              to={`/appraisals/${item.appraisalId}/summary`}
              className="text-lg font-semibold text-blue-700 hover:underline"
            >
              {label}
            </Link>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
              {typeLabel}
            </span>
          </div>

          <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs text-gray-500">{t('columns.customerName')}</dt>
              <dd className="font-medium text-gray-800">{item.customerName}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs text-gray-500">{t('columns.appraisalStaff')}</dt>
              <dd className="font-medium text-gray-800">{item.appraisalStaff}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs text-gray-500">{t('columns.appraisalValue')}</dt>
              <dd className="font-semibold tabular-nums text-gray-900">
                {formatMoney(item.appraisedValue)}
              </dd>
            </div>
          </dl>
        </div>

        {canDecide && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" type="button" onClick={releaseDialog.onOpen}>
              <Icon name="circle-arrow-right" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.release')}
            </Button>
            <Button variant="danger" size="sm" type="button" onClick={routeBackDialog.onOpen}>
              <Icon name="arrow-rotate-left" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.routeBack')}
            </Button>
          </div>
        )}
      </div>

      {canDecide && (
        <>
          <ReleaseItemDialog
            isOpen={releaseDialog.isOpen}
            onClose={releaseDialog.onClose}
            meetingId={meetingId}
            appraisalId={item.appraisalId}
            appraisalNo={item.appraisalNumber}
          />
          <RouteBackItemDialog
            isOpen={routeBackDialog.isOpen}
            onClose={routeBackDialog.onClose}
            meetingId={meetingId}
            appraisalId={item.appraisalId}
            appraisalNo={item.appraisalNumber}
          />
        </>
      )}
    </section>
  );
};

export default NowDecidingPanel;
