export interface PayloadRefs {
  eventId?: string;
  appraisalNumber?: string;
}

/** The ids worth copying out of an outbound payload: `eventId` and `data.appraisalNumber`. */
export const parsePayloadRefs = (payload: string | null | undefined): PayloadRefs => {
  if (!payload) return {};
  try {
    const json = JSON.parse(payload) as { eventId?: unknown; data?: { appraisalNumber?: unknown } };
    const text = (v: unknown) =>
      typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;
    return { eventId: text(json?.eventId), appraisalNumber: text(json?.data?.appraisalNumber) };
  } catch {
    return {};
  }
};

export interface JsonToken {
  text: string;
  /** True for an object key (a string followed by a colon). */
  key: boolean;
}

/**
 * Splits pretty-printed JSON into plain runs and keys so the keys can be coloured. Returns React
 * text only (never HTML), so a payload can contain anything.
 */
export const tokenizeJson = (pretty: string): JsonToken[] => {
  const tokens: JsonToken[] = [];
  let last = 0;
  for (const m of pretty.matchAll(/"(?:[^"\\]|\\.)*"(?=\s*:)/g)) {
    if (m.index > last) tokens.push({ text: pretty.slice(last, m.index), key: false });
    tokens.push({ text: m[0], key: true });
    last = m.index + m[0].length;
  }
  if (last < pretty.length) tokens.push({ text: pretty.slice(last), key: false });
  return tokens;
};
