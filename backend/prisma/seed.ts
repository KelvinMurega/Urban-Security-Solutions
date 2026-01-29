// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@urbansecurity.com';
  const password = 'admin123';
  
  // 1. Hash the password (Security requirement)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 2. Upsert (Create if not exists, Update if exists)
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword, // Update password if user exists
      role: 'ADMIN',
      name: 'System Administrator'
    },
    create: {
      email,
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN'
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });