export interface ParsedHttpLog {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number | null;
}

/** The one class ASP.NET's HttpLogging middleware (CombineLogs) writes as. Rows with this
 * sourceContext render as "API ขาเข้า" in the table instead of a plain message row. */
export const HTTP_LOGGING_SOURCE_CONTEXT = 'Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware';

export const isHttpLoggingRow = (sourceContext: string | null): boolean =>
  sourceContext === HTTP_LOGGING_SOURCE_CONTEXT;

const FIELD_RE = {
  method: /\bMethod:\s*(\S+)/i,
  path: /\bPath:\s*(\S+)/i,
  statusCode: /\bStatusCode:\s*(\d+)/i,
  duration: /\bDuration:\s*([\d.]+)/i,
};

const DURATION_RE_GLOBAL = /\bDuration:\s*([\d.]+)/gi;

/**
 * Pulls method/path/status/duration out of the HttpLogging message for rows whose sourceContext
 * is HTTP_LOGGING_SOURCE_CONTEXT. The real message (confirmed against dev) is newline-separated:
 * "Method:", "PathBase:", "Path:", "QueryString:", "StatusCode:", then (for non-GET) "RequestBody:",
 * "RequestBodyStatus:", "ResponseBody:", and finally "Duration:" as the LAST line — the response
 * body can itself be multi-line JSON-ish text, so Duration is matched as the *last* occurrence in
 * the message rather than the first, in case the body happens to contain that word too. Returns
 * null on anything that doesn't match, so callers can always fall back to the raw message.
 */
export function parseHttpLogMessage(message: string | null | undefined): ParsedHttpLog | null {
  if (!message) return null;
  const methodMatch = FIELD_RE.method.exec(message);
  const pathMatch = FIELD_RE.path.exec(message);
  const statusMatch = FIELD_RE.statusCode.exec(message);
  if (!methodMatch || !pathMatch || !statusMatch) return null;
  const durationMatches = [...message.matchAll(DURATION_RE_GLOBAL)];
  const durationMatch = durationMatches.at(-1);
  return {
    method: methodMatch[1],
    path: pathMatch[1],
    statusCode: Number(statusMatch[1]),
    durationMs: durationMatch ? Number(durationMatch[1]) : null,
  };
}

/** Tailwind classes for an HTTP status pill — shared by the table row and the drawer's trace tab. */
export const httpStatusClass = (status: number): string =>
  status >= 500
    ? 'bg-red-50 text-red-700'
    : status >= 400
      ? 'bg-amber-50 text-amber-700'
      : 'bg-green-50 text-green-700';
