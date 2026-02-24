import { db } from "../db";
import { projects, loanPrograms, partners, adminTasks, systemSettings, users } from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

export async function backfillTenantIds(): Promise<void> {
  const [check] = await db.select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(sql`${projects.tenantId} IS NOT NULL`);

  if (check && Number(check.count) > 0) {
    console.log("[Tenant Backfill] Already has tenant data, skipping backfill");
    return;
  }

  console.log("[Tenant Backfill] Starting tenant ID backfill...");

  const projectsWithPrograms = await db
    .select({
      projectId: projects.id,
      programId: projects.programId,
    })
    .from(projects)
    .where(isNull(projects.tenantId));

  let updatedCount = 0;

  for (const proj of projectsWithPrograms) {
    let tenantId: number | null = null;

    if (proj.programId) {
      const [program] = await db
        .select({ createdBy: loanPrograms.createdBy })
        .from(loanPrograms)
        .where(eq(loanPrograms.id, proj.programId))
        .limit(1);
      if (program?.createdBy) {
        tenantId = program.createdBy;
      }
    }

    if (!tenantId) {
      const [firstAdmin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "super_admin"))
        .limit(1);
      if (firstAdmin) {
        tenantId = firstAdmin.id;
      }
    }

    if (tenantId) {
      await db.update(projects)
        .set({ tenantId })
        .where(eq(projects.id, proj.projectId));
      updatedCount++;
    }
  }

  console.log(`[Tenant Backfill] Updated ${updatedCount} projects with tenant IDs`);

  const [firstAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "super_admin"))
    .limit(1);

  if (firstAdmin) {
    await db.update(partners)
      .set({ tenantId: firstAdmin.id })
      .where(isNull(partners.tenantId));

    await db.update(adminTasks)
      .set({ tenantId: firstAdmin.id })
      .where(isNull(adminTasks.tenantId));

    console.log("[Tenant Backfill] Backfilled partners and admin tasks");
  }

  console.log("[Tenant Backfill] Backfill complete");
}
