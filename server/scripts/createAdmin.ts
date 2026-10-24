/**
 * Creates or resets an organizer account from the command line.
 *   npm run admin:create -- <username> <password>
 * On Render: open the service Shell and run the same command.
 */
import 'dotenv/config';
import { prisma } from '../db';
import { hashPassword, MIN_PASSWORD_LENGTH, USERNAME_PATTERN } from '../auth/credentials';

async function main() {
  const [rawUsername, password] = process.argv.slice(2);
  if (!rawUsername || !password) {
    console.error('Usage: npm run admin:create -- <username> <password>');
    process.exit(1);
  }
  const username = rawUsername.toLowerCase();
  if (!USERNAME_PATTERN.test(username)) throw new Error('Username must be 3–32 characters: letters, numbers, . _ -');
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: 'ORGANIZER', mustChangePassword: false, organizerId: null, tokenVersion: { increment: 1 } },
    create: { username, passwordHash, role: 'ORGANIZER', settings: { create: {} } },
  });
  console.log(`Organizer "${user.username}" is ready. You can now log in.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
