import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import QuotationSection from '@/features/appraisal/components/QuotationSection';
import QuotationEntryModal from '@/features/appraisal/components/QuotationEntryModal';
import { useGetTaskById } from '@features/appraisal/api/workflow';

/**
 * Lightweight admin quotation task page.
 * Mounted under /tasks/:taskId/quotation/review and /tasks/:taskId/quotation/finalize.
 *
 * Renders the existing QuotationSection component scoped to the appraisal
 * that this task belongs to. The appraisalId is resolved from the task data
 * (TaskDetailResult.appraisalId) which is already fetched by TaskLayout.
 *
 * No AppraisalLayout wrapper — the page lives inside TaskLayout.
 */
const AdminQuotationTaskPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { data: taskData, isLoading } = useGetTaskById(taskId);

  const appraisalId = taskData?.appraisalId ?? null;

  const [isQuotationEntryModalOpen, setIsQuotationEntryModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appraisalId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-600">
          No appraisal linked to this task. Cannot display quotation section.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-4">
      <QuotationSection
        appraisalId={appraisalId}
        onCreateNew={() => setIsQuotationEntryModalOpen(true)}
      />

      <QuotationEntryModal
        isOpen={isQuotationEntryModalOpen}
        onClose={() => setIsQuotationEntryModalOpen(false)}
        appraisalId={appraisalId}
      />
    </div>
  );
};

export default AdminQuotationTaskPage;
