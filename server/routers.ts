import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  listContentItems,
  getContentItemById,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  bulkInsertContentItems,
  countContentItems,
  getPromptTemplate,
  getAllPromptTemplates,
  upsertPromptTemplate,
  deletePromptTemplate,
} from "./db";
import { storagePut } from "./storage";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const StatusEnum = z.enum(["选题中", "脚本中", "脚本完成", "待审核", "待发布", "已发布"]);
const SourceTypeEnum = z.enum(["PV官网", "海外品牌", "行业公众号", "老板提出", "内部经验"]);

const ContentUpdateInput = z.object({
  id: z.number(),
  status: StatusEnum.optional(),
  sourceUrl: z.string().optional().nullable(),
  sourceType: SourceTypeEnum.optional().nullable(),
  keyword: z.string().optional().nullable(),
  coreTrend: z.string().optional().nullable(),
  coreViewpoint: z.string().optional().nullable(),
  industryProblem: z.enum(["MOQ", "成本", "开发周期", "品牌趋势", "供应链效率", "客户决策"]).optional().nullable(),
  availableAngle: z.string().optional().nullable(),
  targetCustomer: z.enum(["初创品牌", "成熟品牌", "采购", "sourcing", "设计师", "产品经理"]).optional().nullable(),
  customerStage: z.enum(["起步期", "成长期", "扩张期"]).optional().nullable(),
  coreConcerns: z.array(z.string()).optional().nullable(),
  filterIntent: z.string().optional().nullable(),
  hook: z.string().optional().nullable(),
  coreExpression: z.string().optional().nullable(),
  conflict: z.string().optional().nullable(),
  discussionPoint: z.string().optional().nullable(),
  visualStrategy: z.enum(["实拍", "AI生成", "混合", "素材拼接"]).optional().nullable(),
  visualPurpose: z.string().optional().nullable(),
  keyVisuals: z.string().optional().nullable(),
  contentFormats: z.array(z.string()).optional().nullable(),
  materialUrl: z.string().optional().nullable(),
  linkedinCopy: z.string().optional().nullable(),
  instagramCopy: z.string().optional().nullable(),
  youtubeCopy: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  titleOptions: z.array(z.string()).optional().nullable(),
  finalTitle: z.string().optional().nullable(),
  firstComment: z.string().optional().nullable(),
  reviewStatus: z.enum(["内部通过", "待老板确认", "已确认"]).optional().nullable(),
  publishPlatforms: z.array(z.string()).optional().nullable(),
  publishTime: z.date().optional().nullable(),
  publishUrl: z.string().optional().nullable(),
});

// ─── AI Prompt Templates ─────────────────────────────────────────────────────

const SCRIPT_SYSTEM_PROMPT = `你是 LAYO 的内容策略 AI，LAYO 是一家专注于小单快反、柔性供应链的服装制造商，目标是在 LinkedIn/Instagram/YouTube 上吸引海外品牌主、采购和设计师。

你的任务是根据给定的选题关键词和来源信息，生成一份完整的内容脚本策略，包括：趋势拆解、客户画像、脚本结构和画面策略。

请严格按照以下 JSON schema 输出，不要输出任何额外文字：
{
  "core_trend": "核心趋势（1-2句话）",
  "core_viewpoint": "核心观点（1-2句话）",
  "industry_problem": "行业痛点，必须是以下之一：MOQ|成本|开发周期|品牌趋势|供应链效率|客户决策",
  "available_angle": "可用切入角度（2-3个方向）",
  "target_customer": "目标客户类型，必须是以下之一：初创品牌|成熟品牌|采购|sourcing|设计师|产品经理",
  "customer_stage": "客户阶段，必须是以下之一：起步期|成长期|扩张期",
  "core_concerns": ["关注点1", "关注点2"],
  "filter_intent": "筛选意图（这条内容希望筛选出什么样的客户）",
  "hook": "开场钩子（前3秒必须抓住注意力的一句话）",
  "core_expression": "核心表达（内容主体，150-200字）",
  "conflict": "冲突反差（制造认知冲突的核心句子）",
  "discussion_point": "讨论点（引发评论互动的问题或观点）",
  "visual_strategy": "画面策略，必须是以下之一：实拍|AI生成|混合|素材拼接",
  "visual_purpose": "画面目的（画面要传达什么）",
  "key_visuals": "关键画面描述（3-5个具体画面）"
}`;

