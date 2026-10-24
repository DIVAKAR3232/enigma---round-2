import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db';
import { env, isProduction } from '../env';
import { hashPassword, MIN_PASSWORD_LENGTH, USERNAME_PATTERN, verifyPassword } from '../auth/credentials';
import {
  clearSessionCookie,
  HttpError,
  requireAuth,
  setSessionCookie,
  toPublicUser,
} from '../auth/session';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

const usernameSchema = z
  .string()
  .trim()
  .regex(USERNAME_PATTERN, 'Username must be 3–32 characters: letters, numbers, dot, dash or underscore');
const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128);

// A real hash so failed logins for unknown users take as long as for known users.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomUUID()));

authRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const body = z.object({ username: z.string().trim().min(1), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { username: body.username.toLowerCase() } });
  const ok = await verifyPassword(body.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError(401, 'Incorrect username or password.');
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  setSessionCookie(res, updated);
  res.json({ user: toPublicUser(updated) });
});

authRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get('/auth/me', requireAuth({ allowPasswordChangePending: true }), (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

authRouter.post('/auth/change-password', requireAuth({ allowPasswordChangePending: true }), async (req, res) => {
  const body = z.object({ currentPassword: z.string().min(1), newPassword: newPasswordSchema }).parse(req.body);
  const user = req.user!;
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect.');
  }
  if (body.currentPassword === body.newPassword) {
    throw new HttpError(400, 'Choose a password different from the current one.');
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.newPassword),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });
  setSessionCookie(res, updated);
  res.json({ user: toPublicUser(updated) });
});

// ---------- first-run administrator initialization ----------

async function organizerExists(): Promise<boolean> {
  return (await prisma.user.count({ where: { role: 'ORGANIZER' } })) > 0;
}

function setupTokenRequired(): boolean {
  return Boolean(env().SETUP_TOKEN) || isProduction();
}

function tokenMatches(given: string | undefined): boolean {
  const expected = env().SETUP_TOKEN;
  if (!expected) return !isProduction();
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

authRouter.get('/setup/status', async (_req, res) => {
  const needsSetup = !(await organizerExists());
  res.json({
    needsSetup,
    tokenRequired: setupTokenRequired(),
    // In production without SETUP_TOKEN the web form is disabled; use ADMIN_* env vars or the CLI.
    enabled: needsSetup && (!isProduction() || Boolean(env().SETUP_TOKEN)),
  });
});

const setupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

authRouter.post('/setup', setupLimiter, async (req, res) => {
  const body = z
    .object({
      username: usernameSchema,
      password: newPasswordSchema,
      displayName: z.string().trim().max(60).optional(),
      setupToken: z.string().optional(),
    })
    .parse(req.body);
  if (await organizerExists()) throw new HttpError(409, 'An organizer account already exists. Please log in.');
  if (!tokenMatches(body.setupToken)) throw new HttpError(403, 'Invalid setup token.');

  const user = await prisma.user.create({
    data: {
      username: body.username.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: 'ORGANIZER',
      displayName: body.displayName || null,
      settings: { create: {} },
    },
  });
  setSessionCookie(res, user);
  res.status(201).json({ user: toPublicUser(user) });
});

/** Creates the first organizer from ADMIN_USERNAME / ADMIN_PASSWORD when the database has none. */
export async function bootstrapAdminFromEnv(): Promise<void> {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = env();
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return;
  if (await organizerExists()) return;
  if (!USERNAME_PATTERN.test(ADMIN_USERNAME) || ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH) {
    console.warn('ADMIN_USERNAME / ADMIN_PASSWORD are set but invalid; skipping admin bootstrap.');
    return;
  }
  await prisma.user.create({
    data: {
      username: ADMIN_USERNAME.toLowerCase(),
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: 'ORGANIZER',
      settings: { create: {} },
    },
  });
  console.log(`Created organizer account "${ADMIN_USERNAME.toLowerCase()}" from environment variables.`);
}
