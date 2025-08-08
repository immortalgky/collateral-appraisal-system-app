import Button from '../Button';
import Icon from '../Icon';

const DuplicateButton = () => {
  return (
    <Button variant="outline" type="button" leftIcon={<Icon style="regular" name="copy" />}>
      Duplicate
    </Button>
  );
};

export default DuplicateButton;
