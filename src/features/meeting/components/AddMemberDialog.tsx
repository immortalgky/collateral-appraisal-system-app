import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { type MemberFormValues, useMemberFormSchema } from '../schemas/meeting';
import { useAddMeetingMember, useGetMeetingDetail } from '../api/meetings';
import type { CommitteeMemberPosition } from '../api/types';
import { POSITION_OPTIONS } from '../constants';
import { useGetUsers } from '@features/userManagement/api/users';

// ASP.NET Identity role name used to seed the committee user list
const COMMITTEE_ROLE = 'AppraisalCommittee';

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
}

const sharedInputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

const AddMemberDialog = ({ isOpen, onClose, meetingId }: AddMemberDialogProps) => {
  const { t } = useTranslation('meeting');
  const addMember = useAddMeetingMember();
  const schema = useMemberFormSchema();

  // Fetch all users with the AppraisalCommittee role. pageSize: 100 is sufficient
  // since committee membership is naturally bounded. No search-as-you-type needed.
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsers({
    role: COMMITTEE_ROLE,
    pageSize: 100,
  });

  // Existing members of this meeting — used to filter the dropdown so a user
  // already on the roster can't be added twice.
  const { data: meetingDetail } = useGetMeetingDetail(meetingId);
  const existingMemberUserIds = new Set((meetingDetail?.members ?? []).map(m => m.userId));

  const committeeUsers = (usersData?.items ?? []).filter(
    u => !existingMemberUserIds.has(u.username),
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: '', memberName: '', position: 'Member' },
  });

  useEffect(() => {
    if (isOpen) reset({ userId: '', memberName: '', position: 'Member' });
  }, [isOpen, reset]);

  const handleClose = () => {
    if (!addMember.isPending) onClose();
  };

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const username = e.target.value;
    if (!username) {
      setValue('userId', '', { shouldValidate: true });
      setValue('memberName', '', { shouldValidate: true });
      return;
    }

    const user = committeeUsers.find(u => u.username === username);
    if (!user) return;

    // userId stores the userName string (matches CommitteeMember.UserId convention)
    setValue('userId', user.username, { shouldValidate: true });

    // Auto-populate memberName; user may still edit it in the text input
    const displayName =
      user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.username;
    setValue('memberName', displayName, { shouldValidate: true });
  };

  const onSubmit = (values: MemberFormValues) => {
    addMember.mutate(
      {
        meetingId,
        body: {
          userId: values.userId.trim(),
          memberName: values.memberName.trim(),
          position: values.position,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.memberAdded'));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.memberAddFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.addMember')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* User selector — populated from GET /auth/users?role=AppraisalCommittee */}
        <div>
          <label
            htmlFor="member-user-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('fields.user')} <span className="text-red-500">*</span>
          </label>
          <select
            id="member-user-select"
            onChange={handleUserSelect}
            disabled={isLoadingUsers}
            className={sharedInputClass}
            defaultValue=""
          >
            <option value="" disabled>
              {isLoadingUsers
                ? t('addMemberDialog.loadingUsers')
                : committeeUsers.length === 0
                  ? t('addMemberDialog.noUsers')
                  : t('addMemberDialog.selectUser')}
            </option>
            {committeeUsers.map(user => (
              <option key={user.id} value={user.username}>
                {user.firstName || user.lastName
                  ? `${user.firstName} ${user.lastName}`.trim()
                  : user.username}
              </option>
            ))}
          </select>
          {/* Hidden fields drive form validation for userId and memberName */}
          <input type="hidden" {...register('userId')} />
          <input type="hidden" {...register('memberName')} />
          {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
          {errors.memberName && (
            <p className="mt-1 text-xs text-red-600">{errors.memberName.message}</p>
          )}
        </div>

        {/* Position */}
        <div>
          <label htmlFor="member-position" className="block text-sm font-medium text-gray-700 mb-1">
            {t('columns.position')} <span className="text-red-500">*</span>
          </label>
          <select id="member-position" {...register('position')} className={sharedInputClass}>
            {POSITION_OPTIONS.map(pos => (
              <option key={pos} value={pos}>
                {t(`position.${pos}` as `position.${CommitteeMemberPosition}`)}
              </option>
            ))}
          </select>
          {errors.position && (
            <p className="mt-1 text-xs text-red-600">{errors.position.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={addMember.isPending}
          >
            {t('buttons.cancelMemberAdd')}
          </Button>
          <Button type="submit" disabled={addMember.isPending}>
            {addMember.isPending ? t('addMemberDialog.adding') : t('buttons.addMemberSubmit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMemberDialog;