const COPY_SYSTEM_PROMPT = `你是 LAYO 的多平台文案 AI，专门为 LinkedIn、Instagram、YouTube 生成高质量的内容文案。

LAYO 是一家专注于小单快反、柔性供应链的服装制造商，目标客户是海外品牌主、采购和设计师。

文案要求：
- LinkedIn：专业、真实、有行业洞察，500-800字，有数据或案例支撑
- Instagram：简短有画面感，150-250字，多用换行，配合视觉内容
- YouTube：清晰直给，200-350字，前30字必须是强力钩子，无明显 AI 腔
- 封面标题：5个备选，每个3-8个词，有冲突感和行业感
- 首条评论：不销售，像补充信息，引导讨论或私信，100-150字

请严格按照以下 JSON schema 输出，不要输出任何额外文字：
{
  "linkedin_copy": "LinkedIn 文案全文",
  "instagram_copy": "Instagram 文案全文",
  "youtube_copy": "YouTube 文案全文",
  "cta": "行动号召语（1句话）",
  "titles": ["标题1", "标题2", "标题3", "标题4", "标题5"],
  "first_comment": "首条评论文案"
}`;

// ─── Router ───────────────────────────────────────────────────────────────────

const settingsRouter = router({
  getPrompts: publicProcedure.query(async () => {
    const rows = await getAllPromptTemplates();
    const rowMap = Object.fromEntries(rows.map((r) => [r.key, r]));
    return {
      script_system: {
        key: "script_system" as const,
        label: "脚本生成 Prompt",
        content: rowMap["script_system"]?.content ?? SCRIPT_SYSTEM_PROMPT,
        isCustomized: !!rowMap["script_system"],
        updatedAt: rowMap["script_system"]?.updatedAt ?? null,
      },
      copy_system: {
        key: "copy_system" as const,
        label: "文案生成 Prompt",
        content: rowMap["copy_system"]?.content ?? COPY_SYSTEM_PROMPT,
        isCustomized: !!rowMap["copy_system"],
        updatedAt: rowMap["copy_system"]?.updatedAt ?? null,
      },
    };
  }),
  savePrompt: publicProcedure
    .input(z.object({
      key: z.enum(["script_system", "copy_system"]),
      content: z.string().min(10, "Prompt 内容不能少于 10 个字符"),
    }))
    .mutation(async ({ input }) => {
      const labels: Record<string, string> = {
        script_system: "脚本生成 Prompt",
        copy_system: "文案生成 Prompt",
      };
      await upsertPromptTemplate(input.key, labels[input.key], input.content);
      return { success: true };
    }),
  resetPrompt: publicProcedure
    .input(z.object({ key: z.enum(["script_system", "copy_system"]) }))
    .mutation(async ({ input }) => {
      await deletePromptTemplate(input.key);
      return { success: true };
    }),
  getDefaultPrompt: publicProcedure
    .input(z.object({ key: z.enum(["script_system", "copy_system"]) }))
    .query(({ input }) => ({
      content: input.key === "script_system" ? SCRIPT_SYSTEM_PROMPT : COPY_SYSTEM_PROMPT,
    })),
});

