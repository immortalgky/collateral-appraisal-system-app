import type { ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import Icon from '../Icon';

const DeleteButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { t } = useTranslation('common');
  return (
    <Button
      variant="ghost"
      type="button"
      className="text-red-500 hover:text-(--palette-danger) hover:bg-(--palette-req-wash)"
      leftIcon={<Icon style="regular" name="trash-can" />}
      {...props}
    >
      {t('actions.delete', { defaultValue: 'Delete' })}
    </Button>
  );
};

export default DeleteButton;
