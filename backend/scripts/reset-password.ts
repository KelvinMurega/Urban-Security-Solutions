// Break-glass password reset for any account (e.g. the only admin is locked out).
// Requires shell access to the server, which is the real authorization boundary here.
//
//   RESET_EMAIL=ops@example.com NEW_PASSWORD='a long passphrase' npx ts-node scripts/reset-password.ts
//
// Enforces the password policy, clears any lockout and revokes every existing session.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { emailSchema, hashPassword, passwordSchema } from '../src/shared/password';

const prisma = new PrismaClient();

async function main() {
  const email = emailSchema.safeParse(process.env.RESET_EMAIL || '');
  const password = passwordSchema.safeParse(process.env.NEW_PASSWORD || '');
  if (!email.success) throw new Error('RESET_EMAIL must be a valid email address');
  if (!password.success) throw new Error(`NEW_PASSWORD: ${password.error.issues.map((issue) => issue.message).join('; ')}`);

  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } });
  if (!user) throw new Error(`No account found for ${email.data}`);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(password.data),
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.auditLog.create({
      data: { action: 'auth.password_reset_cli', entityType: 'auth', entityId: user.id, actorId: null },
    }),
  ]);

  console.log(`Password reset for ${email.data}; all of their sessions were signed out.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
