import { useNavigate } from 'react-router-dom';
import Button from '../Button';

interface CancelButtonProps {
  navigateTo?: string;
}

const CancelButton = ({ navigateTo }: CancelButtonProps) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (navigateTo) {
      navigate(navigateTo);
    } else {
      navigate(-1);
    }
  };
  return (
    <Button variant="ghost" type="button" onClick={handleClick}>
      Cancel
    </Button>
  );
};

export default CancelButton;
