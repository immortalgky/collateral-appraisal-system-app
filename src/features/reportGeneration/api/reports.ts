import axios from '@shared/api/axiosInstance';

/**
 * Fetches a report PDF as a Blob (Bearer auth auto-attached by axiosInstance).
 */
export const fetchReportPdf = async (
  reportTypeKey: string,
  entityId: string,
): Promise<Blob> => {
  const response = await axios.get(`/reports/${reportTypeKey}/${entityId}`, {
    params: { download: false },
    responseType: 'blob',
  });
  return response.data as Blob;
};

/**
 * Fetches the PDF and triggers a browser download.
 * Mirrors exportUserAccessReport in userManagement/api/reports.ts.
 */
export const downloadReportPdf = async (
  reportTypeKey: string,
  entityId: string,
): Promise<void> => {
  const response = await axios.get(`/reports/${reportTypeKey}/${entityId}`, {
    params: { download: true },
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  const url = URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportTypeKey}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
