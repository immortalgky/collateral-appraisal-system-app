import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form';
import LandTitleTable from '../components/tables/LandTitleTable';
import { landtitlesFields } from '@/features/appraisal/configs/fields';

/**
 * `orderable`: off where title order is not saved (a block project's land). `hint`: quiet text at
 * the right end of the section head (a block project's title count and area).
 */
const TitleDeedForm = ({ orderable = true, hint }: { orderable?: boolean; hint?: ReactNode }) => {
  const { t } = useTranslation('appraisal');
  return (
    <FormSection title={t('titleEntry.sections.document.title')} icon="file-contract" hint={hint}>
      <LandTitleTable fields={landtitlesFields} name={'titles'} orderable={orderable} />
    </FormSection>
  );
};

export default TitleDeedForm;
