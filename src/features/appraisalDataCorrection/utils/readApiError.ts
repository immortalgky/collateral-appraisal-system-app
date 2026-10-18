/**
 * React Query types the mutation's error as `Error`; axios hangs the response body off it. The
 * only thing worth branching on is the backend's stable `errorCode` — the `detail` string is
 * written for logs, so it's a last resort rather than the message users normally see.
 */
export function readApiError(error: Error): { errorCode?: string; detail?: string } {
  const e = error as Error & {
    response?: { data?: { errorCode?: string } };
    apiError?: { detail?: string };
  };
  return { errorCode: e.response?.data?.errorCode, detail: e.apiError?.detail };
}