export const appRouter = router({
  system: systemRouter,
  settings: settingsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  content: router({
    // ── List ──────────────────────────────────────────────────────────────────
    list: publicProcedure
      .input(z.object({ status: z.string().optional().nullable() }).optional())
      .query(async ({ input }) => {
        return listContentItems(input?.status);
      }),

    // ── Get by ID ─────────────────────────────────────────────────────────────
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const item = await getContentItemById(input.id);
        if (!item) throw new Error("Content item not found");
        return item;
      }),

    // ── Create ────────────────────────────────────────────────────────────────
    create: publicProcedure
      .input(z.object({
        keyword: z.string().min(1, "关键词不能为空"),
        sourceUrl: z.string().optional().nullable(),
        sourceType: SourceTypeEnum.optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const id = await createContentItem({
          keyword: input.keyword,
          sourceUrl: input.sourceUrl ?? null,
          sourceType: input.sourceType ?? null,
          status: "选题中",
          aiGenerating: "none",
        });
        return { id };
      }),

    // ── Update ────────────────────────────────────────────────────────────────
    update: publicProcedure
      .input(ContentUpdateInput)
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateContentItem(id, data as any);
        return { success: true };
      }),

    // ── Delete ────────────────────────────────────────────────────────────────
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteContentItem(input.id);
        return { success: true };
      }),

    // ── AI Workflow 1: Generate Script ────────────────────────────────────────
    generateScript: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const item = await getContentItemById(input.id);
        if (!item) throw new Error("Content item not found");

        // Mark as generating
        await updateContentItem(input.id, { aiGenerating: "script", status: "脚本中" });

        try {
          const userPrompt = `请根据以下选题信息生成内容脚本策略：

关键词：${item.keyword || "（未填写）"}
来源类型：${item.sourceType || "（未填写）"}
来源链接：${item.sourceUrl || "（未填写）"}

请结合 LAYO 的品牌定位（小单快反、柔性供应链、面料开发能力）和目标市场（海外品牌主、采购、设计师），生成完整的内容策略。`;

          // Load custom prompt from DB, fall back to default
          const customScriptPrompt = await getPromptTemplate("script_system");
          const activeScriptPrompt = customScriptPrompt?.content || SCRIPT_SYSTEM_PROMPT;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: activeScriptPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "script_output",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    core_trend: { type: "string" },
                    core_viewpoint: { type: "string" },
                    industry_problem: { type: "string" },
                    available_angle: { type: "string" },
                    target_customer: { type: "string" },
                    customer_stage: { type: "string" },
                    core_concerns: { type: "array", items: { type: "string" } },
                    filter_intent: { type: "string" },
                    hook: { type: "string" },
                    core_expression: { type: "string" },
                    conflict: { type: "string" },
                    discussion_point: { type: "string" },
                    visual_strategy: { type: "string" },
                    visual_purpose: { type: "string" },
                    key_visuals: { type: "string" },
                  },
                  required: [
                    "core_trend", "core_viewpoint", "industry_problem", "available_angle",
                    "target_customer", "customer_stage", "core_concerns", "filter_intent",
                    "hook", "core_expression", "conflict", "discussion_point",
                    "visual_strategy", "visual_purpose", "key_visuals"
                  ],
                  additionalProperties: false,
                },
              },
            } as any,
          });

          const rawContent = response.choices[0]?.message?.content;
          const raw = typeof rawContent === 'string' ? rawContent : "{}";
          const parsed = JSON.parse(raw);

          const validIndustryProblems = ["MOQ", "成本", "开发周期", "品牌趋势", "供应链效率", "客户决策"];
          const validCustomers = ["初创品牌", "成熟品牌", "采购", "sourcing", "设计师", "产品经理"];
          const validStages = ["起步期", "成长期", "扩张期"];
          const validVisual = ["实拍", "AI生成", "混合", "素材拼接"];

          await updateContentItem(input.id, {
            coreTrend: parsed.core_trend || null,
            coreViewpoint: parsed.core_viewpoint || null,
            industryProblem: validIndustryProblems.includes(parsed.industry_problem)
              ? parsed.industry_problem : null,
            availableAngle: parsed.available_angle || null,
            targetCustomer: validCustomers.includes(parsed.target_customer)
              ? parsed.target_customer : null,
            customerStage: validStages.includes(parsed.customer_stage)
              ? parsed.customer_stage : null,
            coreConcerns: Array.isArray(parsed.core_concerns) ? parsed.core_concerns : [],
            filterIntent: parsed.filter_intent || null,
            hook: parsed.hook || null,
            coreExpression: parsed.core_expression || null,
            conflict: parsed.conflict || null,
            discussionPoint: parsed.discussion_point || null,
            visualStrategy: validVisual.includes(parsed.visual_strategy)
              ? parsed.visual_strategy : null,
            visualPurpose: parsed.visual_purpose || null,
            keyVisuals: parsed.key_visuals || null,
            aiGenerating: "none",
            status: "脚本完成",
          });

          return { success: true };
        } catch (err) {
          await updateContentItem(input.id, { aiGenerating: "none" });
          throw err;
        }
      }),

    // ── AI Workflow 2: Generate Copy ──────────────────────────────────────────
    generateCopy: publicProcedure
      .input(z.object({
        id: z.number(),
        tone: z.enum(["专业", "幽默", "热情"]).optional().default("专业"),
      }))
      .mutation(async ({ input }) => {
        const item = await getContentItemById(input.id);
        if (!item) throw new Error("Content item not found");

        await updateContentItem(input.id, { aiGenerating: "copy", status: "待审核" });

        const toneGuide: Record<string, string> = {
          "专业": "语气要专业、权威、有行业洞察感，使用数据和案例，避免口语化表达。",
          "幽默": "语气要轻松幽默，可以用类比、反差和小段子，但保持专业内核，让人读完会心一笑。",
          "热情": "语气要充满激情和感染力，用第一人称叙述，传递真实的热爱和使命感，让读者感受到品牌温度。",
        };
        const toneInstruction = toneGuide[input.tone ?? "专业"];

        try {
          const userPrompt = `请根据以下内容脚本生成多平台文案。

【语气风格要求】${toneInstruction}

请根据以下内容脚本生成多平台文案：

关键词：${item.keyword || "（未填写）"}
核心趋势：${item.coreTrend || "（未生成）"}
核心观点：${item.coreViewpoint || "（未生成）"}
目标客户：${item.targetCustomer || "（未生成）"} / ${item.customerStage || ""}
核心关注点：${(item.coreConcerns as string[] | null)?.join("、") || "（未生成）"}
筛选意图：${item.filterIntent || "（未生成）"}

脚本：
- Hook：${item.hook || "（未生成）"}
- 核心表达：${item.coreExpression || "（未生成）"}
- 冲突反差：${item.conflict || "（未生成）"}
- 讨论点：${item.discussionPoint || "（未生成）"}

画面策略：${item.visualStrategy || "（未生成）"}
画面目的：${item.visualPurpose || "（未生成）"}`;

          // Load custom prompt from DB, fall back to default
          const customCopyPrompt = await getPromptTemplate("copy_system");
          const activeCopyPrompt = customCopyPrompt?.content || COPY_SYSTEM_PROMPT;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: activeCopyPrompt },
              { role: "user", content: userPrompt + `\n\n【再次强调语气风格】${toneInstruction}` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "copy_output",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    linkedin_copy: { type: "string" },
                    instagram_copy: { type: "string" },
                    youtube_copy: { type: "string" },
                    cta: { type: "string" },
                    titles: { type: "array", items: { type: "string" } },
                    first_comment: { type: "string" },
                  },
                  required: ["linkedin_copy", "instagram_copy", "youtube_copy", "cta", "titles", "first_comment"],
                  additionalProperties: false,
                },
              },
            } as any,
          });

          const rawContent2 = response.choices[0]?.message?.content;
          const raw = typeof rawContent2 === 'string' ? rawContent2 : "{}";
          const parsed = JSON.parse(raw);

          await updateContentItem(input.id, {
            linkedinCopy: parsed.linkedin_copy || null,
            instagramCopy: parsed.instagram_copy || null,
            youtubeCopy: parsed.youtube_copy || null,
            cta: parsed.cta || null,
            titleOptions: Array.isArray(parsed.titles) ? parsed.titles : [],
            firstComment: parsed.first_comment || null,
            aiGenerating: "none",
          });

          return { success: true };
        } catch (err) {
          await updateContentItem(input.id, { aiGenerating: "none" });
          throw err;
        }
      }),

    // ── Seed Demo Data ────────────────────────────────────────────────────────
    seedDemo: publicProcedure
      .input(z.object({ force: z.boolean().optional() }).optional())
      .mutation(async ({ input }) => {
      const count = await countContentItems();
      if (count > 0 && !input?.force) return { skipped: true, message: "演示数据已存在" };
      // Force reset: delete all existing items
      if (count > 0 && input?.force) {
        const { getDb } = await import("./db");
        const { contentItems: ci } = await import("../drizzle/schema");
        const db = await getDb();
        if (db) await db.delete(ci);
      }

      const demoItems = [
        // 1. 已发布 - 完整数据
        {
          status: "已发布" as const,
          keyword: "小单快反如何帮助初创品牌降低库存风险",
          sourceType: "老板提出" as const,
          sourceUrl: null,
          coreTrend: "后疫情时代，全球服装品牌正在从大批量生产转向小批量快速迭代，库存风险管理成为品牌生死线。",
          coreViewpoint: "小单快反不只是生产模式，更是品牌在不确定市场中的生存策略。",
          industryProblem: "MOQ" as const,
          availableAngle: "1. 从库存积压案例切入；2. 对比传统大货与小单快反的ROI；3. 用数据说话",
          targetCustomer: "初创品牌" as const,
          customerStage: "起步期" as const,
          coreConcerns: ["MOQ", "成本", "开发周期"],
          filterIntent: "筛选出正在为库存风险发愁、愿意尝试小批量合作的初创品牌主",
          hook: "你知道 70% 的初创服装品牌死于库存积压，而不是产品不好吗？",
          coreExpression: "传统服装供应链要求品牌一次下单 500-1000件，但初创品牌的市场验证期根本不需要这么多。LAYO 的小单快反模式，最低 50件起订，7-14天交货，让你用最小的资金撬动市场验证。",
          conflict: "大工厂要求你赌上全部资金，而我们让你用零头验证市场",
          discussionPoint: "你们品牌目前的最低起订量是多少？有没有因为 MOQ 问题错过过好的供应商？",
          visualStrategy: "混合" as const,
          visualPurpose: "对比传统大货仓库与 LAYO 精简交付的视觉冲击",
          keyVisuals: "1. 堆满货物的仓库（象征库存积压）；2. 小包装精准发货；3. 品牌主收货后的满意表情；4. 数据图表对比",
          contentFormats: ["视频", "图文"],
          linkedinCopy: "Most fashion startups don't fail because of bad products. They fail because of inventory risk.\n\nHere's the math nobody talks about:\n- Traditional MOQ: 500-1000 pieces\n- Average startup budget: $20,000-50,000\n- % spent on first inventory run: 60-80%\n\nThat leaves almost nothing for marketing, operations, or pivoting when the market says \"not quite.\"\n\nAt LAYO, we built our entire supply chain around one principle: **let brands test before they invest big.**\n\nMinimum 50 pieces. 7-14 day turnaround. Full fabric and development support.\n\nWe've helped 30+ emerging brands go from concept to market without betting their entire runway on a single production run.\n\nThe brands that survive their first year aren't the ones with the best designs. They're the ones who managed their inventory risk intelligently.\n\nWhat's your current MOQ situation? Drop a comment — I read every one.",
          instagramCopy: "70% of fashion startups die from inventory, not bad products. 📦\n\nThe real problem? Being forced to order 500+ pieces when you only need to test 50.\n\nWe built LAYO differently.\n\nMin. 50 pcs → 7-14 day delivery → zero inventory gamble\n\nYour runway stays intact. Your market test stays real.\n\n#FashionStartup #SupplyChain #SmallBatch #FashionBusiness",
          youtubeCopy: "Most fashion brands fail in year one — and it's not because of bad design. It's because they're forced to bet $30,000 on 500 pieces they've never tested in the real market. Today I'm breaking down exactly how small-batch manufacturing changes the math, and why LAYO's 50-piece minimum is changing how emerging brands survive their first year.",
          cta: "想了解小单快反如何适配你的品牌？私信我们",
          titleOptions: ["库存杀死了你的品牌", "50件起订 vs 500件：谁在赌命", "初创品牌的生存公式", "为什么大工厂不适合你", "小单快反：品牌的保险单"],
          finalTitle: "库存杀死了你的品牌",
          firstComment: "补充一个数据：我们服务过的品牌中，首次合作选择小单测款的，二次复购率超过 85%。因为他们用真实市场数据决策，而不是猜测。如果你正在考虑供应链合作，欢迎私信聊聊你的具体情况 👇",
          reviewStatus: "已确认" as const,
          publishPlatforms: ["LinkedIn", "Instagram"],
          publishUrl: "https://linkedin.com/posts/layo-demo",
          aiGenerating: "none" as const,
        },
        // 2. 待发布 - 文案已生成待发布
        {
          status: "待发布" as const,
          keyword: "2025 秋冬面料趋势：可持续材料如何影响品牌采购决策",
          sourceType: "PV官网" as const,
          sourceUrl: "https://www.premierevision.com/en/",
          coreTrend: "2025秋冬，可持续面料从「加分项」变成「必选项」，品牌采购正在系统性重构供应商评估标准。",
          coreViewpoint: "不懂可持续面料的供应商，正在被品牌主的 RFQ 名单悄悄划掉。",
          industryProblem: "品牌趋势" as const,
          availableAngle: "1. PV展趋势解读；2. 品牌采购标准变化；3. LAYO 的可持续面料库",
          targetCustomer: "采购" as const,
          customerStage: "成长期" as const,
          coreConcerns: ["面料资源", "趋势实现", "质量稳定"],
          filterIntent: "筛选出正在寻找可持续面料供应商的品牌采购和 sourcing 团队",
          hook: "PV 展结束了，但大多数供应商还不知道采购标准已经变了",
          coreExpression: "2025秋冬 PV 展上，超过 60% 的新品面料含有再生或天然可持续成分。这不是趋势，这是新的行业基准。品牌的采购团队正在把「可持续认证」列入供应商筛选的第一道门槛。",
          conflict: "你的面料库还停在 2023 年，但客户的标准已经到了 2026",
          discussionPoint: "你们品牌在采购时，可持续认证是必要条件还是加分项？",
          visualStrategy: "素材拼接" as const,
          visualPurpose: "展示 PV 展现场感与 LAYO 面料库的专业度",
          keyVisuals: "1. PV展现场面料展示；2. 可持续认证标签特写；3. LAYO 面料样本墙；4. 数据图表",
          contentFormats: ["图文"],
          linkedinCopy: "PV Paris just wrapped. Here's what most suppliers missed.\n\nThe shift isn't subtle anymore. At Première Vision 2025 AW, sustainable materials weren't a trend section — they were the baseline.\n\n60%+ of new fabric introductions included recycled, organic, or certified sustainable components.\n\nMore importantly: the brands I spoke with are now using sustainability certification as a **first-round filter** when evaluating new suppliers.\n\nNot a nice-to-have. A gate.\n\nAt LAYO, we've been building our sustainable fabric library for 3 years. We currently stock:\n- GOTS certified organic cotton\n- GRS certified recycled polyester\n- Tencel and Lyocell blends\n- Low-impact dye options\n\nIf your sourcing team is updating supplier lists for AW25, we should talk.\n\nWhat sustainability certifications are non-negotiable for your brand right now?",
          instagramCopy: "PV展刚结束 🧵\n\n2025秋冬最重要的信号：可持续面料不再是加分项，是门槛。\n\n60%+ 新品含再生或有机成分\n品牌采购把认证列为第一道筛选\n\nLAYO 面料库：GOTS / GRS / Tencel 全覆盖\n\n你们的供应商准备好了吗？\n\n#PV2025 #SustainableFashion #FabricSourcing",
          youtubeCopy: "I just got back from Première Vision Paris, and there's one thing every brand sourcing team needs to hear: the supplier evaluation criteria just changed. Sustainable certification is no longer a bonus — it's the first filter. Here's exactly what I saw at PV, and what it means for your AW25 sourcing strategy.",
          cta: "查看 LAYO 可持续面料库，私信获取样品",
          titleOptions: ["PV展之后，供应商要变了", "可持续面料：从趋势到门槛", "采购标准悄悄变了", "你的面料库过时了吗", "2025秋冬面料采购指南"],
          finalTitle: "PV展之后，供应商要变了",
          firstComment: "刚从巴黎回来，这次 PV 展最大的感受是：可持续不再是品牌的 PR 话术，而是供应链的硬指标。如果你的采购团队正在更新 AW25 的供应商名单，欢迎私信我们聊聊 LAYO 的面料库 🌿",
          reviewStatus: "已确认" as const,
          publishPlatforms: ["LinkedIn", "Instagram", "YouTube"],
          publishUrl: null,
          aiGenerating: "none" as const,
        },
        // 3. 待审核 - 文案已生成待审核
        {
          status: "待审核" as const,
          keyword: "开发周期压缩：从设计稿到样衣只需 7 天",
          sourceType: "内部经验" as const,
          sourceUrl: null,
          coreTrend: "快时尚品牌的竞争已经从「价格战」转向「速度战」，开发周期成为核心竞争力。",
          coreViewpoint: "7天打样不是噱头，是系统能力的体现——面料库存、版师团队、工艺积累缺一不可。",
          industryProblem: "开发周期" as const,
          availableAngle: "1. 拆解7天打样的系统能力；2. 对比行业平均周期；3. 客户案例",
          targetCustomer: "设计师" as const,
          customerStage: "成长期" as const,
          coreConcerns: ["开发周期", "质量稳定", "MOQ"],
          filterIntent: "筛选出对开发速度有强烈需求的设计师和品牌产品团队",
          hook: "行业平均打样周期 21 天，我们做到了 7 天，这背后是什么？",
          coreExpression: "大多数工厂的打样周期是 21-30 天，因为他们需要先采购面料、再安排版师、再排产。LAYO 的 7 天打样能力来自三个系统：1000+ SKU 的现货面料库、专属版师团队、标准化工艺数据库。",
          conflict: "别人等面料的时间，我们已经把样衣送到你手上了",
          discussionPoint: "你们品牌目前的打样周期是多少天？最长等过多久？",
          visualStrategy: "实拍" as const,
          visualPurpose: "用真实的打样过程建立信任感",
          keyVisuals: "1. 设计稿到面料选择；2. 版师打版过程；3. 样衣完成对比；4. 7天时间轴",
          contentFormats: ["视频", "图文"],
          linkedinCopy: "Industry average sampling time: 21-30 days.\nOur standard: 7 days.\n\nThis isn't a marketing claim. It's a systems question.\n\nMost factories need 21+ days because they're solving three problems sequentially:\n1. Source the right fabric (7-10 days)\n2. Schedule a pattern maker (3-5 days)\n3. Production queue (5-10 days)\n\nAt LAYO, we solved these in parallel:\n\n✓ 1,000+ SKU in-stock fabric library — no sourcing wait\n✓ Dedicated pattern team — no scheduling queue\n✓ Standardized craft database — no guesswork on construction\n\nThe result: design file to finished sample in 7 days.\n\nFor brands running on tight development calendars, this isn't just faster — it's a completely different way of working.\n\nWhat's your current sampling timeline? I'm curious how much of it is actual production vs. waiting.",
          instagramCopy: "设计稿 → 样衣：7天 ⚡\n\n行业平均：21-30天\n\n我们怎么做到的？\n\n✓ 1000+ SKU 现货面料库\n✓ 专属版师团队\n✓ 标准化工艺数据库\n\n不是快，是系统能力。\n\n你们现在的打样周期是多少天？👇\n\n#FashionDesign #Sampling #SupplyChain #LAYO",
          youtubeCopy: "7 days from design file to finished sample. Most factories take 21-30. Today I'm breaking down exactly how LAYO built the systems that make this possible — and why it matters for your brand's development calendar.",
          cta: "想体验 7 天打样？发送你的设计稿给我们",
          titleOptions: ["7天打样：不是魔法是系统", "设计稿到样衣的速度战", "为什么你的工厂需要21天", "打样周期决定品牌速度", "1000个面料SKU的秘密"],
          firstComment: "很多人问我们 7 天打样有没有质量保证。答案是：正因为有系统，质量才更稳定。标准化工艺数据库意味着每次打样都有参考基准，而不是靠版师的个人经验。欢迎私信了解我们的打样流程 🧵",
          reviewStatus: "内部通过" as const,
          publishPlatforms: ["LinkedIn", "YouTube"],
          publishUrl: null,
          aiGenerating: "none" as const,
        },
        // 4. 脚本完成 - 脚本已生成，等待触发文案生成
        {
          status: "脚本完成" as const,
          keyword: "柔性供应链如何支撑品牌的快速迭代策略",
          sourceType: "海外品牌" as const,
          sourceUrl: "https://www.zara.com",
          coreTrend: "Zara、Shein 等快时尚巨头用柔性供应链重新定义了行业速度标准，中小品牌正在寻找能匹配自己迭代节奏的供应商。",
          coreViewpoint: "柔性供应链不是大厂专属，中小品牌同样可以通过正确的供应商选择实现快速迭代。",
          industryProblem: "供应链效率" as const,
          availableAngle: "1. 解构 Zara 柔性供应链的核心逻辑；2. 中小品牌的可行路径；3. LAYO 的柔性能力",
          targetCustomer: "成熟品牌" as const,
          customerStage: "扩张期" as const,
          coreConcerns: ["开发周期", "质量稳定", "趋势实现"],
          filterIntent: "筛选出正在扩张、需要供应链升级的成熟品牌",
          hook: "Zara 一年出 12 个系列，你们品牌出几个？差距在哪里？",
          coreExpression: "Zara 的柔性供应链核心是三个能力：近岸生产、小批量快速补货、实时数据驱动决策。中小品牌不需要复制 Zara 的规模，但可以复制它的逻辑。LAYO 为成长期品牌提供的柔性方案：按需生产、2周交货、款式快速迭代。",
          conflict: "你以为柔性供应链是大品牌的专属，其实是你选错了供应商",
          discussionPoint: "你们品牌目前一年迭代几个系列？供应链是加速还是拖慢了你们的节奏？",
          visualStrategy: "混合" as const,
          visualPurpose: "展示品牌迭代速度与供应链响应能力的关联",
          keyVisuals: "1. Zara 门店快速上新对比；2. LAYO 生产线实拍；3. 品牌迭代时间轴；4. 数据对比图",
          contentFormats: ["视频"],
          aiGenerating: "none" as const,
        },
        // 5. 脚本中 - AI 正在生成脚本（演示中间状态）
        {
          status: "脚本中" as const,
          keyword: "sourcing 团队如何用数据驱动供应商评估",
          sourceType: "行业公众号" as const,
          sourceUrl: "https://www.businessoffashion.com",
          aiGenerating: "none" as const,
        },
        // 6. 选题中 - 刚录入的选题
        {
          status: "选题中" as const,
          keyword: "面料开发能力：从趋势到样品的完整链路",
          sourceType: "PV官网" as const,
          sourceUrl: "https://www.premierevision.com/en/",
          aiGenerating: "none" as const,
        },
      ];

            await bulkInsertContentItems(demoItems as any);
      return { success: true, count: demoItems.length };
    }),

    // ── Export Content (PDF / Word) ─────────────────────────────────────────────────────────────────────────────────
    exportContent: publicProcedure
      .input(z.object({
        id: z.number(),
        format: z.enum(["pdf", "docx"]),
      }))
      .mutation(async ({ input }) => {
        const item = await getContentItemById(input.id);
        if (!item) throw new Error("Content item not found");

        const title = item.keyword || `LAYO-CONTENT-${item.id}`;
        const safeTitle = title.replace(/[^\w\u4e00-\u9fa5\s-]/g, "").trim();

        if (input.format === "docx") {
          // 生成 Word 格式（利用 HTML 格式，可被 Word 直接打开）
          const html = buildDocHtml(item);
          const buf = Buffer.from(html, "utf-8");
          const { url } = await storagePut(
            `exports/${item.id}-${Date.now()}.doc`,
            buf,
            "application/msword"
          );
          return { url, filename: `${safeTitle}.doc` };
        } else {
          // 生成 PDF（用 HTML 转 PDF，通过 Forge 内置功能）
          const html = buildDocHtml(item);
          const buf = Buffer.from(html, "utf-8");
          const { url } = await storagePut(
            `exports/${item.id}-${Date.now()}.html`,
            buf,
            "text/html; charset=utf-8"
          );
          // 返回 HTML 文件 URL，前端将其打开并引导用户打印为 PDF
          return { url, filename: `${safeTitle}.html`, isPrintable: true };
        }
      }),
  }),
});

