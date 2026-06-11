export type ContentStatus =
  | "选题中"
  | "脚本中"
  | "脚本完成"
  | "待审核"
  | "待发布"
  | "已发布";

export type SourceType =
  | "PV官网"
  | "海外品牌"
  | "行业公众号"
  | "老板提出"
  | "内部经验";

export const STATUS_ORDER: ContentStatus[] = [
  "选题中",
  "脚本中",
  "脚本完成",
  "待审核",
  "待发布",
  "已发布",
];

export const STATUS_COLORS: Record<ContentStatus, string> = {
  "选题中": "oklch(0.50 0 0)",
  "脚本中": "oklch(0.60 0.08 260)",
  "脚本完成": "oklch(0.60 0.10 200)",
  "待审核": "oklch(0.65 0.12 50)",
  "待发布": "oklch(0.65 0.12 140)",
  "已发布": "oklch(0.75 0 0)",
};

export const STATUS_BG: Record<ContentStatus, string> = {
  "选题中": "bg-zinc-800 text-zinc-400 border-zinc-600",
  "脚本中": "bg-blue-950 text-blue-300 border-blue-700",
  "脚本完成": "bg-cyan-950 text-cyan-300 border-cyan-700",
  "待审核": "bg-amber-950 text-amber-300 border-amber-700",
  "待发布": "bg-emerald-950 text-emerald-300 border-emerald-700",
  "已发布": "bg-zinc-700 text-zinc-200 border-zinc-500",
};

export const SOURCE_TYPES: SourceType[] = [
  "PV官网",
  "海外品牌",
  "行业公众号",
  "老板提出",
  "内部经验",
];

export const NEXT_STATUS: Partial<Record<ContentStatus, ContentStatus>> = {
  "选题中": "脚本中",
  "脚本中": "脚本完成",
  "脚本完成": "待审核",
  "待审核": "待发布",
  "待发布": "已发布",
};

export const NEXT_STATUS_LABEL: Partial<Record<ContentStatus, string>> = {
  "选题中": "开始 AI 脚本生成",
  "脚本中": "标记脚本完成",
  "脚本完成": "开始 AI 文案生成",
  "待审核": "审核通过，待发布",
  "待发布": "标记已发布",
};

export const AI_TRIGGER_STATUS: ContentStatus[] = ["脚本中", "脚本完成"];
