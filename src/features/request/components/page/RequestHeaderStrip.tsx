import clsx from 'clsx';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { getInitials } from '@/shared/utils/stringUtils';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import type { RequestorDtoType } from '../../schemas/form';
import SearchUserModal from '../SearchUserModal';

interface RequestHeaderStripProps {
  /** undefined while creating a new request */
  requestNumber?: string | null;
  status?: string;
  /** When the request was submitted, if it was */
  requestedAt?: string | null;
  /** Read-only page or an already submitted request: the requestor can no longer be changed */
  locked: boolean;
  commentCount: number;
  onOpenComments: () => void;
}

/** A name that is only dashes or blanks ("- -", what an account without a name comes through as) is no name. Same rule as SearchUserModal. */
const realName = (name?: string | null) => (name && /[^\s\-–—]/.test(name) ? name.trim() : '');

const chipClass =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs';

/**
 * Top strip of the request page: number, status, purpose / urgent / prior-appraisal chips, the
 * requestor (with a link to change it), who created it and when it was submitted, and the button
 * that opens the comments drawer.
 */
const RequestHeaderStrip = ({
  requestNumber,
  status,
  requestedAt,
  locked,
  commentCount,
  onOpenComments,
}: RequestHeaderStripProps) => {
  const { t, i18n } = useTranslation('request');
  const { control, setValue } = useFormContext();
  const currentUser = useAuthStore(state => state.user);
  const userModal = useDisclosure();

  const purpose = useWatch({ control, name: 'purpose' }) as string | undefined;
  const priority = useWatch({ control, name: 'priority' }) as string | undefined;
  const priorNumber = useWatch({ control, name: 'detail.prevAppraisalReportNo' }) as
    | string
    | null
    | undefined;
  const creator = useWatch({ control, name: 'creator' }) as { username?: string } | undefined;
  const requestor = useWatch({ control, name: 'requestor' }) as RequestorDtoType | undefined;
  const { errors } = useFormState({ control, name: 'requestor' });
  // The description alone; the code only when the description cannot be resolved (never an empty chip)
  const purposeLabel = useParameterDescription('AppraisalPurpose', purpose) || purpose;

  const hasRequestor = !!requestor?.employeeId;
  // The name, or the employee code when there is none (then the code is not repeated beside it)
  const requestorName = realName(requestor?.name);
  const requestorShown = requestorName || requestor?.employeeId || '';
  const isMe = hasRequestor && requestor?.employeeId === currentUser?.username;
  const creatorName = creator?.username || currentUser?.name;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gray-100 bg-white px-5 py-2.5 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 shadow-sm">
          <Icon style="solid" name="clipboard-list" className="size-4! text-blue-500" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {requestNumber ? (
            <span className="text-base font-semibold text-gray-800">{requestNumber}</span>
          ) : (
            <span className="text-sm text-gray-400">{t('page.header.noNumber')}</span>
          )}
          {status ? (
            <Badge type="status" value={status}>
              {t(`page.header.status.${status.toLowerCase()}`, { defaultValue: status })}
            </Badge>
          ) : (
            <Badge tone="gray">{t('page.header.unsaved')}</Badge>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {purpose && (
          <span className={clsx(chipClass, 'border-gray-200 bg-gray-50 text-gray-700')}>
            <span className="truncate" title={purposeLabel}>
              {purposeLabel}
            </span>
          </span>
        )}
        {priority === 'High' && (
          <span
            className={clsx(chipClass, 'border-amber-200 bg-amber-50 font-semibold text-amber-700')}
          >
            {t('page.header.urgent')}
          </span>
        )}
        {priorNumber && (
          <span className={clsx(chipClass, 'border-primary-200 bg-primary-50 text-primary-700')}>
            <Icon style="solid" name="circle-info" className="size-3! shrink-0" />
            <span className="truncate">
              {t('page.header.priorAppraisal')} <b className="font-semibold">{priorNumber}</b>
            </span>
          </span>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
        {/* data-field lets the missing-fields popover scroll here and focus the pick button */}
        <span
          data-field="requestor.employeeId"
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-0.5',
            errors.requestor ? 'border-danger bg-danger-50' : 'border-transparent',
          )}
        >
          {hasRequestor ? (
            <>
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
                {getInitials(requestorName || Array.from(requestorShown.slice(0, 2)).join(' '))}
              </span>
              <span>
                {t('page.header.requestor')}{' '}
                <b className="font-medium text-gray-800">{requestorShown}</b>
                {isMe && <span className="text-primary-700"> {t('page.header.me')}</span>}{' '}
                {requestorName && <span className="text-gray-400">{requestor?.employeeId}</span>}
              </span>
              {!locked && (
                <button
                  type="button"
                  onClick={userModal.onOpen}
                  title={t('page.header.changeRequestor')}
                  className="font-medium text-primary hover:underline"
                >
                  {t('page.header.change')}
                </button>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Icon style="solid" name="triangle-exclamation" className="size-3!" />
                {t('page.header.noRequestor')}
              </span>
              {!locked && (
                <Button type="button" size="xs" variant="outline" onClick={userModal.onOpen}>
                  <Icon style="regular" name="magnifying-glass" className="mr-1 size-3!" />
                  {t('page.header.pickRequestor')}
                </Button>
              )}
            </>
          )}
        </span>

        <span>
          {creatorName && t('page.header.createdBy', { name: creatorName })}
          {requestedAt &&
            ` · ${t('page.header.submittedAt', { date: formatLocaleDate(requestedAt, i18n.language) })}`}
        </span>

        <Button type="button" size="sm" variant="outline" onClick={onOpenComments}>
          <Icon style="regular" name="comments" className="mr-1.5 size-3.5!" />
          {t('page.header.comments')}
          <span className="ml-1.5 min-w-[1.25rem] rounded-full bg-primary px-1.5 text-center text-xs font-semibold text-white">
            {commentCount}
          </span>
        </Button>
      </div>

      <SearchUserModal
        isOpen={userModal.isOpen}
        onClose={userModal.onClose}
        onSelect={user => setValue('requestor', user, { shouldDirty: true, shouldValidate: true })}
        initialRequestor={requestor}
        readOnly={locked}
      />
    </div>
  );
};

export default RequestHeaderStrip;
