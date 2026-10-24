import { describe, expect, it } from 'vitest';
import {
  generateTempPassword,
  generateUsername,
  hashPassword,
  sanitizePrefix,
  verifyPassword,
} from '../server/auth/credentials';
import { formatTime, remainingAt } from '../shared/timer';

describe('credentials', () => {
  it('temporary passwords are 12 chars, mixed, without look-alike characters', () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateTempPassword();
      expect(pw).toHaveLength(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
  });

  it('usernames use a cleaned prefix and a random suffix', () => {
    expect(generateUsername('Team A!')).toMatch(/^teama-[a-z0-9]{5}$/);
    expect(sanitizePrefix('')).toBe('player');
    const names = new Set(Array.from({ length: 200 }, () => generateUsername('p')));
    expect(names.size).toBeGreaterThan(195);
  });

  it('hashes passwords with bcrypt and verifies them', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('timer helpers', () => {
  it('formats m:ss, rounding up partial seconds', () => {
    expect(formatTime(120_000)).toBe('2:00');
    expect(formatTime(59_001)).toBe('1:00');
    expect(formatTime(9_000)).toBe('0:09');
    expect(formatTime(1)).toBe('0:01');
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
  });

  it('computes remaining time per status', () => {
    expect(remainingAt({ status: 'RUNNING', remainingMs: 60_000, endsAt: 10_000 }, 4_000)).toBe(6_000);
    expect(remainingAt({ status: 'RUNNING', remainingMs: 60_000, endsAt: 10_000 }, 20_000)).toBe(0);
    expect(remainingAt({ status: 'PAUSED', remainingMs: 7_000, endsAt: null }, 99_999)).toBe(7_000);
    expect(remainingAt({ status: 'OVER', remainingMs: 7_000, endsAt: null }, 0)).toBe(0);
  });
});
