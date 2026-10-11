import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { AppraisalProvider } from '../context/AppraisalContext';
import RequestDocumentsSection from './RequestDocumentsSection';

const item = (id: string, over = {}) => ({
  id,
  documentId: null,
  documentType: 'D013',
  documentTypeName: 'Title deed',
  fileName: null,
  filePath: null,
  notes: null,
  isRequired: true,
  uploadedBy: null,
  uploadedByName: null,
  uploadedAt: null,
  ...over,
});
const section = (
  titleId: string | null,
  titleIdentifier: string | null,
  collateralType: string | null,
  label: string,
) => ({
  titleId,
  titleIdentifier,
  collateralType,
  collateralTypeName: 'English type name',
  sectionLabel: label,
  totalDocuments: 1,
  uploadedDocuments: 0,
  documents: [item(`i-${titleId ?? 'req'}`)],
});

const manyNumbers = Array.from({ length: 50 }, (_, i) => 1000 + i).join(',');

vi.mock('@features/appraisal/api', () => ({
  useGetRequestDocuments: () => ({
    data: {
      totalDocuments: 3,
      totalUploaded: 0,
      sections: [
        section(null, null, null, 'Application Documents'),
        section('a', '-', '03', 'Land with buildings · Title Number -'),
        section('b', manyNumbers, '08', `Condominium · Title Number ${manyNumbers}`),
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/features/request/api/documentTypes', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/request/api/documentTypes')>()),
  useGetDocumentTypes: () => ({ data: [] }),
}));
vi.mock('@/features/request/api/documents', () => ({ useViewDocument: () => vi.fn() }));
vi.mock('@/features/appraisal/utils/marketComparableFormat', () => ({ thumbnailUrl: () => '' }));

describe('RequestDocumentsSection', () => {
  it("names a title section like the Request card, not by the API's English label, and shortens a condo's number list", () => {
    render(
      <AppraisalProvider
        value={{
          appraisal: { appraisalId: 'A1', requestId: 'R1' },
          isLoading: false,
          isError: false,
          error: null,
        }}
      >
        <RequestDocumentsSection />
      </AppraisalProvider>,
    );
    expect(screen.getByRole('button', { name: /Title - .*\(#1\)/ })).toBeInTheDocument();
    // a condo is named by its first number and how many follow, never the whole list
    expect(screen.getByRole('button', { name: /Title 1000 \+49 .*\(#2\)/ })).toBeInTheDocument();
    expect(screen.queryByText(/Title Number/)).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(manyNumbers.slice(0, 30)))).not.toBeInTheDocument();
  });
});
