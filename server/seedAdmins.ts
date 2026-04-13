import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

function getAdminPassword(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback;
}

// Passwords are read from environment variables for security.
// Set ADMIN_PASSWORD_CARLOS and ADMIN_PASSWORD_LANCE in your environment.
// If not set, secure random passwords are generated and logged on first run.
const generatedCarlos = crypto.randomBytes(16).toString('base64url');
const generatedLance = crypto.randomBytes(16).toString('base64url');

const SUPER_ADMINS = [
  { email: 'carlos@sphinxcap.com', password: getAdminPassword('ADMIN_PASSWORD_CARLOS', generatedCarlos), firstName: 'Carlos', lastName: 'Admin', envKey: 'ADMIN_PASSWORD_CARLOS' },
  { email: 'lance@sphinxcap.com', password: getAdminPassword('ADMIN_PASSWORD_LANCE', generatedLance), firstName: 'Lance', lastName: 'Admin', envKey: 'ADMIN_PASSWORD_LANCE' },
];

export async function seedSuperAdmins() {
  for (const admin of SUPER_ADMINS) {
    try {
      if (!process.env[admin.envKey]) {
        console.log(`⚠️  No ${admin.envKey} env var set. Generated password for ${admin.email}: ${admin.password}`);
        console.log(`   Set ${admin.envKey}="${admin.password}" in your Railway variables to persist this.`);
      }
      const passwordHash = await bcrypt.hash(admin.password, 10);
      const [existing] = await db.select().from(users).where(eq(users.email, admin.email));

      if (existing) {
        await db.update(users).set({
          passwordHash,
          role: 'super_admin',
        }).where(eq(users.email, admin.email));
        console.log(`✅ Updated super_admin: ${admin.email}`);
      } else {
        await db.insert(users).values({
          email: admin.email,
          passwordHash,
          role: 'super_admin',
          firstName: admin.firstName,
          lastName: admin.lastName,
          userType: 'super_admin',
        });
        console.log(`✅ Created super_admin: ${admin.email}`);
      }
    } catch (err) {
      console.error(`❌ Failed to seed ${admin.email}:`, err);
    }
  }
}
