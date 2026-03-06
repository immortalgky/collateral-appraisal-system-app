import { useNavigate } from 'react-router-dom';
import Button from '../Button';

const CancelButton = () => {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
      Cancel
    </Button>
  );
};

export default CancelButton;
