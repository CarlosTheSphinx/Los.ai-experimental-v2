
import { db } from "./db";
import { 
  pricingRequests, savedQuotes, documents, signers, documentFields, documentAuditLog, users,
  type InsertPricingRequest, type PricingRequest, type InsertSavedQuote, type SavedQuote,
  type Document, type InsertDocument, type Signer, type InsertSigner,
  type DocumentField, type InsertDocumentField, type DocumentAuditLog, type InsertDocumentAuditLog,
  type User, type InsertUser
} from "@shared/schema";
import { desc, eq, and, gt } from "drizzle-orm";

export interface IStorage {
  // User methods
  createUser(user: Omit<InsertUser, 'id' | 'createdAt'>): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  
  logPricingRequest(request: InsertPricingRequest): Promise<PricingRequest>;
  saveQuote(quote: InsertSavedQuote, userId: number): Promise<SavedQuote>;
  getQuotes(userId: number): Promise<SavedQuote[]>;
  getQuoteById(id: number, userId: number): Promise<SavedQuote | undefined>;
  deleteQuote(id: number, userId: number): Promise<void>;
  
  // Document methods
  createDocument(doc: InsertDocument, userId: number): Promise<Document>;
  getDocuments(userId: number): Promise<Document[]>;
  getDocumentById(id: number, userId?: number): Promise<Document | undefined>;
  getDocumentsByQuoteId(quoteId: number, userId: number): Promise<Document[]>;
  updateDocumentStatus(id: number, status: string, completedAt?: Date): Promise<Document | undefined>;
  updateDocument(id: number, updates: Partial<Document>, userId?: number): Promise<Document | undefined>;
  deleteDocument(id: number, userId: number): Promise<void>;
  
  // Signer methods
  createSigner(signer: InsertSigner): Promise<Signer>;
  getSignersByDocumentId(documentId: number): Promise<Signer[]>;
  getSignerById(id: number): Promise<Signer | undefined>;
  getSignerByToken(token: string): Promise<Signer | undefined>;
  updateSigner(id: number, updates: Partial<Signer>): Promise<Signer | undefined>;
  deleteSigner(id: number): Promise<void>;
  deleteSignersByDocumentId(documentId: number): Promise<void>;
  
  // Field methods
  createField(field: InsertDocumentField): Promise<DocumentField>;
  getFieldsByDocumentId(documentId: number): Promise<DocumentField[]>;
  getFieldsBySignerId(signerId: number): Promise<DocumentField[]>;
  updateField(id: number, updates: Partial<DocumentField>): Promise<DocumentField | undefined>;
  deleteField(id: number): Promise<void>;
  deleteFieldsByDocumentId(documentId: number): Promise<void>;
  
