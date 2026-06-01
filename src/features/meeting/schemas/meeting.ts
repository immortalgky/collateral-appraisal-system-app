/**
 * Zod schemas for meeting form inputs.
 *
 * These validate user input on the client. The corresponding wire types
 * (e.g. `CreateMeetingRequest`) live in `../api/types.ts`.
 *
 * All message strings are resolved through a `TFunction` factory so the
 * validation messages honour the active locale.
 */
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

// ==================== Shared sub-schemas ====================

const POSITION_VALUES = [
  'Chairman',
  'Director',
  'Secretary',
  'UW',
  'Risk',
  'Appraisal',
  'Credit',
  'Member',
] as const;

// ==================== Schema factories ====================

import type { TFunction } from 'i18next';

export const makeMeetingSchemas = (t: TFunction<'meeting'>) => {
  const titleField = z
    .string()
    .trim()
    .min(1, t('validation.titleRequired'))
    .max(200, t('validation.titleMax'));

  const locationField = z
    .string()
    .trim()
    .max(200, t('validation.locationMax'))
    .optional()
    .or(z.literal(''));

  const buildFromToField = () =>
    z.string().trim().max(200, t('validation.fromToMax')).optional().or(z.literal(''));

  const startAtField = z
    .string()
    .datetime({ local: true, offset: true, message: t('validation.startRequired') });
  const endAtField = z
    .string()
    .datetime({ local: true, offset: true, message: t('validation.endRequired') });

  const createMeetingFormSchema = z
    .object({
      startAt: startAtField,
      endAt: endAtField,
    })
    .refine(data => new Date(data.endAt) > new Date(data.startAt), {
      message: t('validation.endAfterStart'),
      path: ['endAt'],
    });

  const updateMeetingFormSchema = z
    .object({
      title: titleField,
      location: locationField,
      fromText: buildFromToField(),
      toText: buildFromToField(),
      startAt: startAtField,
      endAt: endAtField,
    })
    .refine(data => new Date(data.endAt) > new Date(data.startAt), {
      message: t('validation.endAfterStart'),
      path: ['endAt'],
    });

  const bulkCreateMeetingsSchema = z.object({
    dates: z
      .array(z.string().datetime({ local: true, offset: true }))
      .min(1, t('validation.pickAtLeastOneDate')),
    defaultTitle: z.string().max(200).optional(),
  });

  const cancelMeetingSchema = z.object({
    reason: z
      .string()
      .trim()
      .min(1, t('validation.reasonRequired'))
      .max(500, t('validation.reasonMax')),
  });

  const routeBackSchema = z.object({
    reason: z
      .string()
      .trim()
      .min(1, t('validation.reasonRequired'))
      .max(500, t('validation.reasonMax')),
  });

  const memberFormSchema = z.object({
    userId: z.string().min(1).max(100),
    memberName: z.string().min(1).max(200),
    position: z.enum(POSITION_VALUES),
  });

  const updateMemberPositionSchema = z.object({
    position: z.enum(POSITION_VALUES),
  });

  const updateAgendaSchema = z.object({
    agendaCertifyMinutes: z.string().max(2000).nullable().optional(),
    agendaChairmanInformed: z.string().max(2000).nullable().optional(),
    agendaOthers: z.string().max(2000).nullable().optional(),
  });

  return {
    createMeetingFormSchema,
    updateMeetingFormSchema,
    bulkCreateMeetingsSchema,
    cancelMeetingSchema,
    routeBackSchema,
    memberFormSchema,
    updateMemberPositionSchema,
    updateAgendaSchema,
  };
};

// ==================== Static (type-only) schemas — used for infer ====================
// These provide stable TypeScript types without requiring a TFunction.

const _titleField = z.string().trim().min(1).max(200);
const _locationField = z.string().trim().max(200).optional().or(z.literal(''));
const _fromToField = z.string().trim().max(200).optional().or(z.literal(''));
const _startAtField = z.string().datetime({ local: true, offset: true });
const _endAtField = z.string().datetime({ local: true, offset: true });

export const createMeetingFormSchema = z.object({
  startAt: _startAtField,
  endAt: _endAtField,
});
export type CreateMeetingFormValues = z.infer<typeof createMeetingFormSchema>;

export const updateMeetingFormSchema = z.object({
  title: _titleField,
  location: _locationField,
  fromText: _fromToField,
  toText: _fromToField,
  startAt: _startAtField,
  endAt: _endAtField,
});
export type UpdateMeetingFormValues = z.infer<typeof updateMeetingFormSchema>;

export const bulkCreateMeetingsSchema = z.object({
  dates: z.array(z.string().datetime({ local: true, offset: true })).min(1),
  defaultTitle: z.string().max(200).optional(),
});
export type BulkCreateMeetingsFormValues = z.infer<typeof bulkCreateMeetingsSchema>;

export const cancelMeetingSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type CancelMeetingFormValues = z.infer<typeof cancelMeetingSchema>;

export const routeBackSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type RouteBackFormValues = z.infer<typeof routeBackSchema>;

export const memberFormSchema = z.object({
  userId: z.string().min(1).max(100),
  memberName: z.string().min(1).max(200),
  position: z.enum([
    'Chairman',
    'Director',
    'Secretary',
    'UW',
    'Risk',
    'Appraisal',
    'Credit',
    'Member',
  ] as const),
});
export type MemberFormValues = z.infer<typeof memberFormSchema>;

export const updateMemberPositionSchema = z.object({
  position: z.enum([
    'Chairman',
    'Director',
    'Secretary',
    'UW',
    'Risk',
    'Appraisal',
    'Credit',
    'Member',
  ] as const),
});
export type UpdateMemberPositionFormValues = z.infer<typeof updateMemberPositionSchema>;

export const updateAgendaSchema = z.object({
  agendaCertifyMinutes: z.string().max(2000).nullable().optional(),
  agendaChairmanInformed: z.string().max(2000).nullable().optional(),
  agendaOthers: z.string().max(2000).nullable().optional(),
});
export type UpdateAgendaFormValues = z.infer<typeof updateAgendaSchema>;

// ==================== Convenience hooks ====================

export const useCreateMeetingSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).createMeetingFormSchema;
};

export const useUpdateMeetingSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).updateMeetingFormSchema;
};

export const useCancelMeetingSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).cancelMeetingSchema;
};

export const useRouteBackSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).routeBackSchema;
};

export const useMemberFormSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).memberFormSchema;
};

export const useUpdateAgendaSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).updateAgendaSchema;
};

export const useBulkCreateMeetingsSchema = () => {
  const { t } = useTranslation('meeting');
  return makeMeetingSchemas(t).bulkCreateMeetingsSchema;
};
