import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SUPER_ADMINS = [
  { email: 'carlos@sphinxcap.com', password: 'joytotheworld', firstName: 'Carlos', lastName: 'Admin' },
  { email: 'lance@sphinxcap.com', password: 'joytotheworld', firstName: 'Lance', lastName: 'Admin' },
];

export async function seedSuperAdmins() {
  for (const admin of SUPER_ADMINS) {
    try {
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
          userType: 'admin',
        });
        console.log(`✅ Created super_admin: ${admin.email}`);
      }
    } catch (err) {
      console.error(`❌ Failed to seed ${admin.email}:`, err);
    }
  }
}
