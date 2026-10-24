# Keyboard Ball Challenge

Projector display and organizer controls for a **physical** college event game: a participant throws a real ball at a physical keyboard target while the projector shows the target word, a QWERTY reference and a countdown.

The app **only displays the game and gives the organizer controls**. It does not simulate throws, detect hits, use a camera, or judge any attempt. There are no "correct hit" or "wrong hit" buttons.

## Features

- **Projector Mode**: full-screen, high-contrast arcade display: event name, round number, status, a large countdown, the five-letter target word in huge tiles, and a large QWERTY keyboard (letters of the current word can be highlighted). READY screen before the start and GAME OVER screen when time runs out. START / PAUSE / RESUME / RESTART panel that can be hidden (H) for a clean picture. NEXT WORD is never shown here.
- **Organizer Mode**: START, PAUSE, RESUME, RESTART, **NEXT WORD**, RESET GAME (with confirmation), PROJECTOR MODE, EXIT, a live preview of the projector, quick duration presets and keyboard shortcuts.
- **Server-owned timer**: the server stores the end time; every screen (organizer laptop, projector window, player phones) shows the same countdown, survives page reloads, network blips and server restarts.
- **Random words**: built-in list of nearly 600 common five-letter English words, each checked against a 270,000-word English dictionary in the tests. Recently used words are avoided (configurable). Custom word lists can be uploaded (.txt/.csv) and are validated against the dictionary (with an option to allow non-dictionary words). Upcoming words are never chosen in advance, so they cannot leak to the projector.
- **Secure login**: first-administrator setup (token-protected or from environment variables), bcrypt password hashing, HttpOnly session cookies, protected API routes and pages, login rate limiting, sessions invalidated on password change.
- **Optional player accounts**: generate usernames and temporary passwords in bulk, copy them or download a CSV. Passwords are shown only once and must be changed at first login. Players get a read-only live view.
- **Render ready**: `render.yaml`, migrations, health check, environment-based secrets.

## Tech stack

React 19 · Vite · TypeScript · Tailwind CSS 4 · Node.js · Express 5 · PostgreSQL · Prisma ORM · Vitest

```
server/            Express API
  game/engine.ts     pure game state machine (start/pause/resume/restart/next-word/reset)
  game/service.ts    persistence, live updates (Server-Sent Events), auto GAME OVER
  routes/            auth + setup, game, settings, words, players
  words/             built-in word list, dictionary validation, upload parser
  auth/              password hashing, credential generation, sessions
shared/            types and timer helpers used by both sides
src/               React app (pages, components, hooks)
prisma/            schema and SQL migrations
tests/             unit, component and API integration tests
```

## Local setup

Requirements: **Node.js 20.19+** and **PostgreSQL 14+**.

```bash
npm install
```

Create a `.env` from the example and fill in `DATABASE_URL` and `JWT_SECRET`:

```bash
cp .env.example .env
```

Create the database tables:

```bash
npm run db:deploy
```

Start the API (port 3001) and the Vite dev server (port 5173) together:

```bash
npm run dev
```

Open <http://localhost:5173>. With no organizer yet, the login page links to **/setup** where you create the administrator (locally no setup token is needed unless you set `SETUP_TOKEN`). You can also create one from the command line:

```bash
npm run admin:create -- admin MyStrongPassword
```

> npm 11 may block package install scripts by default. If `npm install` warns about install scripts for `prisma`, `@prisma/client`, `@prisma/engines` or `esbuild`, the approvals are already listed under `allowScripts` in `package.json`; run `npm rebuild` once, then `npx prisma generate`.

### Production build locally

```bash
npm run build
npm start
```

The server then serves the built site and the API on <http://localhost:3001>.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | API with auto-reload + Vite dev server |
| `npm run build` | Builds the React app to `dist/client` and the server to `dist/server` |
| `npm start` | Runs the built server |
| `npm run start:prod` | Applies migrations, then runs the built server (used on Render) |
| `npm test` | Runs all tests |
| `npm run typecheck` | TypeScript checks for client and server |
| `npm run db:migrate` | Creates a new migration after editing `prisma/schema.prisma` (development) |
| `npm run db:deploy` | Applies migrations |
| `npm run admin:create -- <user> <password>` | Creates an organizer or resets its password |

## Running the event

1. **Log in** as the organizer.
2. **Settings**: set the game duration (10 s – 60 min), event name, word list and how many recent words to avoid.
3. Connect the laptop to the projector by **HDMI or wireless display** and choose **Extend** (Windows: `Win + P` → Extend; macOS: System Settings → Displays → turn off Mirror).
4. Click **PROJECTOR MODE**. A separate window opens: drag it onto the projector screen and press **FULL SCREEN** (or `F`). Press `H` to hide its control bar for a clean picture.
5. Keep **Organizer Mode** on the laptop screen. When the participant is ready press **START** (or `Space`). A random word appears and the countdown runs.
6. The participant plays physically according to the event rules. Press **NEXT WORD** (or `N`) whenever the rules say to move on. The app never decides whether a throw counted.
7. At zero every screen shows **GAME OVER**. Press **RESET GAME** (back to READY) or **RESTART** (starts a fresh timer immediately) for the next participant.

Mirroring a single screen also works: open Projector Mode in the same browser tab and use its START / PAUSE / RESUME / RESTART buttons; use Organizer Mode on another device (phone or second laptop logged in as the organizer) for NEXT WORD.

| Shortcut | Organizer Mode | Projector Mode |
|---|---|---|
| `Space` | start / pause / resume | start / pause / resume |
| `N` | next word | — |
| `P` | open projector window | — |
| `F` | — | full screen |
| `H` | — | hide / show controls |

## Tests

```bash
npm test
```

- `tests/engine.test.ts`: state machine: transitions, pause/resume timing, expiry, word rotation without repeats.
- `tests/words.test.ts`: every built-in word is five letters, unique, and present in the English dictionary; upload parsing.
- `tests/credentials.test.ts`: temporary passwords, usernames, bcrypt hashing, timer formatting.
- `tests/components.test.tsx`: keyboard, game screen (READY/GAME OVER, no hit buttons), control panels (projector has no NEXT WORD).
- `tests/api.test.ts`: full API flow against a real PostgreSQL database: setup, login, protection, CSRF guard, game flow, auto GAME OVER, live updates, word uploads, player accounts and session invalidation. It runs only when `TEST_DATABASE_URL` is set and **wipes that database**, so point it at a separate one:

```bash
createdb kbc_test
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/kbc_test npx prisma migrate deploy
# then set TEST_DATABASE_URL in .env and run npm test
```

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for step-by-step GitHub → Render instructions, environment variables and plan notes.

## Security notes

- Passwords are hashed with bcrypt (cost 12). Plain passwords are never stored or logged; generated player passwords are returned once in the API response that creates them.
- Sessions are signed JWTs in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Changing or resetting a password invalidates existing sessions.
- State-changing requests must be JSON, which blocks cross-site form posts on top of the SameSite cookie.
- Login and setup endpoints are rate limited. Unknown usernames take as long to reject as wrong passwords.
- The first-organizer setup page requires `SETUP_TOKEN` in production and stops working once an organizer exists.
- Helmet sets security headers; all secrets come from environment variables.
