/**
 * End-to-end API test against a real PostgreSQL database.
 * Runs only when TEST_DATABASE_URL is set (see README → Tests). The database is wiped first.
 */
import 'dotenv/config';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)('API (PostgreSQL)', () => {
  let app: Express;
  let prisma: PrismaClient;
  let organizer: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-for-hs256-signing';
    process.env.SETUP_TOKEN = 'setup-token-for-tests';
    ({ prisma } = await import('../server/db'));
    const { createApp } = await import('../server/app');
    app = createApp({ clientDir: '__no_client__' });
    await prisma.user.deleteMany();
    organizer = request.agent(app);
  });

  afterAll(async () => {
    const { closeAllStreams } = await import('../server/game/service');
    closeAllStreams();
    await prisma?.$disconnect();
  });

  it('reports health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('protects routes when logged out', async () => {
    expect((await request(app).get('/api/game')).status).toBe(401);
    expect((await request(app).get('/api/settings')).status).toBe(401);
    expect((await request(app).post('/api/game/action').send({ action: 'start' })).status).toBe(401);
  });

  it('initializes the administrator once, with the setup token', async () => {
    expect((await request(app).get('/api/setup/status')).body).toMatchObject({ needsSetup: true, tokenRequired: true });
    const bad = await request(app).post('/api/setup').send({ username: 'admin', password: 'supersecret1', setupToken: 'nope' });
    expect(bad.status).toBe(403);
    const ok = await organizer.post('/api/setup').send({ username: 'Admin', password: 'supersecret1', setupToken: 'setup-token-for-tests' });
    expect(ok.status).toBe(201);
    expect(ok.body.user).toMatchObject({ username: 'admin', role: 'ORGANIZER' });
    const again = await request(app).post('/api/setup').send({ username: 'other', password: 'supersecret1', setupToken: 'setup-token-for-tests' });
    expect(again.status).toBe(409);
  });

  it('stores only a bcrypt hash of the password', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.passwordHash).not.toContain('supersecret1');
  });

  it('logs in and rejects wrong passwords', async () => {
    expect((await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong-pass' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ username: 'ghost', password: 'whatever1' })).status).toBe(401);
    const res = await organizer.post('/api/auth/login').send({ username: 'ADMIN', password: 'supersecret1' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/kbc_session=.*HttpOnly/i);
    expect((await organizer.get('/api/auth/me')).body.user.username).toBe('admin');
  });

  it('rejects non-JSON state changes (CSRF guard)', async () => {
    const res = await organizer.post('/api/game/action').type('form').send('action=start');
    expect(res.status).toBe(415);
  });

  it('runs the game flow: settings → start → pause → resume → next word → reset', async () => {
    const settings = await organizer.put('/api/settings').send({ durationSec: 90 });
    expect(settings.status).toBe(200);
    expect(settings.body.state).toMatchObject({ status: 'READY', durationMs: 90_000, currentWord: null });

    const start = await organizer.post('/api/game/action').send({ action: 'start' });
    expect(start.status).toBe(200);
    expect(start.body.state).toMatchObject({ status: 'RUNNING', round: 1 });
    expect(start.body.state.currentWord).toMatch(/^[A-Z]{5}$/);
    expect(start.body.state.endsAt - start.body.state.serverNow).toBeGreaterThan(89_000);

    const pause = await organizer.post('/api/game/action').send({ action: 'pause' });
    expect(pause.body.state.status).toBe('PAUSED');
    expect(pause.body.state.remainingMs).toBeGreaterThan(85_000);

    expect((await organizer.post('/api/game/action').send({ action: 'pause' })).status).toBe(409);

    const resume = await organizer.post('/api/game/action').send({ action: 'resume' });
    expect(resume.body.state.status).toBe('RUNNING');

    const next = await organizer.post('/api/game/action').send({ action: 'next-word' });
    expect(next.body.state.round).toBe(2);
    expect(next.body.state.currentWord).not.toBe(start.body.state.currentWord);

    const reset = await organizer.post('/api/game/action').send({ action: 'reset' });
    expect(reset.body.state).toMatchObject({ status: 'READY', round: 0, currentWord: null, remainingMs: 90_000 });

    expect((await organizer.post('/api/game/action').send({ action: 'jump' })).status).toBe(400);
  });

  it('ends the game when the timer runs out', async () => {
    await organizer.put('/api/settings').send({ durationSec: 10 });
    await organizer.post('/api/game/action').send({ action: 'start' });
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
    // Pretend the end time has passed.
    await prisma.game.update({ where: { ownerId: admin.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    const res = await organizer.get('/api/game');
    expect(res.body.state).toMatchObject({ status: 'OVER', remainingMs: 0 });
    expect((await organizer.post('/api/game/action').send({ action: 'next-word' })).status).toBe(409);
    const restart = await organizer.post('/api/game/action').send({ action: 'restart' });
    expect(restart.body.state).toMatchObject({ status: 'RUNNING', round: 1 });
    await organizer.post('/api/game/action').send({ action: 'reset' });
  });

  it('pushes live updates over Server-Sent Events', async () => {
    const server: Server = app.listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'supersecret1' });
      const cookie = String(login.headers['set-cookie']![0]).split(';')[0];
      const controller = new AbortController();
      const res = await fetch(`http://127.0.0.1:${port}/api/game/stream`, { headers: { cookie }, signal: controller.signal });
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const waitFor = async (pattern: RegExp) => {
        while (!pattern.test(buffer)) {
          const { value, done } = await reader.read();
          if (done) throw new Error('stream ended');
          buffer += decoder.decode(value);
        }
      };
      await waitFor(/event: state\ndata: .*"status":"READY"/);
      await organizer.post('/api/game/action').send({ action: 'start' });
      await waitFor(/"status":"RUNNING"/);
      controller.abort();
      await organizer.post('/api/game/action').send({ action: 'reset' });
    } finally {
      server.close();
    }
  });

  it('uploads custom word lists and uses them', async () => {
    const bad = await organizer.post('/api/words/lists').send({ name: 'Bad', text: 'cat dog' });
    expect(bad.status).toBe(400);
    const res = await organizer
      .post('/api/words/lists')
      .send({ name: 'Tiny', text: 'apple, brain\nzzqxj cat apple', activate: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ accepted: 2, duplicates: 1, rejectedCount: 2 });

    const lists = await organizer.get('/api/words/lists');
    expect(lists.body.lists).toHaveLength(2);
    expect(lists.body.activeWordListId).toBe(res.body.list.id);

    const seen = new Set<string>();
    const start = await organizer.post('/api/game/action').send({ action: 'start' });
    seen.add(start.body.state.currentWord);
    const next = await organizer.post('/api/game/action').send({ action: 'next-word' });
    seen.add(next.body.state.currentWord);
    expect([...seen].sort()).toEqual(['APPLE', 'BRAIN']);
    await organizer.post('/api/game/action').send({ action: 'reset' });

    expect((await organizer.delete(`/api/words/lists/${res.body.list.id}`).send({})).status).toBe(200);
    expect((await organizer.get('/api/settings')).body.settings.activeWordListId).toBeNull();
  });

  it('creates optional player accounts with one-time temporary passwords', async () => {
    const gen = await organizer.post('/api/players/generate').send({ count: 2, prefix: 'Team' });
    expect(gen.status).toBe(201);
    const [cred] = gen.body.credentials;
    expect(cred.username).toMatch(/^team-[a-z0-9]{5}$/);
    expect(cred.password).toHaveLength(12);

    const list = await organizer.get('/api/players');
    expect(list.body.players).toHaveLength(2);
    expect(JSON.stringify(list.body)).not.toContain(cred.password);

    const player = request.agent(app);
    const login = await player.post('/api/auth/login').send({ username: cred.username, password: cred.password });
    expect(login.body.user).toMatchObject({ role: 'PLAYER', mustChangePassword: true });
    expect((await player.get('/api/game')).status).toBe(403); // must change password first

    const change = await player.post('/api/auth/change-password').send({ currentPassword: cred.password, newPassword: 'player-pass-1' });
    expect(change.status).toBe(200);
    const view = await player.get('/api/game');
    expect(view.status).toBe(200);
    expect(view.body.state.status).toBe('READY');

    // Players can watch but never control the game or reach admin routes.
    expect((await player.post('/api/game/action').send({ action: 'start' })).status).toBe(403);
    expect((await player.get('/api/settings')).status).toBe(403);
    expect((await player.get('/api/players')).status).toBe(403);

    // Resetting the password invalidates the old session.
    const reset = await organizer.post(`/api/players/${cred.id}/reset-password`).send({});
    expect(reset.body.credential.password).toHaveLength(12);
    expect((await player.get('/api/auth/me')).status).toBe(401);

    expect((await organizer.delete(`/api/players/${cred.id}`).send({})).status).toBe(200);
  });

  it('changing the organizer password logs out other sessions', async () => {
    const other = request.agent(app);
    await other.post('/api/auth/login').send({ username: 'admin', password: 'supersecret1' });
    const res = await organizer.post('/api/auth/change-password').send({ currentPassword: 'supersecret1', newPassword: 'evenmoresecret2' });
    expect(res.status).toBe(200);
    expect((await organizer.get('/api/auth/me')).status).toBe(200);
    expect((await other.get('/api/auth/me')).status).toBe(401);
  });
});
