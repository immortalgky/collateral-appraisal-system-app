import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      /**
       * The default is 3 retries, which means a failing request is sent four times. That is
       * wrong for most of the failures we actually see:
       *
       *   - a 4xx returns the same answer every time. A 400 from a rejected sort field, a 403,
       *     a 404 — none of them become a 200 on the second attempt.
       *   - a 401 is already handled one layer down: the axios interceptor refreshes the token
       *     and replays the request once, so retrying here only repeats work that was done.
       *   - a request we cancelled ourselves (a superseded search) is not a failure at all.
       *
       * What is left worth retrying is a network blip or a 5xx, and two attempts past the first
       * is plenty. On an endpoint that is expensive to serve, retrying a timeout is actively
       * harmful — it multiplies load precisely when the server is already struggling.
       */
      retry: (failureCount, error) => {
        // Both shapes of "we stopped this on purpose": the raw axios cancellation, and the one
        // blobTransfer translates it into so screens can tell a cancelled transfer from a failed
        // one. No transfer sits in a queryFn today, so the second arm is a guard against the next
        // one that does rather than a live path. Matched by name on purpose: importing the class
        // from blobTransfer would close a cycle back through axiosInstance to this file.
        if (axios.isCancel(error) || (error as Error)?.name === 'TransferCancelledError')
          return false;

        const RETRYABLE_4XX = [408, 425, 429];
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (
          status !== undefined &&
          status >= 400 &&
          status < 500 &&
          !RETRYABLE_4XX.includes(status)
        )
          return false;

        return failureCount < 2;
      },
    },
  },
});
