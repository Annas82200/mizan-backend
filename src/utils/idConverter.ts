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
  if (!uuid) return 1; // Return 1 for null/undefined (default ID)

  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    // For non-UUID strings, create a hash based on string content
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 999999999) + 1;
  }

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
export function getTenantNumericId(uuid: string | null | undefined, fallback: number = 1): number {
  if (!uuid) return fallback > 0 ? fallback : 1; // Ensure we never return 0 or negative

  try {
    const result = uuidToNumber(uuid);
    return result > 0 ? result : (fallback > 0 ? fallback : 1); // Always return positive number
  } catch (error) {
    logger.error('Failed to convert tenant UUID to number:', error);
    return fallback > 0 ? fallback : 1;
  }
}