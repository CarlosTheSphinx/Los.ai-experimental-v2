
import { db } from "./db";
import { pricingRequests, type InsertPricingRequest, type PricingRequest } from "@shared/schema";

export interface IStorage {
  logPricingRequest(request: InsertPricingRequest): Promise<PricingRequest>;
}

export class DatabaseStorage implements IStorage {
  async logPricingRequest(request: InsertPricingRequest): Promise<PricingRequest> {
    const [log] = await db.insert(pricingRequests).values(request).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
