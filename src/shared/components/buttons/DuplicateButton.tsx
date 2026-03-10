import type { ButtonHTMLAttributes } from 'react';
import Button from '../Button';
import Icon from '../Icon';

const DuplicateButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <Button variant="ghost" type="button" leftIcon={<Icon style="regular" name="copy" />} {...props}>
      Duplicate
    </Button>
  );
};

export default DuplicateButton;
