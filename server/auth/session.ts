import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from '../db';
import { env, isProduction } from '../env';
import type { PublicUser, Role } from '../../shared/types';

export const SESSION_COOKIE = 'kbc_session';

interface TokenPayload {
  sub: string;
  tv: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    mustChangePassword: user.mustChangePassword,
  };
}

export function setSessionCookie(res: Response, user: User): void {
  const hours = env().SESSION_HOURS;
  const token = jwt.sign({ sub: user.id, tv: user.tokenVersion } satisfies TokenPayload, env().JWT_SECRET, {
    expiresIn: Math.round(hours * 3600),
    algorithm: 'HS256',
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    maxAge: hours * 3600 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isProduction(), path: '/' });
}

async function userFromRequest(req: Request): Promise<User | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) return null;
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env().JWT_SECRET, { algorithms: ['HS256'] }) as unknown as TokenPayload;
  } catch {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.tokenVersion !== payload.tv) return null;
  return user;
}

/** Requires a valid session. Accounts with a temporary password can only change it. */
export function requireAuth(opts: { allowPasswordChangePending?: boolean } = {}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = await userFromRequest(req);
    if (!user) throw new HttpError(401, 'Please log in.');
    if (user.mustChangePassword && !opts.allowPasswordChangePending) {
      throw new HttpError(403, 'You must change your temporary password first.');
    }
    req.user = user;
    next();
  };
}

export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new HttpError(401, 'Please log in.');
    if (req.user.role !== role) throw new HttpError(403, 'You do not have access to this.');
    next();
  };
}

/** The organizer whose game this user is allowed to see. */
export function gameOwnerId(user: User): string {
  if (user.role === 'ORGANIZER') return user.id;
  if (!user.organizerId) throw new HttpError(403, 'This player account is not linked to an organizer.');
  return user.organizerId;
}
