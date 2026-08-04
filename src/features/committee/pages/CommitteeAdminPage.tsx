import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Modal from '@/shared/components/Modal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useGetUsers } from '@/features/userManagement/api/users';
import { POSITION_OPTIONS } from '@/features/meeting/constants';

import {
  useAddCommitteeCondition,
  useAddCommitteeMember,
  useGetCommitteeDetail,
  useGetCommittees,
  useRemoveCommitteeCondition,
  useRemoveCommitteeMember,
  useUpdateCommittee,
  useUpdateCommitteeCondition,
  useUpdateCommitteeMember,
} from '../api/committees';
import type {
  CommitteeConditionDto,
  CommitteeDetailDto,
  CommitteeMemberAttendance,
  CommitteeMemberDto,
  MajorityType,
  QuorumType,
  VotingMode,
} from '../api/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMITTEE_ROLE = 'AppraisalCommittee';

const ATTENDANCE_OPTIONS: CommitteeMemberAttendance[] = ['Always', 'Odd', 'Even'];

// Attendance code → i18n key under `attendance.*`
const ATTENDANCE_KEY: Record<CommitteeMemberAttendance, 'always' | 'odd' | 'even'> = {
  Always: 'always',
  Odd: 'odd',
  Even: 'even',
};

// Enum code → i18n key. The API sends PascalCase; keys are camelCase.
const MAJORITY_KEY: Record<MajorityType, 'simple' | 'twoThirds' | 'unanimous' | 'fixedCount'> = {
  Simple: 'simple',
  TwoThirds: 'twoThirds',
  Unanimous: 'unanimous',
  FixedCount: 'fixedCount',
};

const VOTING_MODE_KEY: Record<VotingMode, 'waitForAll' | 'quorum'> = {
  WaitForAll: 'waitForAll',
  Quorum: 'quorum',
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const makeAddMemberSchema = (t: TFunction<'committee'>) =>
  z.object({
    userId: z.string().min(1, t('validation.selectUser')),
    memberName: z.string().min(1, t('validation.memberNameRequired')),
    role: z.enum([
      'Chairman',
      'Director',
      'Secretary',
      'UW',
      'Risk',
      'Appraisal',
      'Credit',
      'Member',
    ] as const),
    attendance: z.enum(['Always', 'Odd', 'Even'] as const),
  });

const updateMemberSchema = z.object({
  role: z.enum([
    'Chairman',
    'Director',
    'Secretary',
    'UW',
    'Risk',
    'Appraisal',
    'Credit',
    'Member',
  ] as const),
  attendance: z.enum(['Always', 'Odd', 'Even'] as const),
  isActive: z.boolean(),
});

// Committee-level settings (everything except members). Code is immutable and omitted.
// `activeMemberCount` mirrors the backend's reachability check so a threshold nobody could ever
// reach is rejected here with a readable message rather than as a 500 from Committee.Update.
const makeCommitteeSettingsSchema = (t: TFunction<'committee'>, activeMemberCount: number) =>
  z
    .object({
      name: z.string().min(1, t('validation.nameRequired')),
      description: z.string(),
      quorumType: z.enum(['Fixed', 'Percentage'] as const),
      // A number input yields a string; coerce before the range checks.
      quorumValue: z.coerce.number().int().min(1, t('validation.quorumMin')),
      majorityType: z.enum(['Simple', 'TwoThirds', 'Unanimous', 'FixedCount'] as const),
      majorityValue: z.coerce.number().int().min(0),
      votingMode: z.enum(['WaitForAll', 'Quorum'] as const),
      isActive: z.boolean(),
    })
    .refine(v => v.quorumType !== 'Percentage' || v.quorumValue <= 100, {
      message: t('validation.quorumPercentMax'),
      path: ['quorumValue'],
    })
    .refine(v => v.majorityType !== 'FixedCount' || v.majorityValue > 0, {
      message: t('validation.majorityValueRequired'),
      path: ['majorityValue'],
    })
    .refine(
      v =>
        v.majorityType !== 'FixedCount' ||
        activeMemberCount === 0 ||
        v.majorityValue <= activeMemberCount,
      {
        message: t('validation.majorityValueExceedsMembers', { max: activeMemberCount }),
        path: ['majorityValue'],
      },
    );

type AddMemberFormValues = z.infer<ReturnType<typeof makeAddMemberSchema>>;
type UpdateMemberFormValues = z.infer<typeof updateMemberSchema>;
type CommitteeSettingsFormValues = z.infer<ReturnType<typeof makeCommitteeSettingsSchema>>;

// Client-side mirror of the domain guards so the common mistakes are caught before a round-trip;
// the backend remains authoritative (it also checks the role is actually held by an active member).
const makeConditionSchema = (t: TFunction<'committee'>) =>
  z.object({
    conditionType: z.enum(['RoleRequired', 'MinVotes'] as const),
    roleRequired: z.string(),
    minVotesRequired: z.coerce.number().int().min(1, t('conditions.validation.minVotes')),
    priority: z.coerce.number().int().min(1),
    description: z.string(),
    isActive: z.boolean(),
  });

type ConditionFormValues = z.infer<ReturnType<typeof makeConditionSchema>>;

// ── Shared input class ────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

// ── Attendance tooltip ────────────────────────────────────────────────────────

const AttendanceHelp = () => {
  const { t } = useTranslation('committee');
  return (
    <span className="ml-1 text-gray-400 cursor-help" title={t('help.attendance')}>
      <Icon name="circle-question" style="regular" className="inline w-3.5 h-3.5" />
    </span>
  );
};

// ── Add member dialog ─────────────────────────────────────────────────────────

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  committeeId: string;
}

