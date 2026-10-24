import { env } from './env';
import { createApp } from './app';
import { prisma } from './db';
import { bootstrapAdminFromEnv } from './routes/auth';
import { closeAllStreams } from './game/service';

async function main() {
  const config = env();
  await prisma.$connect();
  await bootstrapAdminFromEnv();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`Keyboard Ball Challenge server listening on port ${config.PORT} (${config.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    closeAllStreams();
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
