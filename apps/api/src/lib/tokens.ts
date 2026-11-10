import { createHash, randomBytes } from "crypto";

/** Opaque random refresh token (sent to the client in a cookie). */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

/** Only this hash is stored in the database. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}