import Modal from '@/shared/components/Modal';
import { Icon } from '@/shared/components';

/**
 * Shape returned by the API in ProblemDetails.extensions.rowErrors
 * when the bulk upload fails row-level validation.
 */
export interface RowParseError {
  rowNumber: number;  // Excel row number (2-based)
  column: string | null;
  message: string;
}

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  errors: RowParseError[];
}

/**
 * Displays the row-level errors returned from the bulk-upload endpoint.
 * Only shown when the server returns a 400 with "rowErrors" in the response.
 */
export function BulkUploadDialog({ isOpen, onClose, errors }: BulkUploadDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Errors" size="xl">
      <div className="flex flex-col gap-4">
        {/* Summary banner */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {errors.length} row error{errors.length !== 1 ? 's' : ''} found
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              No records were saved. Fix the errors below and upload the file again.
            </p>
          </div>
        </div>

        {/* Error table */}
        <div className="overflow-auto max-h-[50vh] rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                  Row
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                  Column
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {errors.map((err, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{err.rowNumber}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{err.column ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-red-700">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Close button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
