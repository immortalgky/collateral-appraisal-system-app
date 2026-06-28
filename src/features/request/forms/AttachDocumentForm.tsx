import { useTranslation } from 'react-i18next';
import FormCard from '@/shared/components/sections/FormCard';
import CreateRequestFileInput from '../components/CreateRequestFileInput';
import DocumentUploader from '../components/DocumentUploader';
import { useFormReadOnly } from '@/shared/components/form/context';

interface AttachDocumentFormProps {
  getOrCreateSession: () => Promise<string>;
  /** Saved request id — enables the Appointment Letter action above the checklist. */
  requestId?: string;
}

const AttachDocumentForm = ({ getOrCreateSession, requestId }: AttachDocumentFormProps) => {
  const { t } = useTranslation('request');
  const isReadOnly = useFormReadOnly();

  return (
    <FormCard title={t('forms.attachDocument')} icon="paperclip" iconColor="teal">
      <div className="flex flex-col gap-6">
        {!isReadOnly && <CreateRequestFileInput getOrCreateSession={getOrCreateSession} />}
        <DocumentUploader getOrCreateSession={getOrCreateSession} requestId={requestId} />
      </div>
    </FormCard>
  );
};

export default AttachDocumentForm;
