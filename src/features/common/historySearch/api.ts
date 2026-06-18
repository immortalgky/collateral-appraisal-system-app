import axios from '@shared/api/axiosInstance';
import type {
  HistorySearchQuery,
  HistorySearchResult,
} from './types';

/**
 * POST /history-search
 *
 * Returns geo-filtered appraisal pins (green, internal-only) and
 * market comparable pins (blue, filtered by company for external users).
 * The server enforces visibility — this call just passes the query through.
 */
export async function postHistorySearch(query: HistorySearchQuery): Promise<HistorySearchResult> {
  const { data } = await axios.post<HistorySearchResult>('/history-search', query);
  return data;
}
