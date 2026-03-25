const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const salt = await bcrypt.genSalt(10);
  
  const adminHash = await bcrypt.hash('admin123', salt);
  const userHash = await bcrypt.hash('user123', salt);

  // Create Org
  const org = await prisma.organization.upsert({
    where: { id: 'test-org' },
    update: {},
    create: {
      id: 'test-org',
      name: 'SKAI Default',
      adminId: 'temp',
    }
  });

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skai.todo' },
    update: { role: 'ADMIN', plan: 'ENTERPRISE' },
    create: {
      email: 'admin@skai.todo',
      name: 'SKAI Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      orgId: org.id
    }
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { adminId: admin.id }
  });

  // Create User
  await prisma.user.upsert({
    where: { email: 'user@skai.todo' },
    update: { role: 'USER', plan: 'PRO' },
    create: {
      email: 'user@skai.todo',
      name: 'Test User',
      passwordHash: userHash,
      role: 'USER',
      plan: 'PRO',
      orgId: org.id
    }
  });

  console.log('Users created successfully');
}

main().catch(console.error);
