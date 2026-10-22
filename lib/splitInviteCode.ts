import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 8-character group invite code from a cryptographic RNG (server only). */
export function generateSplitInviteCode(): string {
  return Array.from({ length: 8 }, () =>
    ALPHABET.charAt(randomInt(ALPHABET.length)),
  ).join("");
}
