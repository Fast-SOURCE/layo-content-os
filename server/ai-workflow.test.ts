import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock LLM ────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
const mockInvokeLLM = vi.mocked(invokeLLM);

function createMockContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Workflow 1: generateScript ───────────────────────────────────────────────
describe("content.generateScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates script and updates item on success", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test item
    const created = await caller.content.create({
      keyword: "AI脚本生成测试",
      sourceType: "内部经验",
      sourceUrl: null,
    });

    // Mock LLM response with valid JSON
    const mockScriptResponse = {
      core_trend: "小单快反趋势正在重塑供应链格局",
      core_viewpoint: "品牌方需要更灵活的供应链合作伙伴",
      industry_problem: "MOQ",
      available_angle: "从供应商视角解读品牌痛点",
      target_customer: "初创品牌",
      customer_stage: "起步期",
      core_concerns: ["MOQ", "成本"],
      filter_intent: "寻找小单起订的供应商",
      hook: "你的品牌还在为最低起订量发愁吗？",
      core_expression: "LAYO 支持 50 件起订，让你的创意不再受限",
      conflict: "大工厂要求 500 件起订，但初创品牌往往只需要 50 件验证市场",
      discussion_point: "你认为小单快反会成为未来供应链的主流模式吗？",
      visual_strategy: "实拍",
      visual_purpose: "展示工厂实拍，增强信任感",
      key_visuals: "工厂生产线、面料细节、成品展示",
    };

    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockScriptResponse) } }],
    } as any);

    // Trigger script generation
    await caller.content.generateScript({ id: created.id });

    // Verify the item was updated
    const updated = await caller.content.getById({ id: created.id });
    // generateScript sets status to 脚本完成 after successful generation
    expect(updated.status).toBe("脚本完成");
    expect(updated.hook).toBe("你的品牌还在为最低起订量发愁吗？");
    expect(updated.coreTrend).toBe("小单快反趋势正在重塑供应链格局");
    expect(updated.targetCustomer).toBe("初创品牌");
    expect(updated.aiGenerating).toBe("none");

    // Cleanup
    await caller.content.delete({ id: created.id });
  });

  it("handles invalid JSON from LLM gracefully", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.content.create({
      keyword: "JSON错误测试",
      sourceType: null,
      sourceUrl: null,
    });

    // Mock LLM returning invalid JSON
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "这不是有效的JSON格式" } }],
    } as any);

    // Should throw
    await expect(
      caller.content.generateScript({ id: created.id })
    ).rejects.toThrow();

    // Cleanup
    await caller.content.delete({ id: created.id });
  });

  it("handles LLM call failure gracefully", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.content.create({
      keyword: "LLM调用失败测试",
      sourceType: null,
      sourceUrl: null,
    });

    // Mock LLM throwing error
    mockInvokeLLM.mockRejectedValueOnce(new Error("LLM service unavailable"));

    // Should throw
    await expect(
      caller.content.generateScript({ id: created.id })
    ).rejects.toThrow();

    // Cleanup
    await caller.content.delete({ id: created.id });
  });
});

// ─── Workflow 2: generateCopy ─────────────────────────────────────────────────
describe("content.generateCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates copy and updates item on success", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test item with script already done
    const created = await caller.content.create({
      keyword: "AI文案生成测试",
      sourceType: "PV官网",
      sourceUrl: null,
    });

    // Set status to 脚本完成
    await caller.content.update({ id: created.id, status: "脚本完成" });

    // Mock LLM response for copy generation
    const mockCopyResponse = {
      linkedin_copy: "LinkedIn 专业文案内容，面向供应链从业者...",
      instagram_copy: "Instagram 视觉文案，简洁有力 #fashion #supply",
      youtube_copy: "YouTube 视频描述，详细介绍 LAYO 的小单快反优势...",
      cta: "点击主页链接，获取免费样品报价",
      titles: [
        "小单快反：初创品牌的供应链新选择",
        "50件起订，让你的创意快速落地",
        "为什么越来越多的品牌选择小单模式？",
        "供应链革命：从大批量到小单快反",
        "LAYO 如何帮助初创品牌降低库存风险",
      ],
      first_comment: "想了解更多关于小单快反的信息？欢迎私信我们，获取专属报价方案！",
    };

    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockCopyResponse) } }],
    } as any);

    // Trigger copy generation
    await caller.content.generateCopy({ id: created.id });

    // Verify the item was updated
    const updated = await caller.content.getById({ id: created.id });
    expect(updated.linkedinCopy).toBe("LinkedIn 专业文案内容，面向供应链从业者...");
    expect(updated.instagramCopy).toContain("Instagram");
    expect(updated.youtubeCopy).toContain("YouTube");
    expect(updated.cta).toBe("点击主页链接，获取免费样品报价");
    expect(Array.isArray(updated.titleOptions)).toBe(true);
    expect((updated.titleOptions as string[]).length).toBe(5);
    expect(updated.firstComment).toBe("想了解更多关于小单快反的信息？欢迎私信我们，获取专属报价方案！");
    expect(updated.aiGenerating).toBe("none");

    // Cleanup
    await caller.content.delete({ id: created.id });
  });

  it("handles LLM failure in copy generation", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.content.create({
      keyword: "文案LLM失败测试",
      sourceType: null,
      sourceUrl: null,
    });

    mockInvokeLLM.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    await expect(
      caller.content.generateCopy({ id: created.id })
    ).rejects.toThrow();

    // Verify aiGenerating is reset to 'none' after failure
    const afterError = await caller.content.getById({ id: created.id });
    expect(afterError.aiGenerating).toBe("none");

    // Cleanup
    await caller.content.delete({ id: created.id });
  });

  it("handles invalid JSON from LLM in copy generation", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.content.create({
      keyword: "文案JSON错误测试",
      sourceType: null,
      sourceUrl: null,
    });

    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "这不是有效JSON" } }],
    } as any);

    await expect(
      caller.content.generateCopy({ id: created.id })
    ).rejects.toThrow();

    // Verify aiGenerating is reset to 'none' after failure
    const afterError = await caller.content.getById({ id: created.id });
    expect(afterError.aiGenerating).toBe("none");

    // Cleanup
    await caller.content.delete({ id: created.id });
  });
});

// ── Error Recovery Tests ─────────────────────────────────────────────────────────────────────────────────────
describe("AI Workflow error recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generateScript resets aiGenerating to none on LLM failure", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.content.create({
      keyword: "脚本失败状态恢复测试",
      sourceType: null,
      sourceUrl: null,
    });

    mockInvokeLLM.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      caller.content.generateScript({ id: created.id })
    ).rejects.toThrow();

    // aiGenerating must be reset to 'none' so UI doesn't get stuck
    const recovered = await caller.content.getById({ id: created.id });
    expect(recovered.aiGenerating).toBe("none");

    // Cleanup
    await caller.content.delete({ id: created.id });
  });
});
