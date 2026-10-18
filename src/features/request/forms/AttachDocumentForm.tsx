import DocumentUploader from '../components/DocumentUploader';

interface AttachDocumentFormProps {
  getOrCreateSession: () => Promise<string>;
  /** Saved request id — enables the Appointment Letter action in the card header. */
  requestId?: string;
  /** Request not submitted yet: show which files came from the previous appraisal. */
  showCarryForward?: boolean;
  /** Retry after the previous appraisal's documents could not be loaded. */
  onRetryCarryForward?: () => void;
  /** A load is running: the retry action waits. */
  carryBusy?: boolean;
}

/**
 * The document card carries its own header, so it is not wrapped in a FormCard: that
 * would put a card inside a card.
 */
const AttachDocumentForm = ({
  getOrCreateSession,
  requestId,
  showCarryForward,
  onRetryCarryForward,
  carryBusy,
}: AttachDocumentFormProps) => (
  <DocumentUploader
    getOrCreateSession={getOrCreateSession}
    requestId={requestId}
    showCarryForward={showCarryForward}
    onRetryCarryForward={onRetryCarryForward}
    carryBusy={carryBusy}
  />
);

export default AttachDocumentForm;
