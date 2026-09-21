import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../Button';

interface CancelButtonProps {
  fallbackPath?: string;
}

const CancelButton = ({ fallbackPath }: CancelButtonProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleCancel = () => {
    if (fallbackPath) {
      navigate(fallbackPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button variant="ghost" type="button" onClick={handleCancel}>
      {t('actions.cancel', { defaultValue: 'Cancel' })}
    </Button>
  );
};

export default CancelButton;
