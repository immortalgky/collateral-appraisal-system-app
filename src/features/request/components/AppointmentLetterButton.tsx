import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAuthStore } from '@/features/auth/store';
import { fetchReportPdf } from '@/features/reportGeneration/api/reports';
import { useUploadDocument } from '../api/documents';
import { getDocumentCategory, type UploadedDocument } from '../types/document';

// Appointment-letter document type in the backend taxonomy (D035 = ใบขอนัดสำรวจและประเมินราคา).
const APPOINTMENT_LETTER_DOC_TYPE = 'D035';
const APPOINTMENT_LETTER_FILE = 'appointment-letter.pdf';

interface AppointmentLetterButtonProps {
  /** Saved request id (Guid). The report resolver accepts a Guid as-is. */
  requestId?: string;
  getOrCreateSession: () => Promise<string>;
}

/**
 * Icon button (tooltip) above the document checklist. Clicking opens a small menu to either
 * just generate/view the Appointment Letter PDF, or generate it AND attach it as an
 * application-level document (added to the form's `documents` array; persisted on save).
 * In read-only mode the menu is skipped — clicking just opens the PDF.
 */
const AppointmentLetterButton = ({ requestId, getOrCreateSession }: AppointmentLetterButtonProps) => {
  const { t } = useTranslation('request');
  // Read-only when the form OR the page is read-only → view-only, no attach.
  const isReadOnly = useFormReadOnly() || usePageReadOnly();
  const { watch, setValue } = useFormContext();
  const currentUser = useAuthStore(state => state.user);
  const { mutateAsync: uploadDocument } = useUploadDocument();

  const [busy, setBusy] = useState<null | 'view' | 'attach'>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!requestId) return null;

  const label = t('appointmentLetter.label', 'Appointment Letter');

  const generateBlob = () => fetchReportPdf('appointment-letter', requestId);

  const handleView = async () => {
    setMenuOpen(false);
    if (busy) return;
    setBusy('view');
    try {
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error(t('appointmentLetter.error', 'Failed to generate the appointment letter.'));
    } finally {
      setBusy(null);
    }
  };

  const handleGenerateAndAttach = async () => {
    setMenuOpen(false);
    if (busy) return;
    setBusy('attach');
    try {
      const blob = await generateBlob();
      const sessionId = await getOrCreateSession();
      const file = new File([blob], APPOINTMENT_LETTER_FILE, { type: 'application/pdf' });
      const result = await uploadDocument({
        uploadSessionId: sessionId,
        file,
        documentType: APPOINTMENT_LETTER_DOC_TYPE,
        documentCategory: getDocumentCategory(APPOINTMENT_LETTER_DOC_TYPE),
      });

      const newDoc: UploadedDocument = {
        id: null,
        titleId: null,
        documentId: result.documentId,
        documentType: APPOINTMENT_LETTER_DOC_TYPE,
        fileName: result.fileName,
        uploadedAt: new Date().toISOString(),
        prefix: null,
        notes: null,
        filePath: null,
        createdWorkstation: null,
        isRequired: false,
        uploadedBy: currentUser?.username ?? null,
        uploadedByName: currentUser?.name ?? null,
        file,
      };

      // Application-level = the form's `documents` array. Replace any prior auto-generated
      // appointment letter so re-generating stays idempotent, then append.
      const current: UploadedDocument[] = watch('documents') ?? [];
      const deduped = current.filter(d => d.documentType !== APPOINTMENT_LETTER_DOC_TYPE);
      setValue('documents', [...deduped, newDoc], { shouldDirty: true });

      toast.success(
        t('appointmentLetter.attached', 'Appointment letter attached. Save the request to keep it.'),
      );
    } catch {
      toast.error(t('appointmentLetter.error', 'Failed to generate the appointment letter.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative flex justify-end">
      <Button
        variant="outline"
        size="sm"
        type="button"
        isLoading={busy !== null}
        disabled={isReadOnly}
        onClick={() => {
          if (isReadOnly) return;
          setMenuOpen(open => !open);
        }}
        title={label}
        aria-label={label}
        leftIcon={
          busy === null ? (
            <Icon name="file-pdf" style="regular" className="size-4 text-red-600" />
          ) : undefined
        }
      >
        {label}
      </Button>

      {menuOpen && !isReadOnly && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <button
              type="button"
              onClick={handleView}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon name="eye" style="regular" className="size-4 text-gray-500" />
              {t('appointmentLetter.generate', 'Generate (view only)')}
            </button>
            <button
              type="button"
              onClick={handleGenerateAndAttach}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon name="paperclip" style="regular" className="size-4 text-gray-500" />
              {t('appointmentLetter.generateAttach', 'Generate & attach to documents')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AppointmentLetterButton;
