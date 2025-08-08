import Button from '../Button';
import Icon from '../Icon';

const DeleteButton = () => {
  return (
    <Button variant="outline" type="button" leftIcon={<Icon style="regular" name="trash-can" />}>
      Delete
    </Button>
  );
};

export default DeleteButton;
