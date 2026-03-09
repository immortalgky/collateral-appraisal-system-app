import type { ButtonHTMLAttributes } from 'react';
import Button from '../Button';
import Icon from '../Icon';

const DeleteButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <Button
      variant="ghost"
      type="button"
      className="text-red-500 hover:text-red-600 hover:bg-red-50"
      leftIcon={<Icon style="regular" name="trash-can" />}
      {...props}
    >
      Delete
    </Button>
  );
};

export default DeleteButton;
