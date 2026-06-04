import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { fetchReportPdf, downloadReportPdf } from '../api/reports';

const REPORT_TYPES = [
  { value: 'appointment-quotation-request', label: 'Appointment Quotation Request' },
] as const;

const ReportTestPage = () => {
  const [entityId, setEntityId] = useState('');
  const [reportTypeKey, setReportTypeKey] = useState<string>(REPORT_TYPES[0].value);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleView = async () => {
    if (!entityId.trim()) {
      toast.error('Please enter an Appraisal ID.');
      return;
    }
    setIsViewing(true);
    revokeCurrentUrl();
    try {
      const blob = await fetchReportPdf(reportTypeKey, entityId.trim());
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setObjectUrl(url);
    } catch {
      toast.error('Failed to load PDF. Check the Appraisal ID and try again.');
    } finally {
      setIsViewing(false);
    }
  };

  const handleDownload = async () => {
    if (!entityId.trim()) {
      toast.error('Please enter an Appraisal ID.');
      return;
    }
    setIsDownloading(true);
    try {
      await downloadReportPdf(reportTypeKey, entityId.trim());
    } catch {
      toast.error('Failed to download PDF. Check the Appraisal ID and try again.');
    } finally {
      setIsDownloading(false);
    }
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
              value={reportTypeKey}
              onChange={e => setReportTypeKey(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {REPORT_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appraisal ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Appraisal ID</label>
            <input
              type="text"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
              placeholder="e.g. 01969f4a-0000-7000-0000-000000000001"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="primary"
            size="sm"
            isLoading={isViewing}
            onClick={handleView}
            leftIcon={<Icon name="eye" style="regular" className="size-3.5" />}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            isLoading={isDownloading}
            onClick={handleDownload}
            leftIcon={<Icon name="arrow-down-to-line" style="regular" className="size-3.5" />}
          >
            Download
          </Button>
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
