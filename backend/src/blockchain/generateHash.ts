import { createHash } from 'node:crypto';

/**
 * Recursively sorts all keys in an object (or array of objects) to produce
 * a deterministic JSON string suitable for hashing.
 */
export function canonicalSerialize(obj: unknown): string {
  return JSON.stringify(sortKeysDeep(obj));
}

/**
 * Generates a SHA-256 hex digest of a twin profile object.
 * Keys are sorted recursively so the hash is independent of insertion order.
 */
export function generateProfileHash(profile: object): string {
  const canonical = canonicalSerialize(profile);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}
