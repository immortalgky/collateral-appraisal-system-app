import { z } from 'zod';
import type { TFunction } from 'i18next';
import { tokenT } from '@/shared/components/form/validationMessage';

export const makeCreateLawAndRegulationForm = (t: TFunction<'appraisal'>) =>
  z.object({
    headerCode: z.string().min(1, t('validation.headerRequired')),
    remark: z.string().max(4000).nullable(),
  });

// Built with the token `t`: the message is translated where it is shown.
export const createLawAndRegulationForm = makeCreateLawAndRegulationForm(tokenT('appraisal'));

export type CreateLawAndRegulationFormType = z.infer<typeof createLawAndRegulationForm>;

export const useCreateLawAndRegulationFormSchema = () => createLawAndRegulationForm;

export const createLawAndRegulationFormDefault: CreateLawAndRegulationFormType = {
  headerCode: '',
  remark: null,
};
