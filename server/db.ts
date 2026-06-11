import { eq, desc, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, contentItems, InsertContentItem, ContentItem, promptTemplates, PromptTemplate } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Content Items ─────────────────────────────────────────────────────────────

export async function listContentItems(statusFilter?: string | null): Promise<ContentItem[]> {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && statusFilter !== "all") {
    return db.select().from(contentItems)
      .where(eq(contentItems.status, statusFilter as ContentItem["status"]))
      .orderBy(desc(contentItems.updatedAt));
  }
  return db.select().from(contentItems).orderBy(desc(contentItems.updatedAt));
}

export async function getContentItemById(id: number): Promise<ContentItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  return result[0];
}

export async function createContentItem(data: InsertContentItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentItems).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateContentItem(id: number, data: Partial<InsertContentItem>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentItems).set(data).where(eq(contentItems.id, id));
}

export async function deleteContentItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contentItems).where(eq(contentItems.id, id));
}

export async function bulkInsertContentItems(items: InsertContentItem[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(contentItems).values(items);
}

export async function countContentItems(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(contentItems);
  return result.length;
}

// ─── Prompt Templates ─────────────────────────────────────────────────────────

export async function getPromptTemplate(key: string): Promise<PromptTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promptTemplates).where(eq(promptTemplates.key, key)).limit(1);
  return result[0];
}

export async function getAllPromptTemplates(): Promise<PromptTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promptTemplates);
}

export async function upsertPromptTemplate(key: string, label: string, content: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(promptTemplates)
    .values({ key, label, content })
    .onDuplicateKeyUpdate({ set: { content, label } });
}

export async function deletePromptTemplate(key: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(promptTemplates).where(eq(promptTemplates.key, key));
}
