/**
 * The file name in a Content-Disposition header, or null when there is none.
 *
 * Prefers the RFC 5987 form (`filename*=UTF-8''...`, which is how a Thai name travels) over the
 * plain `filename=` fallback that usually sits beside it.
 */
export const parseFileName = (disposition: string | undefined | null): string | null => {
  if (!disposition) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;\n]+)/i.exec(disposition)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch {
      // fall through to the plain form
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;\n]*)/i.exec(disposition);
  const name = (plain?.[2] ?? plain?.[1])?.trim();
  return name || null;
};
