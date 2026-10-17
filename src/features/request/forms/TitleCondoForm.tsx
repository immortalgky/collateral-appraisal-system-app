import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields, type TextareaField } from '@/shared/components/form';
import { makeTitleCondoFields } from '../configs/fields';
import { CollapsibleNotes } from '../components/titles/CollapsibleNotes';
import { TitleNumbersField } from '../components/titles/TitleNumbersField';

interface TitleCondoFormProps {
  index: number;
  /** Config names to leave out, e.g. the title type the page picks with its own control. */
  exclude?: readonly string[];
  /** Only these config names (the title numbers box is then shown only when it is among them). */
  include?: readonly string[];
}

/**
 * The condominium's fields. Its title number is a list of land titles, kept in one string, so it is
 * the growing box (the same one under the paper), not a one-line input.
 */
const TitleCondoForm = ({ index, exclude, include }: TitleCondoFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(
    () =>
      makeTitleCondoFields(t).filter(
        field =>
          field.name !== 'titleNumber' &&
          !exclude?.includes(field.name) &&
          (!include || include.includes(field.name)),
      ),
    [t, exclude, include],
  );
  // The notes are folded away until asked for
  const notes = fields.find(
    (field): field is TextareaField => field.name === 'notes' && field.type === 'textarea',
  );
  const showNumbers =
    !exclude?.includes('titleNumber') && (!include || include.includes('titleNumber'));

  return (
    <>
      {showNumbers && <TitleNumbersField index={index} />}
      <FormFields
        fields={fields.filter(field => field !== notes)}
        namePrefix={'titles'}
        index={index}
      />
      {notes && <CollapsibleNotes index={index} field={notes} />}
    </>
  );
};

export default TitleCondoForm;
