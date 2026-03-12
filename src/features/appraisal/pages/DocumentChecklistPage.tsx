import { DocumentChecklistTab } from '../components/tabs/DocumentChecklistTab';
import { useAppraisalReadOnly } from '../context/AppraisalContext';

export default function DocumentChecklistPage() {
  const { isReadOnly } = useAppraisalReadOnly('Document Checklist');

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DocumentChecklistTab readOnly={isReadOnly} />
      </div>
    </div>
  );
}