const AddMemberDialog = ({ isOpen, onClose, committeeId }: AddMemberDialogProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const addMember = useAddCommitteeMember();
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsers({
    role: COMMITTEE_ROLE,
    pageSize: 100,
  });
  const committeeUsers = usersData?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(makeAddMemberSchema(t)),
    defaultValues: { userId: '', memberName: '', role: 'Member', attendance: 'Always' },
  });

  const handleClose = () => {
    if (!addMember.isPending) {
      reset();
      onClose();
    }
  };

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userName = e.target.value;
    if (!userName) {
      setValue('userId', '', { shouldValidate: true });
      setValue('memberName', '', { shouldValidate: true });
      return;
    }
    // The API serialises UserListItemDto.Username as "username" — reading user.userName
    // here yielded undefined, so this lookup never matched and no member could be added.
    const user = committeeUsers.find(u => u.username === userName);
    if (!user) return;
    // CommitteeMember.UserId holds the bank username, not a Guid.
    setValue('userId', user.username, { shouldValidate: true });
    const displayName =
      user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.username;
    setValue('memberName', displayName, { shouldValidate: true });
  };

  const onSubmit = (values: AddMemberFormValues) => {
    addMember.mutate(
      {
        committeeId,
        body: {
          userId: values.userId.trim(),
          memberName: values.memberName.trim(),
          role: values.role,
          attendance: values.attendance,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.added'));
          handleClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.addFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('addDialog.title')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="cm-user" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.user')} <span className="text-red-500">*</span>
          </label>
          <select
            id="cm-user"
            onChange={handleUserSelect}
            disabled={isLoadingUsers}
            className={inputClass}
            defaultValue=""
          >
            <option value="" disabled>
              {isLoadingUsers
                ? t('common:status.loading')
                : committeeUsers.length === 0
                  ? t('addDialog.noUsers')
                  : t('addDialog.selectUser')}
            </option>
            {committeeUsers.map(user => (
              <option key={user.id} value={user.username}>
                {user.firstName || user.lastName
                  ? `${user.firstName} ${user.lastName}`.trim()
                  : user.username}
              </option>
            ))}
          </select>
          <input type="hidden" {...register('userId')} />
          <input type="hidden" {...register('memberName')} />
          {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
        </div>

        <div>
          <label htmlFor="cm-role" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.role')} <span className="text-red-500">*</span>
          </label>
          <select id="cm-role" {...register('role')} className={inputClass}>
            {POSITION_OPTIONS.map(pos => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
        </div>

        <div>
          <label htmlFor="cm-attendance" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.attendance')} <AttendanceHelp />
          </label>
          <select id="cm-attendance" {...register('attendance')} className={inputClass}>
            {ATTENDANCE_OPTIONS.map(att => (
              <option key={att} value={att}>
                {t(`attendance.${ATTENDANCE_KEY[att]}`)}
              </option>
            ))}
          </select>
          {errors.attendance && (
            <p className="mt-1 text-xs text-red-600">{errors.attendance.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={addMember.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={addMember.isPending}>
            {addMember.isPending ? t('addDialog.adding') : t('addDialog.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Edit member dialog ────────────────────────────────────────────────────────

interface EditMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  committeeId: string;
  member: CommitteeMemberDto;
}

const EditMemberDialog = ({ isOpen, onClose, committeeId, member }: EditMemberDialogProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const updateMember = useUpdateCommitteeMember();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateMemberFormValues>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      role: member.role,
      attendance: member.attendance,
      isActive: member.isActive,
    },
  });

  const handleClose = () => {
    if (!updateMember.isPending) onClose();
  };

  const onSubmit = (values: UpdateMemberFormValues) => {
    updateMember.mutate(
      { committeeId, memberId: member.id, body: values },
      {
        onSuccess: () => {
          toast.success(t('toasts.updated'));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.updateFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('editDialog.title')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-700 font-medium">{member.memberName}</p>

        <div>
          <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.role')}
          </label>
          <select id="edit-role" {...register('role')} className={inputClass}>
            {POSITION_OPTIONS.map(pos => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-attendance" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.attendance')} <AttendanceHelp />
          </label>
          <select id="edit-attendance" {...register('attendance')} className={inputClass}>
            {ATTENDANCE_OPTIONS.map(att => (
              <option key={att} value={att}>
                {t(`attendance.${ATTENDANCE_KEY[att]}`)}
              </option>
            ))}
          </select>
          {errors.attendance && (
            <p className="mt-1 text-xs text-red-600">{errors.attendance.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="edit-isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="edit-isActive" className="text-sm font-medium text-gray-700">
            {t('fields.active')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={updateMember.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={updateMember.isPending}>
            {updateMember.isPending ? t('common:status.saving') : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Committee settings dialog ─────────────────────────────────────────────────
// Everything on a committee other than its members. Code is intentionally absent:
// it is the stable lookup key and the update endpoint does not accept it.

interface CommitteeSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  committee: CommitteeDetailDto;
}

const CommitteeSettingsDialog = ({ isOpen, onClose, committee }: CommitteeSettingsDialogProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const updateCommittee = useUpdateCommittee();

  const activeMemberCount = (committee.members ?? []).filter(m => m.isActive).length;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CommitteeSettingsFormValues>({
    resolver: zodResolver(makeCommitteeSettingsSchema(t, activeMemberCount)),
    defaultValues: {
      name: committee.name,
      description: committee.description ?? '',
      quorumType: (committee.quorumType as QuorumType) ?? 'Fixed',
      quorumValue: committee.quorumValue,
      majorityType: (committee.majorityType as MajorityType) ?? 'Simple',
      majorityValue: committee.majorityValue ?? 0,
      votingMode: committee.votingMode ?? 'WaitForAll',
      isActive: committee.isActive,
    },
  });

  const quorumType = watch('quorumType');
  const votingMode = watch('votingMode');
  const majorityType = watch('majorityType');

  const handleClose = () => {
    if (!updateCommittee.isPending) onClose();
  };

  const onSubmit = (values: CommitteeSettingsFormValues) => {
    updateCommittee.mutate(
      {
        id: committee.id,
        body: {
          ...values,
          description: values.description.trim() || null,
          // Normalise away any stale threshold when the rule is not FixedCount.
          majorityValue: values.majorityType === 'FixedCount' ? values.majorityValue : 0,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.settingsUpdated'));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.settingsUpdateFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('settingsDialog.title')} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="cs-name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.name')}
          </label>
          <input id="cs-name" type="text" {...register('name')} className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="cs-description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.description')}
          </label>
          <textarea
            id="cs-description"
            rows={2}
            {...register('description')}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cs-quorumType" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.quorumType')}
            </label>
            <select id="cs-quorumType" {...register('quorumType')} className={inputClass}>
              <option value="Fixed">{t('quorumType.fixed')}</option>
              <option value="Percentage">{t('quorumType.percentage')}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="cs-quorumValue"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {quorumType === 'Percentage'
                ? t('fields.quorumValuePercent')
                : t('fields.quorumValueCount')}
            </label>
            <input
              id="cs-quorumValue"
              type="number"
              min={1}
              max={quorumType === 'Percentage' ? 100 : undefined}
              {...register('quorumValue')}
              className={inputClass}
            />
            {errors.quorumValue && (
              <p className="mt-1 text-xs text-red-600">{errors.quorumValue.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="cs-majorityType" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.majorityType')}
          </label>
          <select id="cs-majorityType" {...register('majorityType')} className={inputClass}>
            <option value="Simple">{t('majorityType.simple')}</option>
            <option value="TwoThirds">{t('majorityType.twoThirds')}</option>
            <option value="Unanimous">{t('majorityType.unanimous')}</option>
            <option value="FixedCount">{t('majorityType.fixedCount')}</option>
          </select>
          {/* The proportional rules are evaluated against the whole committee, not votes cast. */}
          <p className="mt-1 text-xs text-gray-400">
            {majorityType === 'FixedCount' ? t('help.majorityFixedCount') : t('help.majority')}
          </p>
        </div>

        {/* Only FixedCount reads majorityValue; the proportional types ignore it and it is
            submitted as 0 so the stored value cannot linger. */}
        {majorityType === 'FixedCount' && (
          <div>
            <label
              htmlFor="cs-majorityValue"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('fields.majorityValue')}
            </label>
            <input
              id="cs-majorityValue"
              type="number"
              min={1}
              max={activeMemberCount || undefined}
              {...register('majorityValue')}
              className={inputClass}
            />
            {errors.majorityValue ? (
              <p className="mt-1 text-xs text-red-600">{errors.majorityValue.message}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                {t('help.majorityValue', { max: activeMemberCount })}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="cs-votingMode" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.votingMode')}
          </label>
          <select id="cs-votingMode" {...register('votingMode')} className={inputClass}>
            <option value="WaitForAll">{t('votingMode.waitForAll')}</option>
            <option value="Quorum">{t('votingMode.quorum')}</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {votingMode === 'Quorum' ? t('help.votingQuorum') : t('help.votingWaitForAll')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="cs-isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="cs-isActive" className="text-sm font-medium text-gray-700">
            {t('fields.active')}
          </label>
        </div>
        <p className="text-xs text-gray-400">{t('help.committeeActive')}</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={updateCommittee.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={updateCommittee.isPending}>
            {updateCommittee.isPending ? t('common:status.saving') : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Committee settings summary card ───────────────────────────────────────────

const SettingItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm text-gray-900">{value}</p>
  </div>
);

// ── Approval condition dialog ─────────────────────────────────────────────────
// Conditions are extra rules a round must satisfy on top of quorum and the approval rule. The
// role is a dropdown, never free text: CheckApprovalConditions matches it against the voter's
// role, so a typo would silently block every round.

interface ConditionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  committeeId: string;
  /** null = adding */
  condition: CommitteeConditionDto | null;
  activeRoles: string[];
}

const ConditionDialog = ({
  isOpen,
  onClose,
  committeeId,
  condition,
  activeRoles,
}: ConditionDialogProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const addCondition = useAddCommitteeCondition();
  const updateCondition = useUpdateCommitteeCondition();
  const isEditing = condition !== null;
  const busy = addCondition.isPending || updateCondition.isPending;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConditionFormValues>({
    resolver: zodResolver(makeConditionSchema(t)),
    defaultValues: {
      conditionType: condition?.conditionType ?? 'RoleRequired',
      roleRequired: condition?.roleRequired ?? activeRoles[0] ?? '',
      minVotesRequired: condition?.minVotesRequired ?? 1,
      priority: condition?.priority ?? 1,
      description: condition?.description ?? '',
      isActive: condition?.isActive ?? true,
    },
  });

  const conditionType = watch('conditionType');

  const handleClose = () => {
    if (!busy) onClose();
  };

  const onSubmit = (values: ConditionFormValues) => {
    // Send only the field this type uses; the backend clears the other one anyway.
    const body = {
      conditionType: values.conditionType,
      roleRequired: values.conditionType === 'RoleRequired' ? values.roleRequired : null,
      minVotesRequired: values.conditionType === 'MinVotes' ? values.minVotesRequired : null,
      priority: values.priority,
      description: values.description.trim() || null,
    };

    const onSuccess = () => {
      toast.success(isEditing ? t('conditions.toasts.updated') : t('conditions.toasts.added'));
      onClose();
    };
    // The domain rejects a condition no member could satisfy — surface that message verbatim.
    const onError = (error: unknown) => {
      const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
      toast.error(detail || t('conditions.toasts.saveFailed'));
    };

    if (isEditing) {
      updateCondition.mutate(
        { committeeId, conditionId: condition.id, body: { ...body, isActive: values.isActive } },
        { onSuccess, onError },
      );
    } else {
      addCondition.mutate({ committeeId, body }, { onSuccess, onError });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? t('conditions.dialog.editTitle') : t('conditions.dialog.addTitle')}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="cond-type" className="block text-sm font-medium text-gray-700 mb-1">
            {t('conditions.fields.type')}
          </label>
          <select id="cond-type" {...register('conditionType')} className={inputClass}>
            <option value="RoleRequired">{t('conditions.type.roleRequired')}</option>
            <option value="MinVotes">{t('conditions.type.minVotes')}</option>
          </select>
        </div>

        {conditionType === 'RoleRequired' ? (
          <div>
            <label htmlFor="cond-role" className="block text-sm font-medium text-gray-700 mb-1">
              {t('conditions.fields.role')}
            </label>
            <select id="cond-role" {...register('roleRequired')} className={inputClass}>
              {POSITION_OPTIONS.map(pos => (
                <option key={pos} value={pos}>
                  {pos}
                  {activeRoles.includes(pos) ? '' : ` — ${t('conditions.noMemberHolds')}`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">{t('conditions.help.role')}</p>
          </div>
        ) : (
          <div>
            <label htmlFor="cond-min" className="block text-sm font-medium text-gray-700 mb-1">
              {t('conditions.fields.minVotes')}
            </label>
            <input
              id="cond-min"
              type="number"
              min={1}
              {...register('minVotesRequired')}
              className={inputClass}
            />
            {errors.minVotesRequired && (
              <p className="mt-1 text-xs text-red-600">{errors.minVotesRequired.message}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="cond-priority" className="block text-sm font-medium text-gray-700 mb-1">
            {t('conditions.fields.priority')}
          </label>
          <input
            id="cond-priority"
            type="number"
            min={1}
            {...register('priority')}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="cond-desc" className="block text-sm font-medium text-gray-700 mb-1">
            {t('conditions.fields.description')}
          </label>
          <textarea id="cond-desc" rows={2} {...register('description')} className={inputClass} />
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            <input
              id="cond-active"
              type="checkbox"
              {...register('isActive')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="cond-active" className="text-sm font-medium text-gray-700">
              {t('conditions.fields.active')}
            </label>
          </div>
        )}

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          {t('conditions.help.snapshot')}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t('common:status.saving') : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Committee detail panel ────────────────────────────────────────────────────

interface CommitteeDetailPanelProps {
  committeeId: string;
}

const CommitteeDetailPanel = ({ committeeId }: CommitteeDetailPanelProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const { data: committee, isLoading } = useGetCommitteeDetail(committeeId);
  const removeMember = useRemoveCommitteeMember();
  const removeCondition = useRemoveCommitteeCondition();
  const addMemberDialog = useDisclosure();
  const settingsDialog = useDisclosure();
  const conditionDialog = useDisclosure();
  const [editingMember, setEditingMember] = useState<CommitteeMemberDto | null>(null);
  const [editingCondition, setEditingCondition] = useState<CommitteeConditionDto | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!committee) return null;

  const handleRemove = (member: CommitteeMemberDto) => {
    if (!confirm(t('confirm.remove', { name: member.memberName }))) return;
    removeMember.mutate(
      { committeeId, memberId: member.id },
      {
        onSuccess: () => toast.success(t('toasts.removed')),
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.removeFailed'));
        },
      },
    );
  };

  const members = committee.members ?? [];
  const conditions = committee.conditions ?? [];
  const activeRoles = [...new Set(members.filter(m => m.isActive).map(m => m.role))];

  const describeCondition = (c: CommitteeConditionDto) =>
    c.conditionType === 'RoleRequired'
      ? t('conditions.summary.role', { role: c.roleRequired ?? '—' })
      : t('conditions.summary.minVotes', { count: c.minVotesRequired ?? 0 });

  const handleRemoveCondition = (c: CommitteeConditionDto) => {
    if (!confirm(t('conditions.confirm.remove', { rule: describeCondition(c) }))) return;
    removeCondition.mutate(
      { committeeId, conditionId: c.id },
      {
        onSuccess: () => toast.success(t('conditions.toasts.removed')),
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('conditions.toasts.removeFailed'));
        },
      },
    );
  };

  const quorumLabel =
    committee.quorumType === 'Percentage'
      ? t('summary.quorumPercent', { value: committee.quorumValue })
      : t('summary.quorumFixed', { value: committee.quorumValue });

  // FixedCount is meaningless without its threshold, so show the number inline.
  const majorityLabel =
    committee.majorityType === 'FixedCount'
      ? t('summary.majorityFixedCount', { value: committee.majorityValue })
      : t(`majorityType.${MAJORITY_KEY[committee.majorityType as MajorityType]}`);

  return (
    <div className="space-y-4">
      {/* Committee-level configuration — quorum, majority and voting mode drive how the
          approval step resolves, so they belong on this screen next to the members. */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{t('summary.title')}</h3>
            {committee.description && (
              <p className="mt-0.5 text-xs text-gray-500">{committee.description}</p>
            )}
          </div>
          <Button size="sm" variant="ghost" type="button" onClick={settingsDialog.onOpen}>
            <Icon name="pen" style="solid" className="size-3.5 mr-1.5" />
            {t('summary.edit')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SettingItem label={t('fields.quorumType')} value={quorumLabel} />
          <SettingItem label={t('fields.majorityType')} value={majorityLabel} />
          <SettingItem
            label={t('fields.votingMode')}
            value={t(`votingMode.${VOTING_MODE_KEY[committee.votingMode] ?? 'waitForAll'}`)}
          />
          <SettingItem
            label={t('fields.active')}
            value={committee.isActive ? t('common:status.active') : t('common:status.inactive')}
          />
        </div>
      </div>

      {/* Approval conditions — extra rules on top of quorum and the approval rule. Placed above
          Members because they are evaluated against member roles. */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('conditions.title', { count: conditions.filter(c => c.isActive).length })}
          </h3>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => {
              setEditingCondition(null);
              conditionDialog.onOpen();
            }}
          >
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            {t('conditions.add')}
          </Button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">{t('conditions.empty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {conditions.map(c => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    {describeCondition(c)}
                    {!c.isActive && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        {t('common:status.inactive')}
                      </span>
                    )}
                  </p>
                  {c.description && (
                    <p className="truncate text-xs text-gray-400">{c.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {t('conditions.priorityShort', { value: c.priority })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCondition(c);
                    conditionDialog.onOpen();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label={t('conditions.edit')}
                >
                  <Icon name="pen" style="solid" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(c)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  aria-label={t('conditions.remove')}
                >
                  <Icon name="trash" style="solid" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('panel.membersActive', { count: members.filter(m => m.isActive).length })}
        </h3>
        <Button size="sm" type="button" onClick={addMemberDialog.onOpen}>
          <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
          {t('panel.addMember')}
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">{t('panel.noMembers')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.name')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.role')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.attendance')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.status')}
                </th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{member.memberName}</td>
                  <td className="px-4 py-3 text-gray-600">{member.role}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {t(`attendance.${ATTENDANCE_KEY[member.attendance]}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {member.isActive ? t('common:status.active') : t('common:status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingMember(member)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        aria-label={t('aria.edit', { name: member.memberName })}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        aria-label={t('aria.remove', { name: member.memberName })}
                      >
                        <Icon name="trash" style="solid" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddMemberDialog
        isOpen={addMemberDialog.isOpen}
        onClose={addMemberDialog.onClose}
        committeeId={committeeId}
      />

      {/* Remount per open so the form re-seeds from the latest server values. */}
      {conditionDialog.isOpen && (
        <ConditionDialog
          isOpen
          onClose={conditionDialog.onClose}
          committeeId={committeeId}
          condition={editingCondition}
          activeRoles={activeRoles}
        />
      )}

      {settingsDialog.isOpen && (
        <CommitteeSettingsDialog
          isOpen={true}
          onClose={settingsDialog.onClose}
          committee={committee}
        />
      )}

      {editingMember && (
        <EditMemberDialog
          isOpen={true}
          onClose={() => setEditingMember(null)}
          committeeId={committeeId}
          member={editingMember}
        />
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const CommitteeAdminPage = () => {
  const { t } = useTranslation('committee');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
  const { data: committees, isLoading } = useGetCommittees();

  const committeeList = committees ?? [];

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('page.subtitle')}</p>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Committee list */}
        <div className="w-72 shrink-0 bg-white rounded-lg border border-gray-200 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : committeeList.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 italic text-center">
              {t('page.noCommittees')}
            </p>
          ) : (
            <ul>
              {committeeList.map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCommitteeId(c.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-100 last:border-0 ${
                      selectedCommitteeId === c.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{c.code}</span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t('page.memberCount', { count: c.memberCount })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-h-0 overflow-auto">
          {selectedCommitteeId ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <CommitteeDetailPanel committeeId={selectedCommitteeId} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {t('page.selectPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommitteeAdminPage;
