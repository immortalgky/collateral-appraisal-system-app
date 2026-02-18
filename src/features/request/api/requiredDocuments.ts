import { useQuery } from '@tanstack/react-query';
import type {
  GetRequiredDocumentsParams,
  GetRequiredDocumentsResponse,
  RequiredDocumentConfig,
} from '../types/document';

// Mock data: purpose -> required documents
const REQUIRED_DOCS_BY_PURPOSE: Record<string, RequiredDocumentConfig[]> = {
  '01': [{ documentType: 'D005', displayName: 'ID Card' }],
  '02': [
    { documentType: 'D002', displayName: 'Registration Document' },
    { documentType: 'D005', displayName: 'ID Card' },
  ],
  '03': [{ documentType: 'D003', displayName: 'Invoice' }],
  '04': [{ documentType: 'D006', displayName: 'Certificate' }],
};

// Mock data: collateralType -> required documents
const REQUIRED_DOCS_BY_COLLATERAL: Record<string, RequiredDocumentConfig[]> = {
  L: [{ documentType: 'D001', displayName: 'Title Deed' }],
  LB: [
    { documentType: 'D001', displayName: 'Title Deed' },
    { documentType: 'D004', displayName: 'Building Plan' },
  ],
  B: [
    { documentType: 'D004', displayName: 'Building Plan' },
    { documentType: 'D002', displayName: 'Registration Document' },
  ],
  U: [
    { documentType: 'D001', displayName: 'Title Deed' },
    { documentType: 'D002', displayName: 'Registration Document' },
  ],
  VEH: [
    { documentType: 'D002', displayName: 'Registration Document' },
    { documentType: 'D003', displayName: 'Invoice' },
  ],
  MAC: [
    { documentType: 'D003', displayName: 'Invoice' },
    { documentType: 'D006', displayName: 'Certificate' },
  ],
  LSL: [
    { documentType: 'D001', displayName: 'Title Deed' },
    { documentType: 'D006', displayName: 'Certificate' },
  ],
  LS: [
    { documentType: 'D001', displayName: 'Title Deed' },
    { documentType: 'D004', displayName: 'Building Plan' },
    { documentType: 'D006', displayName: 'Certificate' },
  ],
  LSB: [
    { documentType: 'D004', displayName: 'Building Plan' },
    { documentType: 'D006', displayName: 'Certificate' },
  ],
};

/**
 * Hook for fetching required documents based on purpose or collateral type
 * Uses mock data - to be replaced with real API later
 */
export const useGetRequiredDocuments = (params: GetRequiredDocumentsParams) => {
  return useQuery({
    queryKey: ['requiredDocuments', params],
    queryFn: async (): Promise<GetRequiredDocumentsResponse> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200));

      if (params.purpose) {
        return { documents: REQUIRED_DOCS_BY_PURPOSE[params.purpose] || [] };
      }
      if (params.collateralType) {
        return { documents: REQUIRED_DOCS_BY_COLLATERAL[params.collateralType] || [] };
      }
      return { documents: [] };
    },
    enabled: !!(params.purpose || params.collateralType),
  });
};
