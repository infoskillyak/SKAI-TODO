import { PrismaClient, Role, Plan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt();
  const adminPassword = await bcrypt.hash('admin123', salt);
  const userPassword = await bcrypt.hash('user123', salt);

  // Initialize Global Payment Providers
  const paymentProviders = [
    { name: 'RAZORPAY', displayName: 'Razorpay', supportedMethods: ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI'] },
    { name: 'PHONEPE', displayName: 'PhonePe', supportedMethods: ['UPI', 'CARD', 'WALLET', 'NETBANKING'] },
    { name: 'CASHFREE', displayName: 'Cashfree', supportedMethods: ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI'] },
    { name: 'UPI', displayName: 'Direct UPI', supportedMethods: ['UPI'] },
    { name: 'BANK_TRANSFER', displayName: 'Bank Transfer', supportedMethods: ['BANK_TRANSFER'] },
  ];

  for (const provider of paymentProviders) {
    await prisma.globalPaymentProvider.upsert({
      where: { name: provider.name },
      update: {},
      create: {
        name: provider.name,
        displayName: provider.displayName,
        supportedMethods: provider.supportedMethods,
        isEnabled: false,
        isActive: true,
      },
    });
  }
  console.log('Payment providers initialized');

  // Create Organizations first if needed
  const org = await prisma.organization.upsert({
    where: { id: 'test-org-id' },
    update: {},
    create: {
      id: 'test-org-id',
      name: 'SKAI Default Org',
      adminId: 'placeholder',
    },
  });

  // Create SuperAdmin (Global)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@skai.todo' },
    update: {},
    create: {
      email: 'super@skai.todo',
      name: 'SKAI Global SuperAdmin',
      passwordHash: adminPassword,
      role: Role.SUPERADMIN,
      plan: Plan.ENTERPRISE,
      orgId: org.id,
    },
  });

  // Create Org Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skai.todo' },
    update: {},
    create: {
      email: 'admin@skai.todo',
      name: 'Org Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      plan: Plan.TEAM,
      orgId: org.id,
    },
  });

  // Update org adminId
  await prisma.organization.update({
    where: { id: org.id },
    data: { adminId: admin.id },
  });

  // Create Regular User
  await prisma.user.upsert({
    where: { email: 'user@skai.todo' },
    update: {},
    create: {
      email: 'user@skai.todo',
      name: 'Test User',
      passwordHash: userPassword,
      role: Role.USER,
      plan: Plan.PRO,
      orgId: org.id,
    },
  });

  console.log('Seeding complete:');
  console.log('- super@skai.todo / admin123 (SUPERADMIN)');
  console.log('- admin@skai.todo / admin123 (ADMIN)');
  console.log('- user@skai.todo / user123 (USER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
