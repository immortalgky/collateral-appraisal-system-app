import type { ListSection } from '@/features/request/components/documentCard/DocumentListView';
import type { UploadedDocument } from '@/features/request/types/document';
import { groupByType, kpis } from '@/features/request/utils/documentList';
import type {
  AppraisalAppendixDto,
  GetAppraisalAppendicesResponse,
} from '../types/documentChecklist';
import type {
  DocumentItemDto,
  GetRequestDocumentsByRequestIdResponse,
} from '../types/documentChecklist';
import type { AppraisalDocumentType } from '../types/appraisalDocuments';
import { documentTypeName } from './valuationDocuments';

// Turns what the Document Checklist page's endpoints return into the sections and rows the shared
// document list (documentCard/DocumentListView) draws.

const fromRequestItem = (item: DocumentItemDto, titleId: string | null): UploadedDocument => ({
  id: item.id,
  titleId,
  documentId: item.documentId,
  documentType: item.documentType,
  displayName: item.documentTypeName,
  fileName: item.fileName,
  filePath: item.filePath,
  notes: item.notes,
  prefix: null,
  source: item.source ?? null,
  createdWorkstation: null,
  isRequired: item.isRequired,
  uploadedAt: item.uploadedAt ?? '',
  uploadedBy: item.uploadedBy,
  uploadedByName: item.uploadedByName,
  fileSizeBytes: item.fileSizeBytes,
});

/** The request's documents: the request level, then one section per title, in the API's order. */
export const requestSections = (
  data: GetRequestDocumentsByRequestIdResponse | undefined,
  requestLevelLabel: string,
  /** The Request card's label for each title section, in order (see `useTitleLabel`). */
  titleLabels: readonly string[] = [],
): ListSection[] => {
  let titles = 0;
  return (data?.sections ?? []).map(section => {
    const isRequest = !section.titleId;
    const index = isRequest ? -1 : titles++;
    return {
      key: isRequest ? 'request' : `title-${section.titleId}`,
      kind: isRequest ? 'request' : 'title',
      index,
      label: isRequest
        ? requestLevelLabel
        : (titleLabels[index] ??
          section.sectionLabel ??
          section.collateralTypeName ??
          `#${index + 1}`),
      documents: section.documents.map(item =>
        fromRequestItem(item as DocumentItemDto, section.titleId),
      ),
    };
  });
};

/** The valuation document types as one section: a row per file, an empty row for a type with none. */
export const valuationSection = (
  types: AppraisalDocumentType[],
  language: string,
  label: string,
): ListSection => ({
  key: 'valuation',
  kind: 'request',
  index: -1,
  label,
  documents: types.flatMap<UploadedDocument>(type => {
    const base = {
      documentType: type.code,
      displayName: documentTypeName(type, language),
      prefix: null,
      filePath: null,
      createdWorkstation: null,
      isRequired: false,
    };
    return type.files.length === 0
      ? [
          {
            ...base,
            id: `slot-${type.code}`,
            fileName: null,
            notes: null,
            uploadedAt: '',
            uploadedBy: null,
            uploadedByName: null,
          },
        ]
      : type.files.map(file => ({
          ...base,
          id: file.id,
          documentId: file.documentId,
          fileName: file.fileName ?? null,
          notes: file.notes ?? null,
          uploadedAt: file.uploadedAt ?? '',
          uploadedBy: file.uploadedBy ?? null,
          uploadedByName: file.uploadedByName ?? null,
          fileSizeBytes: file.fileSizeBytes,
        }));
  }),
});

/**
 * The appendices as one section, a row per appendix type: its files in book order, or an empty row
 * for a type with none. The row's type is the appendix type code (unique per appraisal).
 */
export const appendixSection = (
  appendices: readonly AppraisalAppendixDto[],
  typeName: (appendix: AppraisalAppendixDto) => string,
  label: string,
): ListSection => ({
  key: 'appendix',
  kind: 'request',
  index: -1,
  label,
  documents: [...appendices]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap<UploadedDocument>(appendix => {
      const base = {
        documentType: appendix.appendixTypeCode,
        displayName: typeName(appendix),
        prefix: null,
        filePath: null,
        notes: null,
        createdWorkstation: null,
        isRequired: false,
      };
      return appendix.documents.length === 0
        ? [
            {
              ...base,
              id: `slot-${appendix.id}`,
              fileName: null,
              uploadedAt: '',
              uploadedBy: null,
              uploadedByName: null,
            },
          ]
        : [...appendix.documents]
            .sort((a, b) => a.displaySequence - b.displaySequence)
            .map(doc => {
              const extra = doc as {
                uploadedAt?: string | null;
                uploadedBy?: string | null;
                uploadedByName?: string | null;
              };
              return {
                ...base,
                id: doc.id,
                documentId: doc.documentId,
                fileName: doc.fileName,
                uploadedAt: extra.uploadedAt ?? '',
                uploadedBy: extra.uploadedBy ?? null,
                uploadedByName: extra.uploadedByName ?? null,
                fileSizeBytes: doc.fileSizeBytes,
              };
            });
    }),
});

/** Required request document types that still have no file (the "ขาด N" on the tab). */
export const missingRequiredTypes = (sections: ListSection[]) => {
  const { required, requiredDone } = kpis(sections.map(section => groupByType(section.documents)));
  return required - requiredDone;
};

/** Files across all the appendices (the "N ไฟล์" on the tab). */
export const appendixFileCount = (data: GetAppraisalAppendicesResponse | undefined) =>
  (data?.items ?? []).reduce((sum, appendix) => sum + appendix.documents.length, 0);
