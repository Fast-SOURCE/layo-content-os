import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Content Items ───────────────────────────────────────────────────────────

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),

  // ── A. 基础 & 选题层 ──────────────────────────────────────────────────────
  status: mysqlEnum("status", [
    "选题中",
    "脚本中",
    "脚本完成",
    "待审核",
    "待发布",
    "已发布",
  ])
    .default("选题中")
    .notNull(),

  sourceUrl: text("sourceUrl"),
  sourceType: mysqlEnum("sourceType", [
    "PV官网",
    "海外品牌",
    "行业公众号",
    "老板提出",
    "内部经验",
  ]),
  keyword: varchar("keyword", { length: 255 }),

  // ── B. AI 拆解 ────────────────────────────────────────────────────────────
  coreTrend: text("coreTrend"),
  coreViewpoint: text("coreViewpoint"),
  industryProblem: mysqlEnum("industryProblem", [
    "MOQ",
    "成本",
    "开发周期",
    "品牌趋势",
    "供应链效率",
    "客户决策",
  ]),
  availableAngle: text("availableAngle"),

  // ── C. 客户画像 ───────────────────────────────────────────────────────────
  targetCustomer: mysqlEnum("targetCustomer", [
    "初创品牌",
    "成熟品牌",
    "采购",
    "sourcing",
    "设计师",
    "产品经理",
  ]),
  customerStage: mysqlEnum("customerStage", ["起步期", "成长期", "扩张期"]),
  coreConcerns: json("coreConcerns").$type<string[]>(),
  filterIntent: text("filterIntent"),

  // ── D. 脚本 ───────────────────────────────────────────────────────────────
  hook: text("hook"),
  coreExpression: text("coreExpression"),
  conflict: text("conflict"),
  discussionPoint: text("discussionPoint"),

  // ── E. 画面策略 ───────────────────────────────────────────────────────────
  visualStrategy: mysqlEnum("visualStrategy", [
    "实拍",
    "AI生成",
    "混合",
    "素材拼接",
  ]),
  visualPurpose: text("visualPurpose"),
  keyVisuals: text("keyVisuals"),

  // ── F. 素材 ───────────────────────────────────────────────────────────────
  contentFormats: json("contentFormats").$type<string[]>(),
  materialUrl: text("materialUrl"),

  // ── G. 文案 ───────────────────────────────────────────────────────────────
  linkedinCopy: text("linkedinCopy"),
  instagramCopy: text("instagramCopy"),
  youtubeCopy: text("youtubeCopy"),
  cta: text("cta"),

  // ── H. 标题与评论 ─────────────────────────────────────────────────────────
  titleOptions: json("titleOptions").$type<string[]>(),
  finalTitle: varchar("finalTitle", { length: 255 }),
  firstComment: text("firstComment"),

  // ── I. 审核与发布 ─────────────────────────────────────────────────────────
  reviewStatus: mysqlEnum("reviewStatus", [
    "内部通过",
    "待老板确认",
    "已确认",
  ]),
  publishPlatforms: json("publishPlatforms").$type<string[]>(),
  publishTime: timestamp("publishTime"),
  publishUrl: text("publishUrl"),

  // ── Meta ──────────────────────────────────────────────────────────────────
  aiGenerating: mysqlEnum("aiGenerating", ["none", "script", "copy"])
    .default("none")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

// ─── Prompt Templates ─────────────────────────────────────────────────────────────────────────────────

/**
 * Stores customizable AI prompt templates.
 * key: unique identifier, e.g. "script_system" | "copy_system"
 * content: the full prompt text
 */
export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;
