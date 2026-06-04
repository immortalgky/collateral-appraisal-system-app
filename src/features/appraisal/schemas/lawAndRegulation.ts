import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

export const makeCreateLawAndRegulationForm = (t: TFunction<'appraisal'>) =>
  z.object({
    headerCode: z.string().min(1, t('validation.headerRequired')),
    remark: z.string().max(4000).nullable(),
  });

// Static export for type inference
export const createLawAndRegulationForm = makeCreateLawAndRegulationForm(
  ((key: string) => key) as unknown as TFunction<'appraisal'>,
);

export type CreateLawAndRegulationFormType = z.infer<typeof createLawAndRegulationForm>;

export const useCreateLawAndRegulationFormSchema = () => {
  const { t } = useTranslation('appraisal');
  return makeCreateLawAndRegulationForm(t);
};

export const createLawAndRegulationFormDefault: CreateLawAndRegulationFormType = {
  headerCode: '',
  remark: null,
};
