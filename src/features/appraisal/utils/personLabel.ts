/**
 * How a person is written on the Administration page (slip and form): "Name (code)" when the name
 * is known, the code alone when it is not, and the name alone only if there is no code.
 */
export const personLabel = (
  name: string | null | undefined,
  code: string | null | undefined,
): string => (name && code ? `${name} (${code})` : code || name || '');
