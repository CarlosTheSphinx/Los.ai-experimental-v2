import { db } from "../db";
import { projects, loanPrograms, partners, adminTasks, systemSettings, users } from "@shared/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { getTenantId } from "./tenant";

export async function backfillTenantIds(): Promise<void> {
  await db.execute(sql`ALTER TABLE loan_programs ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);

  const [check] = await db.select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(sql`${projects.tenantId} IS NOT NULL`);

  if (check && Number(check.count) > 0) {
    console.log("[Tenant Backfill] Already has tenant data, skipping backfill");
    await backfillLoanProgramTenantIds();
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

  await backfillLoanProgramTenantIds();

  console.log("[Tenant Backfill] Backfill complete");
}

async function backfillLoanProgramTenantIds(): Promise<void> {
  const programsToBackfill = await db.select({ id: loanPrograms.id, createdBy: loanPrograms.createdBy })
    .from(loanPrograms)
    .where(and(isNull(loanPrograms.tenantId), sql`${loanPrograms.createdBy} IS NOT NULL`));

  if (programsToBackfill.length === 0) return;

  let count = 0;
  for (const prog of programsToBackfill) {
    if (!prog.createdBy) continue;
    const [creator] = await db.select({ id: users.id, role: users.role, invitedBy: users.invitedBy })
      .from(users).where(eq(users.id, prog.createdBy)).limit(1);
    if (!creator) continue;
    const tenantId = await getTenantId(creator);
    if (tenantId != null) {
      await db.update(loanPrograms).set({ tenantId }).where(eq(loanPrograms.id, prog.id));
      count++;
    }
  }
  if (count > 0) {
    console.log(`[Tenant Backfill] Backfilled ${count} loan programs with tenant IDs`);
  }
}
