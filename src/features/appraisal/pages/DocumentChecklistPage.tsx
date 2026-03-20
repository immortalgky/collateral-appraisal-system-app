import { DocumentChecklistTab } from '../components/tabs/DocumentChecklistTab';

export default function DocumentChecklistPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DocumentChecklistTab />
      </div>
    </div>
  );
}
