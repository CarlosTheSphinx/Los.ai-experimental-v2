import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function getTenantId(user: { id: number; role: string; invitedBy?: number | null }): Promise<number | null> {
  if (user.role === "super_admin") {
    return null;
  }

  if (user.role === "admin" && user.invitedBy == null) {
    return user.id;
  }

  if (user.invitedBy != null) {
    const inviter = await db
      .select({ id: users.id, role: users.role, invitedBy: users.invitedBy })
      .from(users)
      .where(eq(users.id, user.invitedBy))
      .limit(1);

    if (inviter.length > 0) {
      return getTenantId(inviter[0]);
    }
  }

  return user.id;
}
