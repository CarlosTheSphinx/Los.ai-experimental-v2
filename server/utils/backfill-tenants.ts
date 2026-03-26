import { db } from "../db";
import {
  projects, loanPrograms, partners, adminTasks, systemSettings, users,
  funds, pricingRequests, quotePdfTemplates, intakeDeals, intakeDocumentRules,
  commercialFormConfig, teamChats, tenants
} from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

export async function backfillTenantIds(): Promise<void> {
  const SPHINX_CAPITAL_TENANT_ID = 1;

  const [existingTenant] = await db.select().from(tenants).where(eq(tenants.id, SPHINX_CAPITAL_TENANT_ID));
  if (!existingTenant) {
    await db.insert(tenants).values({
      id: SPHINX_CAPITAL_TENANT_ID,
      name: "Sphinx Capital",
      slug: "sphinx-capital",
      isActive: true,
    });
    await db.execute(sql`SELECT setval('tenants_id_seq', GREATEST((SELECT MAX(id) FROM tenants), 1))`);
    console.log("[Tenant Backfill] Created Sphinx Capital tenant (id=1)");
  }

  let totalUpdated = 0;

  const usersResult = await db.update(users)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(users.tenantId))
    .returning({ id: users.id });
  if (usersResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${usersResult.length} users to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += usersResult.length;
  }

  const fundsResult = await db.update(funds)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(funds.tenantId))
    .returning({ id: funds.id });
  if (fundsResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${fundsResult.length} funds to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += fundsResult.length;
  }

  const projectsResult = await db.update(projects)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(projects.tenantId))
    .returning({ id: projects.id });
  if (projectsResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${projectsResult.length} projects to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += projectsResult.length;
  }

  const dealsResult = await db.update(intakeDeals)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(intakeDeals.tenantId))
    .returning({ id: intakeDeals.id });
  if (dealsResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${dealsResult.length} intake_deals to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += dealsResult.length;
  }

  const programsResult = await db.update(loanPrograms)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(loanPrograms.tenantId))
    .returning({ id: loanPrograms.id });
  if (programsResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${programsResult.length} loan_programs to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += programsResult.length;
  }

  const partnersResult = await db.update(partners)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(partners.tenantId))
    .returning({ id: partners.id });
  if (partnersResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${partnersResult.length} partners to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += partnersResult.length;
  }

  const pricingResult = await db.update(pricingRequests)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(pricingRequests.tenantId))
    .returning({ id: pricingRequests.id });
  if (pricingResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${pricingResult.length} pricing_requests to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += pricingResult.length;
  }

  const tasksResult = await db.update(adminTasks)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(adminTasks.tenantId))
    .returning({ id: adminTasks.id });
  if (tasksResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${tasksResult.length} admin_tasks to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += tasksResult.length;
  }

  const formConfigResult = await db.update(commercialFormConfig)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(commercialFormConfig.tenantId))
    .returning({ id: commercialFormConfig.id });
  if (formConfigResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${formConfigResult.length} commercial_form_config to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += formConfigResult.length;
  }

  const docRulesResult = await db.update(intakeDocumentRules)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(intakeDocumentRules.tenantId))
    .returning({ id: intakeDocumentRules.id });
  if (docRulesResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${docRulesResult.length} intake_document_rules to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += docRulesResult.length;
  }

  const templatesResult = await db.update(quotePdfTemplates)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(quotePdfTemplates.tenantId))
    .returning({ id: quotePdfTemplates.id });
  if (templatesResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${templatesResult.length} quote_pdf_templates to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += templatesResult.length;
  }

  const settingsResult = await db.update(systemSettings)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(systemSettings.tenantId))
    .returning({ id: systemSettings.id });
  if (settingsResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${settingsResult.length} system_settings to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += settingsResult.length;
  }

  const chatsResult = await db.update(teamChats)
    .set({ tenantId: SPHINX_CAPITAL_TENANT_ID })
    .where(isNull(teamChats.tenantId))
    .returning({ id: teamChats.id });
  if (chatsResult.length > 0) {
    console.log(`[Tenant Backfill] Assigned ${chatsResult.length} team_chats to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
    totalUpdated += chatsResult.length;
  }

  if (totalUpdated > 0) {
    console.log(`[Tenant Backfill] Total: ${totalUpdated} rows backfilled to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
  } else {
    console.log("[Tenant Backfill] All rows already have tenant IDs assigned");
  }
}