// ── Document HTML Builder ─────────────────────────────────────────────────────────────────────────────────
function buildDocHtml(item: any): string {
  const section = (title: string, content: string) =>
    content ? `<h2>${title}</h2><p>${content.replace(/\n/g, "<br/>")}</p>` : "";

  const concerns = Array.isArray(item.coreConcerns) ? item.coreConcerns.join("、") : "";
  const platforms = Array.isArray(item.publishPlatforms) ? item.publishPlatforms.join("、") : "";
  const titles = Array.isArray(item.titleOptions)
    ? item.titleOptions.map((t: string, i: number) => `<li>${i + 1}. ${t}</li>`).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8"/>
<title>${item.keyword || "LAYO Content"}</title>
<style>
  body { font-family: 'Arial', 'Microsoft YaHei', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 28px; border-bottom: 3px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 8px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-top: 32px; margin-bottom: 8px; border-left: 3px solid #1a1a1a; padding-left: 10px; }
  p { margin: 0 0 16px; font-size: 14px; }
  .hook { background: #f5f5f5; border-left: 4px solid #1a1a1a; padding: 12px 16px; font-weight: bold; }
  .platform { background: #fafafa; border: 1px solid #e0e0e0; padding: 16px; margin-bottom: 12px; }
  .platform-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 8px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 14px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${item.keyword || "LAYO Content"}</h1>
<div class="meta">状态：${item.status} &nbsp;| 来源：${item.sourceType || "未指定"} &nbsp;| 创建：${new Date(item.createdAt).toLocaleDateString("zh-CN")}</div>

<h2>— 01 选题层</h2>
${section("来源链接", item.sourceUrl || "")}

<h2>— 02 AI 拆解</h2>
${section("核心趋势", item.coreTrend || "")}
${section("核心观点", item.coreViewpoint || "")}
${section("行业问题", item.industryProblem || "")}
${section("可用角度", item.availableAngle || "")}

<h2>— 03 客户画像</h2>
${section("目标客户类型", item.targetCustomer || "")}
${section("客户阶段", item.customerStage || "")}
${concerns ? `<h2>核心关注点</h2><p>${concerns}</p>` : ""}
${section("筛选意图", item.filterIntent || "")}

<h2>— 04 脚本</h2>
${item.hook ? `<div class="hook">🎯 HOOK：${item.hook}</div>` : ""}
${section("核心表达", item.coreExpression || "")}
${section("冲突反差", item.conflict || "")}
${section("讨论点", item.discussionPoint || "")}

<h2>— 05 画面策略</h2>
${section("画面策略", item.visualStrategy || "")}
${section("画面目的", item.visualPurpose || "")}
${section("关键画面", item.keyVisuals || "")}

${item.linkedinCopy ? `<h2>— 06 文案</h2>
<div class="platform"><div class="platform-label">LinkedIn</div><p>${item.linkedinCopy.replace(/\n/g, "<br/>")}</p></div>
<div class="platform"><div class="platform-label">Instagram</div><p>${(item.instagramCopy || "").replace(/\n/g, "<br/>")}</p></div>
<div class="platform"><div class="platform-label">YouTube</div><p>${(item.youtubeCopy || "").replace(/\n/g, "<br/>")}</p></div>` : ""}

${titles ? `<h2>— 07 标题与评论</h2><ul>${titles}</ul>` : ""}
${section("最终标题", item.finalTitle || "")}
${section("首条评论引流文案", item.firstComment || "")}

${item.publishUrl ? `<h2>— 发布信息</h2><p>发布平台：${platforms}</p><p>发布链接：<a href="${item.publishUrl}">${item.publishUrl}</a></p>` : ""}

<hr style="margin-top:40px;border:none;border-top:1px solid #e0e0e0;"/>
<p style="font-size:11px;color:#aaa;text-align:center;">Generated by LAYO Content OS &nbsp;· ${new Date().toLocaleDateString("zh-CN")}</p>
</body></html>`;
}

export type AppRouter = typeof appRouter;
