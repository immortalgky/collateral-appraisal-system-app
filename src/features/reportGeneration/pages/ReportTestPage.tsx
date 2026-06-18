import { useEffect, useRef, useState } from 'react';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import ReportActionButtons from '../components/ReportActionButtons';
import { useReportDefinitions } from '../hooks/useReportDefinitions';

// The backend resolves the entered number to an entity id: Meeting-category reports use the
// MeetingNo (e.g. "12/2567"); every other report uses the AppraisalNumber (e.g. "69000042").

const ReportTestPage = () => {
  // Drive the picker from the DB-backed report registry so it never drifts from the backend.
  const { definitions, isLoading: isLoadingDefs } = useReportDefinitions();

  const [entityId, setEntityId] = useState('');
  const [reportTypeKey, setReportTypeKey] = useState<string>('');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Selection defaults to the first definition until the user picks one — derived, not stored,
  // so there's no effect round-trip or first-render '' mismatch.
  const effectiveKey = reportTypeKey || definitions[0]?.reportTypeKey || '';
  const selectedDef = definitions.find(d => d.reportTypeKey === effectiveKey);

  // Meeting-mode comes from the report's Category (authoritative), matching the backend resolver.
  const meetingMode = selectedDef?.category === 'Meeting';
  const idLabel = meetingMode ? 'Meeting No.' : 'Appraisal No.';
  const idPlaceholder = meetingMode ? 'e.g. 12/2567' : 'e.g. 69000042';

  // Switching report type clears the field — a number entered for one category (e.g. a MeetingNo
  // "12/2567") is meaningless for another and would just 404.
  const handleReportTypeChange = (key: string) => {
    setReportTypeKey(key);
    setEntityId('');
  };

  // Keep a ref to the current object URL so the cleanup effect always revokes
  // the most-recent one, even if state has already changed.
  const objectUrlRef = useRef<string | null>(null);

  // Revoke object URL on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const revokeCurrentUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <SectionHeader
        title="PDF Report Test"
        subtitle="Exercise the PDF generation endpoint end-to-end."
        icon="file-pdf"
        iconColor="primary"
      />

      {/* Form card */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
            <select
              value={effectiveKey}
              onChange={e => handleReportTypeChange(e.target.value)}
              disabled={isLoadingDefs || definitions.length === 0}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
            >
              {definitions.map(rt => (
                <option key={rt.reportTypeKey} value={rt.reportTypeKey}>
                  {rt.displayNameEn || rt.reportTypeKey}
                </option>
              ))}
            </select>
          </div>

          {/* Appraisal / Meeting number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{idLabel}</label>
            <input
              type="text"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
              placeholder={idPlaceholder}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Mode-aware actions — reads generationMode from /reports/definitions and routes
            Sync → open inline, Async → enqueue a background job (realtime + polling + bell). */}
        <div className="flex items-center gap-2 mt-4">
          {entityId.trim() && effectiveKey ? (
            <ReportActionButtons
              reportTypeKey={effectiveKey}
              entityId={entityId.trim()}
              onSyncBlobReady={(_blob, url) => {
                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = url;
                setObjectUrl(url);
              }}
            />
          ) : (
            <p className="text-xs text-gray-400">Enter {meetingMode ? 'a Meeting No.' : 'an Appraisal No.'} to view or generate.</p>
          )}

          {objectUrl && (
            <button
              type="button"
              onClick={revokeCurrentUrl}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <Icon name="xmark" style="regular" className="size-3" />
              Clear preview
            </button>
          )}
        </div>
      </div>

      {/* PDF preview */}
      {objectUrl && (
        <div className="mt-4 flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[70vh]">
          <iframe
            src={objectUrl}
            title="PDF Preview"
            className="w-full h-[70vh] border-0"
          />
        </div>
      )}
    </div>
  );
};

export default ReportTestPage;
