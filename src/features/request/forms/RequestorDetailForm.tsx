import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { makeRequestorFields } from '../configs/fields';

interface RequestorDetailFormProps {
  /** Opens the requestor search modal. Hidden in read-only mode. */
  onSearch: () => void;
  readOnly?: boolean;
}

const RequestorDetailForm = ({ onSearch, readOnly }: RequestorDetailFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeRequestorFields(t), [t]);

  return (
    <div>
      <SectionHeader
        title={t('forms.requestorDetail')}
        rightIcon={
          !readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={onSearch}>
              <Icon name="magnifying-glass" style="regular" className="w-4 h-4 mr-2" />
              {t('forms.searchRequestor')}
            </Button>
          )
        }
      />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={fields} />
      </div>
    </div>
  );
};

export default RequestorDetailForm;
