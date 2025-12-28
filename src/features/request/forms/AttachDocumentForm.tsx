import FormCard from '@/shared/components/sections/FormCard';
import CreateRequestFileInput from '../components/CreateRequestFileInput';
import DocumentUploader from '../components/DocumentUploader';

interface AttachDocumentFormProps {
  getOrCreateSession: () => Promise<string>;
}

const AttachDocumentForm = ({ getOrCreateSession }: AttachDocumentFormProps) => {
  return (
    <FormCard title="Attach Document" icon="paperclip" iconColor="teal">
      <div className="flex flex-col gap-6">
        <CreateRequestFileInput getOrCreateSession={getOrCreateSession} />
        <DocumentUploader getOrCreateSession={getOrCreateSession} />
      </div>
    </FormCard>
  );
};

export default AttachDocumentForm;
