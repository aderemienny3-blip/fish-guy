import crypto from "node:crypto";

const KEYLEN = 64;

/** Format: scrypt$<saltHex>$<hashHex> */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// Used so a missing account takes as long to check as a real one.
const DUMMY = hashPassword("not-a-real-password");

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const [scheme, saltHex, hashHex] = (stored ?? DUMMY).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected) && stored != null;
}
