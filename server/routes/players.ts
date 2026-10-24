import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { HttpError, requireAuth, requireRole } from '../auth/session';
import { generateTempPassword, generateUsername, hashPassword } from '../auth/credentials';
import type { GeneratedCredential } from '../../shared/types';

export const playersRouter = Router();
playersRouter.use('/players', requireAuth(), requireRole('ORGANIZER'));

playersRouter.get('/players', async (req, res) => {
  const players = await prisma.user.findMany({
    where: { organizerId: req.user!.id, role: 'PLAYER' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, displayName: true, mustChangePassword: true, createdAt: true, lastLoginAt: true },
  });
  res.json({ players });
});

/** Creates player accounts. Plain passwords are returned only in this response and never stored. */
playersRouter.post('/players/generate', async (req, res) => {
  const body = z
    .object({
      count: z.number().int().min(1).max(100),
      prefix: z.string().max(12).optional(),
      names: z.array(z.string().trim().max(60)).max(100).optional(),
    })
    .parse(req.body);

  const created: GeneratedCredential[] = [];
  for (let i = 0; i < body.count; i++) {
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    for (let attempt = 0; ; attempt++) {
      const username = generateUsername(body.prefix ?? 'player');
      try {
        const user = await prisma.user.create({
          data: {
            username,
            passwordHash,
            role: 'PLAYER',
            displayName: body.names?.[i] || null,
            mustChangePassword: true,
            organizerId: req.user!.id,
          },
        });
        created.push({ id: user.id, username, password });
        break;
      } catch (err) {
        const duplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!duplicate || attempt >= 5) throw err;
      }
    }
  }
  res.status(201).json({ credentials: created });
});

playersRouter.post('/players/:id/reset-password', async (req, res) => {
  const player = await prisma.user.findFirst({ where: { id: req.params.id, organizerId: req.user!.id, role: 'PLAYER' } });
  if (!player) throw new HttpError(404, 'Player not found.');
  const password = generateTempPassword();
  await prisma.user.update({
    where: { id: player.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, tokenVersion: { increment: 1 } },
  });
  const credential: GeneratedCredential = { id: player.id, username: player.username, password };
  res.json({ credential });
});

playersRouter.delete('/players/:id', async (req, res) => {
  const result = await prisma.user.deleteMany({ where: { id: req.params.id, organizerId: req.user!.id, role: 'PLAYER' } });
  if (result.count === 0) throw new HttpError(404, 'Player not found.');
  res.json({ ok: true });
});
