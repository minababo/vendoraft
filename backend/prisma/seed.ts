import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@vendoraft.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@vendoraft.com',
      passwordHash,
    },
  });

  console.log('Seeded admin user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
