/**
 * Client-side rule for the block project's Excel uploads, the same as the backend's: .xlsx only,
 * 5 MB for the unit list and the price list (ProjectExcelUpload); the reappraisal endpoints allow 10.
 * Checked before any confirmation or request.
 */
export const MAX_XLSX_UPLOAD_MB = 5;
export const MAX_REAPPRAISAL_XLSX_UPLOAD_MB = 10;

export type XlsxProblem = 'invalidType' | 'tooLarge';

export const checkXlsx = (file: File, maxMb: number): XlsxProblem | null => {
  // endsWith, not a split on '.': a dotless name such as "xlsx" has no extension at all.
  if (!file.name.toLowerCase().endsWith('.xlsx')) return 'invalidType';
  return file.size > maxMb * 1024 * 1024 ? 'tooLarge' : null;
};
