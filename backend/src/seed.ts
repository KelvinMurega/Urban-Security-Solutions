// backend/src/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Define the Admin details
  const email = 'admin@urbansecurity.com';
  const password = 'admin123'; // We will hash this
  const name = 'Chief Commander';

  // 2. Hash the password (Security First!)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create the User in the Database
  try {
    const user = await prisma.user.upsert({
      where: { email: email },
      update: {}, // If exists, do nothing
      create: {
        email,
        name,
        password: hashedPassword,
        role: Role.ADMIN, // <--- Key part: Making them an Admin
      },
    });

    console.log('✅ Admin User created successfully!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 ID: ${user.id}`);

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();