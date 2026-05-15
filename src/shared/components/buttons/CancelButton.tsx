import { useNavigate } from 'react-router-dom';
import Button from '../Button';

interface CancelButtonProps {
  fallbackPath?: string;
}

const CancelButton = ({ fallbackPath }: CancelButtonProps) => {
  const navigate = useNavigate();

  const handleCancel = () => {
    if (fallbackPath) {
      navigate(fallbackPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button variant="ghost" type="button" onClick={handleCancel}>
      Cancel
    </Button>
  );
};

export default CancelButton;
