import FormCard from '@/shared/components/sections/FormCard';
import CreateRequestFileInput from '../components/CreateRequestFileInput';

const AttachDocumentForm = () => {
  return (
    <FormCard title="Attach Document" icon="paperclip" iconColor="teal">
      <CreateRequestFileInput />
    </FormCard>
  );
};

export default AttachDocumentForm;
