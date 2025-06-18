/**
 * Generates a random alphanumeric ID
 */
function generateRandomId(length: number = 16): string {
  return Math.random().toString(36).substring(2, 2 + length) + 
         Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generates a session ID
 */
export function generateSessionId(): string {
  return generateRandomId(16);
}

/**
 * Generates a snapshot ID
 */
export function generateSnapshotId(): string {
  return generateRandomId(12);
}

/**
 * Generates a generic UUID-like ID
 */
export function generateId(): string {
  return generateRandomId(8);
}