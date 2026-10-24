import { Router } from 'express';
import { z } from 'zod';
import type { Settings } from '@prisma/client';
import { prisma } from '../db';
import { HttpError, requireAuth, requireRole } from '../auth/session';
import { applySettings, getSettings } from '../game/service';
import type { SettingsDto } from '../../shared/types';

export const settingsRouter = Router();
settingsRouter.use('/settings', requireAuth(), requireRole('ORGANIZER'));

function toDto(s: Settings): SettingsDto {
  return {
    eventName: s.eventName,
    durationSec: s.durationSec,
    activeWordListId: s.activeWordListId,
    avoidRecent: s.avoidRecent,
    highlightLetters: s.highlightLetters,
  };
}

settingsRouter.get('/settings', async (req, res) => {
  res.json({ settings: toDto(await getSettings(req.user!.id)) });
});

const updateSchema = z.object({
  eventName: z.string().trim().min(1).max(60).optional(),
  durationSec: z.number().int().min(10, 'Minimum duration is 10 seconds').max(3600, 'Maximum duration is 60 minutes').optional(),
  activeWordListId: z.string().nullable().optional(),
  avoidRecent: z.number().int().min(0).max(1000).optional(),
  highlightLetters: z.boolean().optional(),
});

settingsRouter.put('/settings', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const userId = req.user!.id;
  if (body.activeWordListId) {
    const list = await prisma.wordList.findFirst({ where: { id: body.activeWordListId, ownerId: userId } });
    if (!list) throw new HttpError(404, 'Word list not found.');
  }
  await getSettings(userId);
  const settings = await prisma.settings.update({ where: { userId }, data: body });
  const state = await applySettings(userId);
  res.json({ settings: toDto(settings), state });
});
