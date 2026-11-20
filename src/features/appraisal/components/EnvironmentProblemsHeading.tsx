import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useFormLayout } from '@/shared/components/form/formLayoutContext';
import { FormTableHeading } from '@/shared/components/form/table';

/**
 * The sub-heading above the neighbouring-problems chips (land and condo forms).
 *
 * Standard only: the section grid's row gap (1.2857rem) sits on both sides of this row, and the
 * heading carries its own bottom margin, so below it the gap to the label doubles up. More room above
 * (it closes a group of chips), and the heading's own margin taken back below. Compact has no row gap.
 */
export default function EnvironmentProblemsHeading() {
  const { t } = useTranslation('appraisal');
  const standard = useFormLayout() === 'standard';
  return (
    <div className={clsx('col-span-12', standard && 'mt-[0.7143rem] -mb-[0.5714rem]')}>
      <FormTableHeading>{t('forms.environmentProblems.title')}</FormTableHeading>
    </div>
  );
}
