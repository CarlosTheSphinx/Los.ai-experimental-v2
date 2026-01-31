
import { db } from "./db";
import { pricingRequests, savedQuotes, type InsertPricingRequest, type PricingRequest, type InsertSavedQuote, type SavedQuote } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  logPricingRequest(request: InsertPricingRequest): Promise<PricingRequest>;
  saveQuote(quote: InsertSavedQuote): Promise<SavedQuote>;
  getQuotes(): Promise<SavedQuote[]>;
  getQuoteById(id: number): Promise<SavedQuote | undefined>;
  deleteQuote(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async logPricingRequest(request: InsertPricingRequest): Promise<PricingRequest> {
    const [log] = await db.insert(pricingRequests).values(request).returning();
    return log;
  }

  async saveQuote(quote: InsertSavedQuote): Promise<SavedQuote> {
    const [saved] = await db.insert(savedQuotes).values(quote).returning();
    return saved;
  }

  async getQuotes(): Promise<SavedQuote[]> {
    return await db.select().from(savedQuotes).orderBy(desc(savedQuotes.createdAt));
  }

  async getQuoteById(id: number): Promise<SavedQuote | undefined> {
    const [quote] = await db.select().from(savedQuotes).where(eq(savedQuotes.id, id));
    return quote;
  }

  async deleteQuote(id: number): Promise<void> {
    await db.delete(savedQuotes).where(eq(savedQuotes.id, id));
  }
}

export const storage = new DatabaseStorage();
