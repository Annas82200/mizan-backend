/**
 * UUID to Number Converter for Frontend Compatibility
 * Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation
 *
 * Converts UUID strings to consistent numeric IDs for frontend display
 * while maintaining UUID relationships in the database
 */

/**
 * Convert a UUID string to a consistent numeric ID
 * Uses a hash function to ensure the same UUID always produces the same number
 * @param uuid - The UUID string to convert
 * @returns A positive integer ID
 */
export function uuidToNumber(uuid: string | null | undefined): number {
  if (!uuid) return 0; // Return 0 for null/undefined (system tenant)

  // Remove hyphens and take first 8 characters
  const cleanUuid = uuid.replace(/-/g, '').substring(0, 8);

  // Convert hex to number and ensure it's positive
  const num = parseInt(cleanUuid, 16);

  // Ensure the number is within a reasonable range (1 to 999999999)
  const normalized = Math.abs(num % 999999999) + 1;

  return normalized;
}

/**
 * Create a tenant ID map for consistent ID assignment
 * @param tenants - Array of tenants with UUID ids
 * @returns Map of UUID to numeric ID
 */
export function createTenantIdMap(tenants: Array<{ id: string }>): Map<string, number> {
  const idMap = new Map<string, number>();

  tenants.forEach((tenant, index) => {
    // Use index + 1 for sequential IDs, or use hash for consistency
    idMap.set(tenant.id, uuidToNumber(tenant.id));
  });

  return idMap;
}

/**
 * Get numeric tenant ID from UUID
 * @param uuid - The tenant UUID
 * @param fallback - Fallback value if conversion fails
 * @returns Numeric tenant ID
 */
export function getTenantNumericId(uuid: string | null | undefined, fallback: number = 0): number {
  if (!uuid) return fallback;

  try {
    return uuidToNumber(uuid);
  } catch (error) {
    console.error('Failed to convert tenant UUID to number:', error);
    return fallback;
  }
}