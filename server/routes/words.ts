import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { HttpError, requireAuth, requireRole } from '../auth/session';
import { DEFAULT_LIST_NAME, DEFAULT_WORDS } from '../words/defaultWords';
import { parseWordList } from '../words/dictionary';
import { getSettings } from '../game/service';
import type { WordListSummary } from '../../shared/types';

export const wordsRouter = Router();
wordsRouter.use('/words', requireAuth(), requireRole('ORGANIZER'));

wordsRouter.get('/words/lists', async (req, res) => {
  const lists = await prisma.wordList.findMany({ where: { ownerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
  const summaries: WordListSummary[] = [
    { id: null, name: DEFAULT_LIST_NAME, count: DEFAULT_WORDS.length, builtIn: true, createdAt: null },
    ...lists.map((l) => ({
      id: l.id,
      name: l.name,
      count: l.words.length,
      builtIn: false,
      createdAt: l.createdAt.toISOString(),
    })),
  ];
  const settings = await getSettings(req.user!.id);
  res.json({ lists: summaries, activeWordListId: settings.activeWordListId });
});

wordsRouter.get('/words/lists/:id', async (req, res) => {
  if (req.params.id === 'builtin') {
    res.json({ name: DEFAULT_LIST_NAME, words: DEFAULT_WORDS });
    return;
  }
  const list = await prisma.wordList.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
  if (!list) throw new HttpError(404, 'Word list not found.');
  res.json({ name: list.name, words: list.words });
});

wordsRouter.post('/words/lists', async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(1, 'Give the list a name').max(60),
      text: z.string().max(2_000_000),
      allowUnknown: z.boolean().default(false),
      activate: z.boolean().default(false),
    })
    .parse(req.body);
  const parsed = parseWordList(body.text, { allowUnknown: body.allowUnknown });
  if (parsed.accepted.length === 0) {
    res.status(400).json({ error: 'No valid five-letter words were found in the upload.', ...parsed });
    return;
  }
  const list = await prisma.wordList.create({
    data: { ownerId: req.user!.id, name: body.name, words: parsed.accepted },
  });
  if (body.activate) {
    await prisma.settings.update({ where: { userId: req.user!.id }, data: { activeWordListId: list.id } });
  }
  res.status(201).json({
    list: { id: list.id, name: list.name, count: list.words.length, builtIn: false, createdAt: list.createdAt.toISOString() },
    accepted: parsed.accepted.length,
    rejected: parsed.rejected.slice(0, 200),
    rejectedCount: parsed.rejected.length,
    duplicates: parsed.duplicates,
  });
});

wordsRouter.delete('/words/lists/:id', async (req, res) => {
  const userId = req.user!.id;
  const list = await prisma.wordList.findFirst({ where: { id: req.params.id, ownerId: userId } });
  if (!list) throw new HttpError(404, 'Word list not found.');
  await prisma.$transaction([
    prisma.settings.updateMany({ where: { userId, activeWordListId: list.id }, data: { activeWordListId: null } }),
    prisma.wordList.delete({ where: { id: list.id } }),
  ]);
  res.json({ ok: true });
});
