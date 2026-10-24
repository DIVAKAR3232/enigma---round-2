import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { prisma } from './db';
import { HttpError } from './auth/session';
import { GameActionError } from './game/engine';
import { authRouter } from './routes/auth';
import { gameRouter } from './routes/game';
import { settingsRouter } from './routes/settings';
import { wordsRouter } from './routes/words';
import { playersRouter } from './routes/players';

export function createApp(opts: { clientDir?: string } = {}) {
  const app = express();
  app.set('trust proxy', 1); // Render sits behind one proxy; needed for secure cookies and rate limits.
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '3mb' }));
  app.use(cookieParser());

  // Cross-site form posts cannot send JSON, so requiring it blocks CSRF on top of SameSite cookies.
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: 'Requests must be sent as JSON.' });
      return;
    }
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });

  const api = express.Router();
  api.use(authRouter, gameRouter, settingsRouter, wordsRouter, playersRouter);
  app.use('/api', api);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Serve the built React app with client-side routing fallback.
  const clientDir = opts.clientDir ?? path.resolve(process.cwd(), 'dist/client');
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request.', issues: err.issues });
      return;
    }
    if (err instanceof HttpError || err instanceof GameActionError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Malformed JSON.' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
