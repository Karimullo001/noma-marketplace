import crypto from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Ambiguity-free characters (no 0/O, 1/I)

/**
 * Generates a cryptographically random one-time seller invitation code.
 * Example: NOMA-7K4M-9P2X
 */
export function generateOneTimeSellerCode(): string {
  const bytes = crypto.randomBytes(8);
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    part2 += CODE_ALPHABET[bytes[i + 4] % CODE_ALPHABET.length];
  }
  return `NOMA-${part1}-${part2}`;
}

/**
 * Hashes an invitation code with SHA-256 and a server-side pepper.
 * Plaintext codes are never stored in the database.
 */
export function hashInvitationCode(plaintextCode: string): string {
  const normalized = plaintextCode.trim().toUpperCase();
  const pepper =
    process.env.CODE_HASH_PEPPER ||
    process.env.INVITATION_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "noma-pepper-fallback";
  return crypto
    .createHmac("sha256", pepper)
    .update(normalized)
    .digest("hex");
}

export function getCodePrefix(plaintextCode: string): string {
  const normalized = plaintextCode.trim().toUpperCase();
  if (normalized.length <= 9) return `${normalized.slice(0, 4)}****`;
  return `${normalized.slice(0, 9)}-****`;
}
