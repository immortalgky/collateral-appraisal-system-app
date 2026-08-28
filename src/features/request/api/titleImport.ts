import { useMutation } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { RequestTitleDtoType } from '../schemas/form';

/**
 * Worksheets the importer understands. All real estate shares the Property sheet — the collateral
 * type on each row decides which of its columns apply — while the movables keep their own, because
 * none of their fields overlap with a deed or a building.
 */
export const TITLE_IMPORT_SHEETS = ['Property', 'Vehicle', 'Vessel', 'Machine'] as const;

export type TitleImportSheet = (typeof TITLE_IMPORT_SHEETS)[number];

export interface TitleImportRowError {
  sheet: string;
  /** Spreadsheet row number — row 1 is the header, so this is what the user sees in Excel. */
  rowNumber: number;
  column: string | null;
  message: string;
}

export interface TitleImportRow {
  sheet: string;
  rowNumber: number;
  /** Ready to drop into the `titles` field array, minus the display-only address names. */
  title: Partial<RequestTitleDtoType>;
  subDistrictName: string | null;
  districtName: string | null;
  provinceName: string | null;
  dopaSubDistrictName: string | null;
  dopaDistrictName: string | null;
  dopaProvinceName: string | null;
}

export interface TitleImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: TitleImportRow[];
  errors: TitleImportRowError[];
  /** Worksheets the file carried that the importer does not recognise. */
  ignoredSheets: string[];
}

/**
 * axiosInstance sets a global 10 s timeout, which suits ordinary JSON calls and not a 5 MB workbook
 * over a branch link. Without an override the upload aborts mid-flight and surfaces as a parse
 * failure, sending the user off to fix a file that was never read.
 */
const IMPORT_TIMEOUT_MS = 120_000;

/**
 * Downloads the blank template and hands it to the browser.
 *
 * Returned as a blob rather than a plain link so the request carries the auth header like every
 * other call; an <a href> would hit the endpoint unauthenticated.
 */
export const useDownloadTitleImportTemplate = () =>
  useMutation({
    mutationFn: async (): Promise<void> => {
      const { data } = await axios.get<Blob>('/requests/titles/import-template', {
        responseType: 'blob',
        timeout: IMPORT_TIMEOUT_MS,
      });

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'request-titles-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Deferred, matching the rest of the app (documents.ts, AppointmentLetterButton): revoking in
      // a finally right after click() can pull the blob out from under a browser that is still
      // resolving it, and the download then fails silently.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });

/**
 * Parses an uploaded workbook. Nothing is saved — the response is a preview the user confirms,
 * after which the rows go into the on-screen form and are saved with the request itself.
 */
export const useTitleImportFilePreview = () =>
  useMutation({
    mutationFn: async (file: File): Promise<TitleImportPreview> => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axios.post<TitleImportPreview>(
        '/requests/titles/import-preview',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: IMPORT_TIMEOUT_MS,
        },
      );
      return data;
    },
  });

/** Same parse, same response, for cells pasted straight out of Excel. */
export const useTitleImportPastePreview = () =>
  useMutation({
    mutationFn: async (params: {
      sheet: TitleImportSheet;
      tsv: string;
    }): Promise<TitleImportPreview> => {
      const { data } = await axios.post<TitleImportPreview>(
        '/requests/titles/import-preview/paste',
        params,
        { timeout: IMPORT_TIMEOUT_MS },
      );
      return data;
    },
  });
