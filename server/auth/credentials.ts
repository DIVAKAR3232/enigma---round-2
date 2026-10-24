import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// No 0/O, 1/l/I so passwords can be read aloud or copied from a projector without mistakes.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomString(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

/** Temporary password: 12 chars, always mixing upper, lower and digits. */
export function generateTempPassword(length = 12): string {
  for (;;) {
    const pw = randomString(PASSWORD_ALPHABET, length);
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)) return pw;
  }
}

export function sanitizePrefix(prefix: string | undefined): string {
  const clean = (prefix ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  return clean || 'player';
}

export function generateUsername(prefix: string): string {
  return `${sanitizePrefix(prefix)}-${randomString(SUFFIX_ALPHABET, 5)}`;
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
export const MIN_PASSWORD_LENGTH = 8;
