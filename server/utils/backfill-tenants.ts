import { db } from "../db";
import {
  projects, loanPrograms, partners, adminTasks, systemSettings, users,
  funds, pricingRequests, quotePdfTemplates, intakeDeals, intakeDocumentRules,
  commercialFormConfig, teamChats, tenants
} from "@shared/schema";
import { eq, sql, ne } from "drizzle-orm";

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

  totalUpdated += await normalizeTable(users, users.id, users.tenantId, "users", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(funds, funds.id, funds.tenantId, "funds", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(projects, projects.id, projects.tenantId, "projects", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(intakeDeals, intakeDeals.id, intakeDeals.tenantId, "intake_deals", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(loanPrograms, loanPrograms.id, loanPrograms.tenantId, "loan_programs", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(partners, partners.id, partners.tenantId, "partners", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(pricingRequests, pricingRequests.id, pricingRequests.tenantId, "pricing_requests", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(adminTasks, adminTasks.id, adminTasks.tenantId, "admin_tasks", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(commercialFormConfig, commercialFormConfig.id, commercialFormConfig.tenantId, "commercial_form_config", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(intakeDocumentRules, intakeDocumentRules.id, intakeDocumentRules.tenantId, "intake_document_rules", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(quotePdfTemplates, quotePdfTemplates.id, quotePdfTemplates.tenantId, "quote_pdf_templates", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(systemSettings, systemSettings.id, systemSettings.tenantId, "system_settings", SPHINX_CAPITAL_TENANT_ID);
  totalUpdated += await normalizeTable(teamChats, teamChats.id, teamChats.tenantId, "team_chats", SPHINX_CAPITAL_TENANT_ID);

  if (totalUpdated > 0) {
    console.log(`[Tenant Backfill] Total: ${totalUpdated} rows normalized to tenant ${SPHINX_CAPITAL_TENANT_ID}`);
  } else {
    console.log("[Tenant Backfill] All rows already correctly assigned to tenant 1");
  }
}

async function normalizeTable(
  table: { [key: string]: any },
  idCol: any,
  tenantIdCol: any,
  tableName: string,
  targetTenantId: number
): Promise<number> {
  const result = await db.execute(
    sql`UPDATE ${table} SET tenant_id = ${targetTenantId} WHERE tenant_id IS NULL OR tenant_id != ${targetTenantId}`
  );
  const count = Number(result.rowCount ?? 0);
  if (count > 0) {
    console.log(`[Tenant Backfill] Normalized ${count} ${tableName} rows to tenant ${targetTenantId}`);
  }
  return count;
}