  // Audit log methods
  createAuditLog(log: InsertDocumentAuditLog): Promise<DocumentAuditLog>;
  getAuditLogsByDocumentId(documentId: number): Promise<DocumentAuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async createUser(user: Omit<InsertUser, 'id' | 'createdAt'>): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.passwordResetToken, token),
        gt(users.passwordResetExpires, new Date())
      )
    );
    return user;
  }

  async logPricingRequest(request: InsertPricingRequest): Promise<PricingRequest> {
    const [log] = await db.insert(pricingRequests).values(request).returning();
    return log;
  }

  async saveQuote(quote: InsertSavedQuote, userId: number): Promise<SavedQuote> {
    const [saved] = await db.insert(savedQuotes).values({ ...quote, userId }).returning();
    return saved;
  }

  async getQuotes(userId: number): Promise<SavedQuote[]> {
    return await db.select().from(savedQuotes).where(eq(savedQuotes.userId, userId)).orderBy(desc(savedQuotes.createdAt));
  }

  async getQuoteById(id: number, userId: number): Promise<SavedQuote | undefined> {
    const [quote] = await db.select().from(savedQuotes).where(
      and(eq(savedQuotes.id, id), eq(savedQuotes.userId, userId))
    );
    return quote;
  }

  async deleteQuote(id: number, userId: number): Promise<void> {
    await db.delete(savedQuotes).where(
      and(eq(savedQuotes.id, id), eq(savedQuotes.userId, userId))
    );
  }

  // Document methods
  async createDocument(doc: InsertDocument, userId: number): Promise<Document> {
    const [created] = await db.insert(documents).values({ ...doc, userId }).returning();
    return created;
  }

  async getDocuments(userId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentById(id: number, userId?: number): Promise<Document | undefined> {
    if (userId !== undefined) {
      const [doc] = await db.select().from(documents).where(
        and(eq(documents.id, id), eq(documents.userId, userId))
      );
      return doc;
    }
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByQuoteId(quoteId: number, userId: number): Promise<Document[]> {
    return await db.select().from(documents).where(
      and(eq(documents.quoteId, quoteId), eq(documents.userId, userId))
    ).orderBy(desc(documents.createdAt));
  }

  async updateDocumentStatus(id: number, status: string, completedAt?: Date): Promise<Document | undefined> {
    const updates: Partial<Document> = { status };
    if (completedAt) updates.completedAt = completedAt;
    const [updated] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    return updated;
  }

  async updateDocument(id: number, updates: Partial<Document>, userId?: number): Promise<Document | undefined> {
    if (userId !== undefined) {
      const [updated] = await db.update(documents).set(updates).where(
        and(eq(documents.id, id), eq(documents.userId, userId))
      ).returning();
      return updated;
    }
    const [updated] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: number, userId: number): Promise<void> {
    const doc = await this.getDocumentById(id, userId);
    if (!doc) return;
    
    await db.delete(documentAuditLog).where(eq(documentAuditLog.documentId, id));
    await db.delete(documentFields).where(eq(documentFields.documentId, id));
    await db.delete(signers).where(eq(signers.documentId, id));
    await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
  }

  // Signer methods
  async createSigner(signer: InsertSigner): Promise<Signer> {
    const [created] = await db.insert(signers).values(signer).returning();
    return created;
  }

  async getSignersByDocumentId(documentId: number): Promise<Signer[]> {
    return await db.select().from(signers).where(eq(signers.documentId, documentId)).orderBy(signers.signingOrder);
  }

  async getSignerById(id: number): Promise<Signer | undefined> {
    const [signer] = await db.select().from(signers).where(eq(signers.id, id));
    return signer;
  }

  async getSignerByToken(token: string): Promise<Signer | undefined> {
    const [signer] = await db.select().from(signers).where(eq(signers.token, token));
    return signer;
  }

  async updateSigner(id: number, updates: Partial<Signer>): Promise<Signer | undefined> {
    const [updated] = await db.update(signers).set(updates).where(eq(signers.id, id)).returning();
    return updated;
  }

  async deleteSigner(id: number): Promise<void> {
    await db.delete(documentFields).where(eq(documentFields.signerId, id));
    await db.delete(signers).where(eq(signers.id, id));
  }

  async deleteSignersByDocumentId(documentId: number): Promise<void> {
    await db.delete(signers).where(eq(signers.documentId, documentId));
  }

  // Field methods
  async createField(field: InsertDocumentField): Promise<DocumentField> {
    const [created] = await db.insert(documentFields).values(field).returning();
    return created;
  }

  async getFieldsByDocumentId(documentId: number): Promise<DocumentField[]> {
    return await db.select().from(documentFields).where(eq(documentFields.documentId, documentId));
  }

  async getFieldsBySignerId(signerId: number): Promise<DocumentField[]> {
    return await db.select().from(documentFields).where(eq(documentFields.signerId, signerId));
  }

  async updateField(id: number, updates: Partial<DocumentField>): Promise<DocumentField | undefined> {
    const [updated] = await db.update(documentFields).set(updates).where(eq(documentFields.id, id)).returning();
    return updated;
  }

  async getFieldById(id: number): Promise<DocumentField | undefined> {
    const [field] = await db.select().from(documentFields).where(eq(documentFields.id, id));
    return field;
  }

  async deleteField(id: number): Promise<void> {
    await db.delete(documentFields).where(eq(documentFields.id, id));
  }

  async deleteFieldsByDocumentId(documentId: number): Promise<void> {
    await db.delete(documentFields).where(eq(documentFields.documentId, documentId));
  }

  // Audit log methods
  async createAuditLog(log: InsertDocumentAuditLog): Promise<DocumentAuditLog> {
    const [created] = await db.insert(documentAuditLog).values(log).returning();
    return created;
  }

  async getAuditLogsByDocumentId(documentId: number): Promise<DocumentAuditLog[]> {
    return await db.select().from(documentAuditLog).where(eq(documentAuditLog.documentId, documentId)).orderBy(desc(documentAuditLog.createdAt));
  }
}

export const storage = new DatabaseStorage();
