/**
 * Shared JWT signing secret for both the edge middleware and the Node route
 * handlers. A missing JWT_SECRET must fail loudly: falling back to an empty
 * key would let anyone forge a session token signed with the empty string.
 */
export function getJwtSecret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens with an empty key.",
    );
  }
  return new TextEncoder().encode(value);
}
