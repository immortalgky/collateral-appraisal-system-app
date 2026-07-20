import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import DataErrorState from '@/shared/components/DataErrorState';
import { useAppraisalContext } from '../context/AppraisalContext';
import { useGetRequestDocuments } from '@features/appraisal/api';
import type { DocumentItemDto } from '../types/documentChecklist';
import {
  ActionDropdown,
  DocumentFileRow,
  ProgressBar,
  StatusBadge,
  getCollateralTypeIcon,
  openDocumentViewer,
} from './documentShared';

/**
 * Read-only request-level documents (from the originating Request), shown at the top of
 * the Documents page above the (editable) Valuation Documents checklist and Appraisal Book
 * Builder. Split out of what used to be a single combined AppendixTab so this section loads
 * and errors independently of the appendix editor.
 */
export const RequestDocumentsSection = () => {
  const { t } = useTranslation('appraisal');
  const { appraisal } = useAppraisalContext();
  const requestId = appraisal?.requestId;

  const {
    data: requestDocsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetRequestDocuments(requestId);

  const totalRequestDocs = requestDocsData?.totalDocuments ?? 0;
  const uploadedRequestDocs = requestDocsData?.totalUploaded ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <DataErrorState
        variant="inline"
        title="Failed to load documents"
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="file-lines" className="text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Request Documents</h3>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              Read-only
            </span>
          </div>
          <ProgressBar uploaded={uploadedRequestDocs} total={totalRequestDocs} />
        </div>
      </div>

      {/* Document Sections */}
      <div className="divide-y divide-gray-100">
        {requestDocsData?.sections.map((section, sectionIdx) => {
          const label =
            section.sectionLabel ?? section.collateralTypeName ?? `Section ${sectionIdx + 1}`;
          return (
            <div key={section.titleId ?? `section-${sectionIdx}`}>
              {/* Section Sub-Header */}
              <div className="px-6 py-3.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name={getCollateralTypeIcon(section.collateralType)}
                    className="text-gray-500 flex-shrink-0"
                  />
                  <h4 className="text-sm font-semibold text-gray-800 truncate">{label}</h4>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    ({section.uploadedDocuments}/{section.totalDocuments} uploaded)
                  </span>
                </div>
                <div className="w-28 flex-shrink-0">
                  <ProgressBar uploaded={section.uploadedDocuments} total={section.totalDocuments} />
                </div>
              </div>

              {/* Section Documents */}
              {section.documents.map((doc: DocumentItemDto) => {
                const hasFile = !!doc.fileName;
                // The primary label is the required document TYPE (e.g. "ID Card"), not the
                // uploaded filename — this is a checklist of required types, one row per type,
                // so that context matters more than the raw filename. The actual filename is
                // still shown, just as part of the row's footer.
                const typeName = doc.documentTypeName ?? doc.documentType ?? 'Document';
                const requiredBadge = doc.isRequired && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 rounded">
                    Required
                  </span>
                );

                if (!hasFile) {
                  return (
                    <div
                      key={doc.id}
                      className="px-6 py-3.5 flex items-start gap-3 transition-colors bg-gray-50/30 opacity-80"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-dashed border-gray-200">
                        <Icon name="file" className="text-base text-gray-300" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{typeName}</p>
                        <p className="text-xs text-gray-400 italic">No file uploaded</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {requiredBadge}
                        <StatusBadge hasFile={false} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={doc.id} className="px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                    <DocumentFileRow
                      fileName={typeName}
                      documentId={doc.documentId}
                      mimeType={doc.mimeType}
                      fileSizeBytes={doc.fileSizeBytes}
                      uploadedAt={doc.uploadedAt}
                      uploadedByName={doc.uploadedByName}
                      uploadedBy={doc.uploadedBy}
                      t={t}
                      footer={
                        (doc.fileName || doc.notes) && (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {doc.fileName && (
                              <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
                            )}
                            {doc.notes && (
                              <p className="text-xs text-gray-500 italic flex items-start gap-1">
                                <Icon
                                  name="note-sticky"
                                  className="text-gray-400 mt-0.5 flex-shrink-0"
                                />
                                <span className="truncate">{doc.notes}</span>
                              </p>
                            )}
                          </div>
                        )
                      }
                      actions={
                        <>
                          {requiredBadge}
                          <StatusBadge hasFile />
                          <ActionDropdown
                            onView={() => openDocumentViewer(doc)}
                            isEditable={false}
                          />
                        </>
                      }
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        {(!requestDocsData || requestDocsData.sections.length === 0) && (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            No request documents found
          </div>
        )}
      </div>
    </section>
  );
};

export default RequestDocumentsSection;
