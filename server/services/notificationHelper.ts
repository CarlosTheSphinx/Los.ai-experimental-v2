import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { eq, and, isNull, or } from "drizzle-orm";

export async function isNotificationEnabled(type: string, tenantId?: number | null): Promise<boolean> {
  try {
    const rows = await db.select().from(systemSettings)
      .where(
        and(
          eq(systemSettings.settingKey, 'notification_preferences'),
          tenantId != null
            ? or(eq(systemSettings.tenantId, tenantId), isNull(systemSettings.tenantId))
            : undefined
        )
      )
      .limit(2);

    const tenantRow = rows.find(r => r.tenantId != null);
    const globalRow = rows.find(r => r.tenantId == null);
    const row = tenantRow || globalRow;

    if (!row?.settingValue) return true;
    const prefs = JSON.parse(row.settingValue);
    return prefs[type] !== false;
  } catch {
    return true;
  }
}
