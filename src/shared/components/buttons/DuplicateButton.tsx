import type { ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import Icon from '../Icon';

const DuplicateButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { t } = useTranslation('common');
  return (
    <Button
      variant="ghost"
      type="button"
      leftIcon={<Icon style="regular" name="copy" />}
      {...props}
    >
      {t('actions.duplicate', { defaultValue: 'Duplicate' })}
    </Button>
  );
};

export default DuplicateButton;
