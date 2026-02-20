// backend/prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'; // <--- Import 'Role' here
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@urbansecurity.com';
  const password = 'admin123';
  
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: Role.ADMIN, // <--- Use the Enum (Type Safe)
      name: 'System Administrator'
    },
    create: {
      email,
      password: hashedPassword,
      name: 'System Administrator',
      role: Role.ADMIN // <--- Use the Enum (Type Safe)
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