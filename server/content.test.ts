import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock Context ─────────────────────────────────────────────────────────────
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Content CRUD Tests ───────────────────────────────────────────────────────
describe("content.create", () => {
  it("creates a content item with required keyword", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.content.create({
      keyword: "测试关键词",
      sourceType: "内部经验",
      sourceUrl: null,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
    expect(result.id).toBeGreaterThan(0);
  });

  it("throws when keyword is empty", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.content.create({ keyword: "", sourceType: null, sourceUrl: null })
    ).rejects.toThrow();
  });
});

describe("content.list", () => {
  it("returns an array", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.content.list({ status: null });
    expect(Array.isArray(result)).toBe(true);
  });

  it("filters by status when provided", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.content.list({ status: "选题中" });
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => {
      expect(item.status).toBe("选题中");
    });
  });
});

describe("content.getById", () => {
  it("throws for non-existent id", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.content.getById({ id: 999999 })
    ).rejects.toThrow("Content item not found");
  });
});

describe("content.update", () => {
  it("updates a content item field", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Create first
    const created = await caller.content.create({
      keyword: "更新测试",
      sourceType: null,
      sourceUrl: null,
    });

    // Update
    const updateResult = await caller.content.update({
      id: created.id,
      keyword: "更新后的关键词",
      status: "脚本中",
    });

    expect(updateResult.success).toBe(true);

    // Verify
    const item = await caller.content.getById({ id: created.id });
    expect(item.keyword).toBe("更新后的关键词");
    expect(item.status).toBe("脚本中");
  });
});

describe("content.delete", () => {
  it("deletes a content item", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Create first
    const created = await caller.content.create({
      keyword: "删除测试",
      sourceType: null,
      sourceUrl: null,
    });

    // Delete
    const deleteResult = await caller.content.delete({ id: created.id });
    expect(deleteResult.success).toBe(true);

    // Verify deleted
    await expect(
      caller.content.getById({ id: created.id })
    ).rejects.toThrow("Content item not found");
  });
});

describe("content.seedDemo", () => {
  it("returns skipped when data already exists", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // First call might succeed or skip
    const result = await caller.content.seedDemo();
    expect(result).toHaveProperty("skipped");
    // If not skipped, should have count
    if (!result.skipped) {
      expect((result as any).count).toBeGreaterThan(0);
    }
  });
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});
