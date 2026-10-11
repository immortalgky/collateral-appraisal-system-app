import { useQuery, type QueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ── Types ──────────────────────────────────────────────────
// GET /appraisals/{id}?include=request,documents  (and ?include=documents)
// The appraisal header (unchanged) plus, per include:
//   request   — what a new request is copied from (what was copied before, without its files);
//   documents — every file of the appraisal's request, at request and title level.
// Nullability mirrors the backend DTOs: every column that is nullable in SQL is nullable here.

/** The picked appraisal's own prior book (book 2 -> book 1). Informational; not the reference stamped. */
export interface PriorBook {
  appraisalId: string | null;
  appraisalNumber: string | null;
  appraisalValue: number | null;
  appraisalDate: string | null;
}

export interface PriorRequestLoanDetail {
  bankingSegment: string | null;
  loanApplicationNumber: string | null;
  facilityLimit: number | null;
  additionalFacilityLimit: number | null;
  previousFacilityLimit: number | null;
  totalSellingPrice: number | null;
}

export interface PriorRequestAddress {
  houseNumber: string | null;
  projectName: string | null;
  moo: string | null;
  soi: string | null;
  road: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
}

export interface PriorRequestContact {
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  dealerCode: string | null;
}

export interface PriorRequestDetail {
  hasAppraisalBook: boolean;
  loanDetail: PriorRequestLoanDetail | null;
  address: PriorRequestAddress | null;
  contact: PriorRequestContact | null;
}

export interface PriorRequestCustomer {
  name: string | null;
  contactNumber: string | null;
}

export interface PriorRequestProperty {
  propertyType: string | null;
  buildingType: string | null;
  buildingTypeOther: string | null;
  sellingPrice: number | null;
}

export interface PriorRequestTitle {
  [key: string]: unknown;
}

export interface PriorAppraisalRequest {
  /** The picked appraisal's OWN prior book. The new request's reference comes from the header. */
  prevAppraisal: PriorBook | null;
  detail: PriorRequestDetail;
  customers: PriorRequestCustomer[];
  properties: PriorRequestProperty[];
  titles: PriorRequestTitle[];
}

/**
 * One file of the appraisal's request. `documentType` is the file's own code; `suggestedType` is the
 * code it gets in a new request (D036 for the appraisal summary report, which is stored as D042 or
 * D043, otherwise the same). The form uses `suggestedType`.
 */
export interface AppraisalDocument {
  /** Null for a tracking-only user until the file is released: not a file anyone can carry. */
  documentId: string | null;
  documentType: string;
  suggestedType: string;
  level: 'Request' | 'Title';
  /** The prior request's RequestTitles.Id. Only tells entries apart; titles are matched by key. */
  titleId: string | null;
  /** Title entries: the title's collateral type; with `titleNumber` it is the key a title is matched by. */
  collateralType: string | null;
  /** The number of that collateral type: title number, licence plate, registration or vessel registration. */
  titleNumber: string | null;
  fileName: string;
  filePath: string | null;
  prefix: string | null;
  set: number | null;
  notes: string | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
  /** DocumentTypes.CarryForwardByDefault — false puts the file in the "not used" list from the start. */
  defaultUse: boolean;
}

/** A file that can be carried into a request: it has a document to download. */
export type CarryForwardDocument = AppraisalDocument & { documentId: string };

/** The files that can be carried (a row with no `documentId` cannot be). */
export const carriableDocuments = (
  documents: AppraisalDocument[] | null | undefined,
): CarryForwardDocument[] =>
  (documents ?? []).filter((d): d is CarryForwardDocument => !!d.documentId);

/**
 * The response of `?include=request,documents`: the appraisal header plus `request` and `documents`.
 * The header's own `id`, `appraisalNumber`, `appraisalValue` and `appraisalDate` are what a new
 * request records as its previous appraisal. Status is not enforced by the endpoint.
 */
export interface PriorAppraisal {
  id: string;
  appraisalNumber: string | null;
  /** Masked (null) for a tracking-only user until released. */
  appraisalValue: number | null;
  /** The appraisal (valuation) date: what "วันที่ประเมินครั้งก่อน" means. The API re-derives it on save. */
  appraisalDate: string | null;
  status: string | null;
  /** Null (with a 200) when the appraisal's request part is missing: nothing to copy. */
  request: PriorAppraisalRequest | null;
  documents: AppraisalDocument[];
}

/** The only status a request may be copied from. */
export const CARRYABLE_STATUS = 'Completed';

// ── Reads ──────────────────────────────────────────────────

/**
 * What a pick reads: the appraisal's request data and its files, in one call. Not a hook: called
 * imperatively inside the modal's row-click handler.
 */
export async function fetchPriorAppraisal(appraisalId: string): Promise<PriorAppraisal> {
  const { data } = await axios.get<PriorAppraisal>(
    `/appraisals/${appraisalId}?include=request,documents`,
  );
  return data;
}

/**
 * The inspection round a NEW construction-inspection request copying this appraisal would be.
 * Display-only (the request never stores it), so it is asked for only while it is shown: a prior is
 * set and the purpose is a construction-inspection one. The key carries the prior, so a response for
 * an appraisal picked before is never taken for the current one. A failed read is just no number.
 * GET /appraisals/{id}/next-inspection-number
 */
export const useNextInspectionNumber = (appraisalId: string | null | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['appraisal', appraisalId ?? '', 'next-inspection-number'],
    queryFn: async () => {
      const { data } = await axios.get<{ nextInspectionNumber: number | null }>(
        `/appraisals/${appraisalId}/next-inspection-number`,
      );
      return data.nextInspectionNumber ?? null;
    },
    enabled: enabled && !!appraisalId,
    retry: false,
  });

export interface PriorAppraisalDocuments {
  appraisalNumber: string | null;
  documents: CarryForwardDocument[];
}

export const priorAppraisalKeys = {
  documents: (appraisalId: string) => ['appraisal', appraisalId, 'include', 'documents'] as const,
};

const fetchPriorAppraisalDocuments = async (
  appraisalId: string,
): Promise<PriorAppraisalDocuments> => {
  const { data } = await axios.get<Pick<PriorAppraisal, 'appraisalNumber' | 'documents'>>(
    `/appraisals/${appraisalId}?include=documents`,
  );
  return {
    appraisalNumber: data.appraisalNumber ?? null,
    documents: carriableDocuments(data.documents),
  };
};

/**
 * Imperative read of the files alone. Always asks the server: the list decides which files go into
 * the request, so a copy cached minutes ago (before a file was added or removed) must not. It still
 * writes the cache the hook below reads.
 */
export const loadPriorAppraisalDocuments = (queryClient: QueryClient, appraisalId: string) =>
  queryClient.fetchQuery({
    queryKey: priorAppraisalKeys.documents(appraisalId),
    queryFn: () => fetchPriorAppraisalDocuments(appraisalId),
    staleTime: 0,
  });

/** The files of the request's previous appraisal. Disabled until there is one to ask about. */
export const useGetPriorAppraisalDocuments = (
  appraisalId: string | null | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: priorAppraisalKeys.documents(appraisalId ?? ''),
    queryFn: () => fetchPriorAppraisalDocuments(appraisalId as string),
    enabled: enabled && !!appraisalId,
    // A pick seeds this key with the list it already read, so it is not read again at once
    staleTime: 5 * 60 * 1000,
  });
