export function shouldAutoDefault(args: { value: unknown; isDirty: boolean }) {
  const { value, isDirty } = args;
  const empty = value == null || value === '';
  return empty || !isDirty;
}
