import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields, type TextareaField } from '@/shared/components/form';
import { makeTitleLandFields } from '../configs/fields';
import { CollapsibleNotes } from '../components/titles/CollapsibleNotes';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
  /** Only these fields, by config name. Omit for the whole land form. */
  include?: readonly string[];
}

const TitleLandForm = ({ index, include }: TitleLandFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(
    () => makeTitleLandFields(t).filter(field => !include || include.includes(field.name)),
    [t, include],
  );

  // The notes are folded away until asked for
  const notes = fields.find(
    (field): field is TextareaField => field.name === 'notes' && field.type === 'textarea',
  );

  return (
    <>
      <FormFields
        fields={fields.filter(field => field !== notes)}
        namePrefix={'titles'}
        index={index}
      />
      {notes && <CollapsibleNotes index={index} field={notes} />}
    </>
  );
};

export default TitleLandForm;
