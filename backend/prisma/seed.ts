// backend/prisma/seed.ts
// Creates the FIRST admin account from environment variables. Secure by default:
//  - no built-in/default credentials exist anywhere in the codebase
//  - refuses to run if an admin already exists (never resets an existing password)
//  - enforces the same password policy as the API and never prints the password
//
// Usage:  ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." npm run seed
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { emailSchema, hashPassword, passwordSchema } from '../src/shared/password';

const prisma = new PrismaClient();

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL || '');
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD || '');
  const name = (process.env.ADMIN_NAME || 'System Administrator').trim();

  if (!email.success || !password.success) {
    const problems = [
      ...(email.success ? [] : ['ADMIN_EMAIL must be a valid email address']),
      ...(password.success ? [] : password.error.issues.map((issue) => `ADMIN_PASSWORD: ${issue.message}`)),
    ];
    throw new Error(`Cannot seed admin:\n  - ${problems.join('\n  - ')}`);
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN }, select: { email: true } });
  if (existingAdmin) {
    console.log(`An admin account already exists (${existingAdmin.email}); nothing to do.`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: email.data,
      name,
      password: await hashPassword(password.data),
      passwordChangedAt: new Date(),
      role: Role.ADMIN,
    },
    select: { email: true },
  });

  console.log(`Admin account created for ${admin.email}. Remove ADMIN_PASSWORD from your environment now.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
