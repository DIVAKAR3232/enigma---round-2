import { Router } from 'express';
import { z } from 'zod';
import { GAME_ACTIONS } from '../../shared/types';
import { gameOwnerId, requireAuth, requireRole } from '../auth/session';
import { getSnapshot, performAction, sendEvent, subscribe } from '../game/service';

export const gameRouter = Router();

gameRouter.get('/game', requireAuth(), async (req, res) => {
  res.json({ state: await getSnapshot(gameOwnerId(req.user!)) });
});

/** Live updates for organizer, projector and player screens. */
gameRouter.get('/game/stream', requireAuth(), async (req, res) => {
  const ownerId = gameOwnerId(req.user!);
  const snapshot = await getSnapshot(ownerId);

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 2000\n\n');
  sendEvent(res, snapshot);

  const unsubscribe = subscribe(ownerId, res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

gameRouter.post('/game/action', requireAuth(), requireRole('ORGANIZER'), async (req, res) => {
  const { action } = z.object({ action: z.enum(GAME_ACTIONS) }).parse(req.body);
  res.json({ state: await performAction(req.user!.id, action) });
});
