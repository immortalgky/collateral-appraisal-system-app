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

// ── Construction chain status ──────────────────────────────
// GET /appraisals/{id}/construction-chain-status — what a construction-inspection (06 / 11) request
// that copies this appraisal would run into. Computed live by the API; the submit-time guard there
// is the truth, this only lets the screen say so before the maker fills in the rest.

/** Why the API refuses this appraisal as the prior of a construction-inspection request. */
export type ConstructionBlockReason =
  | 'ConstructionComplete'
  | 'LaterInspectionExists'
  | 'OpenInspectionRequest';

const BLOCK_REASONS: readonly ConstructionBlockReason[] = [
  'ConstructionComplete',
  'LaterInspectionExists',
  'OpenInspectionRequest',
];

export const isConstructionBlockReason = (code: unknown): code is ConstructionBlockReason =>
  (BLOCK_REASONS as readonly unknown[]).includes(code);

/**
 * The reason the API refused a save or submit for, when the refusal is about the prior appraisal's
 * chain: its ProblemDetails `errorCode` (put on `apiError` by the axios interceptor) is the reason.
 * null for any other error.
 */
export const constructionRefusalOf = (error: unknown): ConstructionBlockReason | null => {
  const code = (error as { apiError?: { errorCode?: unknown } } | null)?.apiError?.errorCode;
  return isConstructionBlockReason(code) ? code : null;
};

export interface ConstructionChainStatus {
  appraisalId: string;
  /** The latest construction of the chain (any branch), not necessarily this appraisal's own. */
  construction: {
    status: 'InProgress' | 'Complete' | 'NoData';
    progressPct: number | null;
    /** The appraisal that holds `progressPct`; differs from the picked one when it has no data. */
    sourceAppraisalId: string | null;
    sourceAppraisalNumber: string | null;
    sourceInspectionNumber: number | null;
    sourceCompletedAt: string | null;
  };
  /** A construction inspection completed after this appraisal, in the same chain. */
  laterInspection: {
    appraisalId: string;
    appraisalNumber: string;
    inspectionNumber: number;
    completedAt: string;
  } | null;
  /** A submitted, not yet closed construction-inspection request in the chain. */
  openInspectionRequest: { requestId: string; requestNumber: string } | null;
  /** The newest appraisal of the chain when it is not this one (a re-appraisal after it, say). */
  latestAppraisal: {
    appraisalId: string;
    appraisalNumber: string;
    purposeCode: string;
    completedAt: string;
  } | null;
  blockReason: ConstructionBlockReason | null;
}

/** Imperative read, called inside the search modal's row-click handler. Not cached. */
export async function fetchConstructionChainStatus(
  appraisalId: string,
): Promise<ConstructionChainStatus> {
  const { data } = await axios.get<ConstructionChainStatus>(
    `/appraisals/${appraisalId}/construction-chain-status`,
  );
  return data;
}

export interface PriorAppraisalDocuments {
  appraisalNumber: string | null;
  documents: CarryForwardDocument[];
}

export const priorAppraisalKeys = {
  documents: (appraisalId: string) => ['appraisal', appraisalId, 'include', 'documents'] as const,
  chainStatus: (appraisalId: string) =>
    ['appraisal', appraisalId, 'construction-chain-status'] as const,
};

/**
 * The chain status behind the prior-appraisal banner. A pick seeds this key with the answer it
 * already read, so the banner does not ask again at once; a failed read is just no chip.
 */
export const useConstructionChainStatus = (
  appraisalId: string | null | undefined,
  enabled: boolean,
) =>
  useQuery({
    queryKey: priorAppraisalKeys.chainStatus(appraisalId ?? ''),
    queryFn: () => fetchConstructionChainStatus(appraisalId as string),
    enabled: enabled && !!appraisalId,
    staleTime: 30 * 1000,
    retry: false,
  });

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
