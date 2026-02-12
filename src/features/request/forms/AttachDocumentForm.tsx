import FormCard from '@/shared/components/sections/FormCard';
import CreateRequestFileInput from '../components/CreateRequestFileInput';
import DocumentUploader from '../components/DocumentUploader';
import { useFormReadOnly } from '@/shared/components/form/context';

interface AttachDocumentFormProps {
  getOrCreateSession: () => Promise<string>;
}

const AttachDocumentForm = ({ getOrCreateSession }: AttachDocumentFormProps) => {
  const isReadOnly = useFormReadOnly();

  return (
    <FormCard title="Attach Document" icon="paperclip" iconColor="teal">
      <div className="flex flex-col gap-6">
        {!isReadOnly && <CreateRequestFileInput getOrCreateSession={getOrCreateSession} />}
        <DocumentUploader getOrCreateSession={getOrCreateSession} />
      </div>
    </FormCard>
  );
};

export default AttachDocumentForm;
