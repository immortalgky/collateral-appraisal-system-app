/**
 * Lease-agreement property type codes. Mirrors the backend
 * `PropertyType.IsLeaseAgreement` (LSL / LSB / LS / LSU).
 */
export const LEASE_PROPERTY_TYPES = ['LS', 'LSL', 'LSB', 'LSU'] as const;

export function isLeasePropertyType(propertyType: unknown): boolean {
  return (
    typeof propertyType === 'string' &&
    (LEASE_PROPERTY_TYPES as readonly string[]).includes(propertyType)
  );
}

/**
 * Finds the lease-agreement property within a group. Returns `undefined` when the
 * group has no lease-agreement property.
 */
export function findLeaseProperty<T extends { propertyType?: unknown }>(
  properties: readonly T[] | undefined | null,
): T | undefined {
  return (properties ?? []).find(p => isLeasePropertyType(p.propertyType));
}

/**
 * Finds the property that carries the rental schedule / lease-agreement detail
 * for Leasehold / Profit-Rent. That is either a lease-agreement property
 * (LS/LSL/LSB/LSU) or a plain land (L/LB) flagged "rented out to others"
 * (`isRentedOut === true`). A mixed group only needs *at least one* such
 * property — we pick it explicitly instead of assuming the first element.
 *
 * Returns `undefined` when no rental-bearing property exists.
 */
export function findRentalSourceProperty<
  T extends { propertyType?: unknown; isRentedOut?: unknown },
>(properties: readonly T[] | undefined | null): T | undefined {
  return (properties ?? []).find(
    p => isLeasePropertyType(p.propertyType) || p.isRentedOut === true,
  );
}
