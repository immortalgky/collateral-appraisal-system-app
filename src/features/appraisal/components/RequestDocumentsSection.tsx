import { useMemo } from 'react';
import { useTitleLabel } from '@/features/request/hooks/useTitleLabel';
import { useTranslation } from 'react-i18next';
import DataErrorState from '@/shared/components/DataErrorState';
import DocumentListView from '@/features/request/components/documentCard/DocumentListView';
import { useViewDocument } from '@/features/request/api/documents';
import {
  getDocumentTypeName,
  getDocumentTypeSearchText,
  useGetDocumentTypes,
} from '@/features/request/api/documentTypes';
import type { TypeRow } from '@/features/request/utils/documentList';
import { useAppraisalContext } from '../context/AppraisalContext';
import { useGetRequestDocuments } from '@features/appraisal/api';
import { requestSections } from '../utils/checklistDocuments';

/**
 * Read-only request documents (from the originating Request): the Request page's document list,
 * with the request level and one section per title, shown on the Document Checklist page. It loads
 * and errors independently of the editors next to it.
 */
export const RequestDocumentsSection = () => {
  const { t } = useTranslation('appraisal');
  const { t: tRequest } = useTranslation('request');
  const { appraisal } = useAppraisalContext();
  const { data, isLoading, isError, error, refetch } = useGetRequestDocuments(appraisal?.requestId);
  const { data: documentTypes = [] } = useGetDocumentTypes();
  const viewDocument = useViewDocument();
  const titleLabels = useTitleLabel();

  // A title section is named like the Request card names it (number summarised for a condo, type
  // in the UI language, place in its own table), from the identity the API returns for the title
  const sections = useMemo(() => {
    const titleNames = (data?.sections ?? [])
      .filter(section => section.titleId)
      .map(section => {
        const id = section.titleIdentifier;
        return {
          collateralType: section.collateralType,
          titleNumber: id,
          licensePlateNumber: id,
          vesselRegistrationNumber: id,
          registrationNumber: id,
          registrationStatus: true,
        };
      });
    return requestSections(
      data,
      tRequest('moveDocument.requestLevelLabel'),
      titleLabels(titleNames),
    );
  }, [data, tRequest, titleLabels]);
  // The type's name in the UI language; the name the API sent only stands in for a type the list lacks
  const typeName = (code: string, displayName?: string | null) =>
    documentTypes.some(dt => dt.code === code)
      ? getDocumentTypeName(documentTypes, code)
      : displayName || code;
  const searchText = (row: TypeRow) =>
    `${typeName(row.documentType, row.displayName)} ${getDocumentTypeSearchText(documentTypes, row.documentType)}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-(--palette-gray-500)">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <DataErrorState
        variant="inline"
        title={t('valuationDocuments.checklist.requestLoadFailed')}
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <DocumentListView
      title={t('valuationDocuments.checklist.requestTitle')}
      icon="file-lines"
      sections={sections}
      typeName={typeName}
      searchText={searchText}
      editable={false}
      onView={doc => {
        if (doc.documentId) viewDocument(doc.documentId, doc.fileSizeBytes, doc.fileName);
      }}
      headerExtra={
        <span className="rounded-full bg-(--palette-surface-3) px-2 py-0.5 text-xs font-medium text-(--palette-gray-600)">
          {t('valuationDocuments.checklist.readOnlyTag')}
        </span>
      }
      emptyLabel={t('valuationDocuments.checklist.requestEmpty')}
    />
  );
};

export default RequestDocumentsSection;
