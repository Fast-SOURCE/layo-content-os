import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, Zap, Loader2, ChevronRight,
  Check, X, Copy, Download, Edit3
} from "lucide-react";
import { Linkedin, Instagram, Youtube } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_BG, NEXT_STATUS, NEXT_STATUS_LABEL, type ContentStatus } from "@shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status as ContentStatus] ?? "bg-zinc-800 text-zinc-400 border-zinc-600";
  return (
    <span className={`status-badge ${cls}`}>
      <span className="w-1 h-1 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

function SectionHeader({ label, index }: { label: string; index: number }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="w-6 h-6 border border-zinc-700 flex items-center justify-center">
        <span className="font-mono text-xs text-zinc-500">{String(index).padStart(2, "0")}</span>
      </div>
      <div className="font-label text-zinc-400 tracking-widest">{label}</div>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

// ─── Editable Field ───────────────────────────────────────────────────────────
function EditableField({
  label,
  value,
  onSave,
  multiline = false,
  placeholder = "—",
}: {
  label: string;
  value: string | null | undefined;
  onSave: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => { setDraft(value ?? ""); }, [value]);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <div className="group">
      <div className="font-label text-zinc-600 mb-1.5">{label}</div>
      {editing ? (
        <div className="flex flex-col gap-2">
          {multiline ? (
            <textarea
              className="input-industrial resize-none"
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              className="input-industrial"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-industrial btn-industrial-primary flex items-center gap-1.5">
              <Check size={10} /> 保存
            </button>
            <button onClick={() => { setDraft(value ?? ""); setEditing(false); }} className="btn-industrial flex items-center gap-1.5">
              <X size={10} /> 取消
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative cursor-pointer group/field"
          onClick={() => setEditing(true)}
        >
          <div className={`text-sm leading-relaxed ${value ? "text-zinc-300" : "text-zinc-600 italic"} pr-6`}>
            {value || placeholder}
          </div>
          <Edit3
            size={11}
            className="absolute top-0.5 right-0 text-zinc-700 opacity-0 group-hover/field:opacity-100 transition-opacity"
          />
        </div>
      )}
    </div>
  );
}

// ─── Select Field ─────────────────────────────────────────────────────────────
function SelectField({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  options: string[];
  onSave: (v: string) => void;
}) {
  return (
    <div>
      <div className="font-label text-zinc-600 mb-1.5">{label}</div>
      <select
        className="input-industrial text-sm"
        value={value ?? ""}
        onChange={(e) => onSave(e.target.value)}
        style={{ appearance: "none" }}
      >
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-industrial flex items-center gap-1.5 text-xs"
    >
      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

// ─── Platform Copy Block ──────────────────────────────────────────────────────
function PlatformCopyBlock({
  platform,
  icon: Icon,
  value,
  onSave,
}: {
  platform: string;
  icon: any;
  value: string | null | undefined;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);

  return (
    <div className="block-brutalist">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-zinc-400" />
          <span className="font-label text-zinc-400">{platform}</span>
        </div>
        <div className="flex gap-2">
          {value && <CopyButton text={value} />}
          <button onClick={() => setEditing(!editing)} className="btn-industrial flex items-center gap-1.5 text-xs">
            <Edit3 size={10} /> 编辑
          </button>
        </div>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="input-industrial resize-none text-sm"
            rows={8}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => { onSave(draft); setEditing(false); }} className="btn-industrial btn-industrial-primary flex items-center gap-1.5">
              <Check size={10} /> 保存
            </button>
            <button onClick={() => { setDraft(value ?? ""); setEditing(false); }} className="btn-industrial flex items-center gap-1.5">
              <X size={10} /> 取消
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed min-h-[60px]">
          {value || <span className="text-zinc-700 italic">尚未生成</span>}
        </div>
      )}
    </div>
  );
}


// ─── AI Generating Skeleton ─────────────────────────────────────────────────
function AIGeneratingSkeleton({ type }: { type: "script" | "copy" }) {
  const [progress, setProgress] = useState(5);
  const [stage, setStage] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scriptStages = ["正在分析选题关键词...", "拆解行业趋势与客户画像...", "构建 Hook 与脚本结构...", "生成画面策略...", "整合输出结果..."];
  const copyStages = ["读取脚本内容...", "生成 LinkedIn 专业文案...", "生成 Instagram 视觉文案...", "生成 YouTube 描述文案...", "生成封面标题与首条评论..."];
  const stages = type === "script" ? scriptStages : copyStages;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8 + 2, 90));
      setStage((s) => (s + 1) % stages.length);
    }, 1800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [stages.length]);

  const skeletonFields = type === "script"
    ? ["核心趋势", "核心观点", "HOOK", "核心表达", "冲突反差", "讨论点", "画面策略"]
    : ["LinkedIn 文案", "Instagram 文案", "YouTube 文案", "封面标题", "首条评论"];

  return (
    <div className="space-y-6">
      <div className="block-brutalist space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-zinc-400" />
            <span className="font-label text-zinc-400 text-xs">AI 正在生成{type === "script" ? "脚本策略" : "多平台文案"}</span>
          </div>
          <span className="font-mono text-xs text-zinc-600">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1 bg-zinc-800 [&>div]:bg-zinc-400" />
        <div className="font-mono text-xs text-zinc-600 animate-pulse">{stages[stage]}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skeletonFields.map((label, i) => (
          <div key={i} className="space-y-2">
            <div className="font-label text-zinc-700 text-xs">{label}</div>
            <Skeleton className="h-4 w-3/4 bg-zinc-800" />
            <Skeleton className="h-4 w-full bg-zinc-800/60" />
            {i % 2 === 0 && <Skeleton className="h-4 w-1/2 bg-zinc-800/40" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tone Selector ───────────────────────────────────────────────────────────
const TONES = [
  { value: "专业", label: "专业", desc: "权威 / 数据 / 行业洞察" },
  { value: "幽默", label: "幽默", desc: "轻松 / 类比 / 反差感" },
  { value: "热情", label: "热情", desc: "感染力 / 使命感 / 品牌温度" },
] as const;
type Tone = typeof TONES[number]["value"];

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function ContentDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: item, isLoading, error } = trpc.content.getById.useQuery(
    { id },
    { refetchInterval: (data: any) => data?.aiGenerating !== "none" ? 2000 : false }
  );

  const updateMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.getById.invalidate({ id });
      toast.success("已保存");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateScriptMutation = trpc.content.generateScript.useMutation({
    onSuccess: () => {
      utils.content.getById.invalidate({ id });
      toast.success("AI 脚本生成完成！");
    },
    onError: (e) => {
      utils.content.getById.invalidate({ id });
      toast.error(`生成失败：${e.message}`);
    },
  });

  const generateCopyMutation = trpc.content.generateCopy.useMutation({
    onSuccess: () => {
      utils.content.getById.invalidate({ id });
      toast.success("AI 文案生成完成！");
    },
    onError: (e) => {
      utils.content.getById.invalidate({ id });
      toast.error(`生成失败：${e.message}`);
    },
  });

  const [tone, setTone] = useState<"专业" | "幽默" | "热情">("专业");
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  const exportMutation = trpc.content.exportContent.useMutation({
    onSuccess: (data) => {
      setExporting(null);
      if (data.isPrintable) {
        window.open(data.url, "_blank");
        toast.success("已在新标签页打开，请使用浏览器打印为 PDF");
      } else {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = data.filename;
        a.click();
        toast.success("Word 文档已开始下载");
      }
    },
    onError: (e) => {
      setExporting(null);
      toast.error(`导出失败：${e.message}`);
    },
  });

  const save = (field: string, value: any) => {
    updateMutation.mutate({ id, [field]: value } as any);
  };

  const advanceStatus = () => {
    if (!item) return;
    const next = NEXT_STATUS[item.status as ContentStatus];
    if (!next) return;

    if (item.status === "选题中") {
      // Trigger AI Workflow 1
      generateScriptMutation.mutate({ id });
      toast.info("AI 正在生成脚本，请稍候...");
    } else if (item.status === "脚本完成") {
      // Trigger AI Workflow 2
      generateCopyMutation.mutate({ id, tone });
      toast.info("AI 正在生成多平台文案，请稍候...");
    } else {
      updateMutation.mutate({ id, status: next });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="font-label text-zinc-600">NOT FOUND</div>
        <button onClick={() => navigate("/")} className="btn-industrial flex items-center gap-2">
          <ArrowLeft size={12} /> 返回看板
        </button>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[item.status as ContentStatus];
  const nextLabel = NEXT_STATUS_LABEL[item.status as ContentStatus];
  const isGenerating = item.aiGenerating !== "none";
  const isAITrigger = item.status === "选题中" || item.status === "脚本完成";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm font-mono"
          >
            <ArrowLeft size={14} /> 返回看板
          </button>
          <div className="w-px h-4 bg-zinc-700" />
          <StatusBadge status={item.status} />
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Loader2 size={12} className="animate-spin" />
              AI 生成中...
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {nextStatus && (
            <button
              onClick={advanceStatus}
              disabled={isGenerating || generateScriptMutation.isPending || generateCopyMutation.isPending}
              className={`btn-industrial flex items-center gap-2 ${isAITrigger ? "btn-industrial-primary" : ""}`}
            >
              {(isGenerating || generateScriptMutation.isPending || generateCopyMutation.isPending) ? (
                <><Loader2 size={10} className="animate-spin" /> 处理中</>
              ) : (
                <>
                  {isAITrigger && <Zap size={10} />}
                  {nextLabel}
                  <ChevronRight size={10} />
                </>
              )}
            </button>
          )}
          {item.status === "已发布" && (
            <span className="font-label text-zinc-500">PUBLISHED</span>
          )}
          {/* Export buttons */}
          <div className="flex items-center gap-2 border-l border-zinc-700 pl-3">
            <button
              onClick={() => { setExporting("pdf"); exportMutation.mutate({ id, format: "pdf" }); }}
              disabled={exporting !== null}
              className="btn-industrial flex items-center gap-1.5 text-xs"
              title="导出为 PDF（将在新标签页打开，可打印保存）"
            >
              {exporting === "pdf" ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
              PDF
            </button>
            <button
              onClick={() => { setExporting("docx"); exportMutation.mutate({ id, format: "docx" }); }}
              disabled={exporting !== null}
              className="btn-industrial flex items-center gap-1.5 text-xs"
              title="导出为 Word 文档"
            >
              {exporting === "docx" ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
              Word
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Title */}
        <div>
          <div className="font-label text-zinc-600 mb-2">#{String(item.id).padStart(4, "0")}</div>
          <h1 className="text-3xl font-display text-zinc-100 leading-tight">
            {item.keyword || "（未填写关键词）"}
          </h1>
        </div>

        {/* ── 01 选题层 ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="选题层" index={1} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EditableField
              label="关键词"
              value={item.keyword}
              onSave={(v) => save("keyword", v)}
            />
            <SelectField
              label="来源类型"
              value={item.sourceType}
              options={["PV官网", "海外品牌", "行业公众号", "老板提出", "内部经验"]}
              onSave={(v) => save("sourceType", v)}
            />
            <EditableField
              label="来源链接"
              value={item.sourceUrl}
              onSave={(v) => save("sourceUrl", v)}
              placeholder="https://..."
            />
          </div>
        </section>

        {/* ── 02 AI 拆解 ────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="AI拆解" index={2} />
          {item.aiGenerating === "script" ? (
            <AIGeneratingSkeleton type="script" />
          ) : !item.coreTrend && item.status === "选题中" ? (
            <div className="block-brutalist border-dashed flex flex-col items-center justify-center py-10 gap-3">
              <Zap size={20} className="text-zinc-600" />
              <div className="font-label text-zinc-600">等待 AI 分析</div>
              <p className="text-xs text-zinc-600 text-center max-w-xs">
                点击顶部「开始 AI 脚本生成」按钮，AI 将自动分析选题并生成趋势拆解、客户画像、脚本和画面策略
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="核心趋势" value={item.coreTrend} onSave={(v) => save("coreTrend", v)} multiline />
              <EditableField label="核心观点" value={item.coreViewpoint} onSave={(v) => save("coreViewpoint", v)} multiline />
              <SelectField
                label="行业问题"
                value={item.industryProblem}
                options={["MOQ", "成本", "开发周期", "品牌趋势", "供应链效率", "客户决策"]}
                onSave={(v) => save("industryProblem", v)}
              />
              <EditableField label="可用角度" value={item.availableAngle} onSave={(v) => save("availableAngle", v)} multiline />
            </div>
          )}
        </section>

        {/* ── 03 客户画像 ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="客户画像" index={3} />
          {!item.targetCustomer && item.status === "选题中" ? (
            <div className="block-brutalist border-dashed flex items-center justify-center py-8">
              <span className="font-label text-zinc-700">AI 生成后显示</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="目标客户类型"
                value={item.targetCustomer}
                options={["初创品牌", "成熟品牌", "采购", "sourcing", "设计师", "产品经理"]}
                onSave={(v) => save("targetCustomer", v)}
              />
              <SelectField
                label="客户阶段"
                value={item.customerStage}
                options={["起步期", "成长期", "扩张期"]}
                onSave={(v) => save("customerStage", v)}
              />
              <div>
                <div className="font-label text-zinc-600 mb-1.5">核心关注点</div>
                <div className="flex flex-wrap gap-2">
                  {(["MOQ", "成本", "开发周期", "质量稳定", "面料资源", "趋势实现"] as string[]).map((c) => {
                    const concerns = (item.coreConcerns as string[] | null) ?? [];
                    const active = concerns.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          const next = active ? concerns.filter((x) => x !== c) : [...concerns, c];
                          save("coreConcerns", next);
                        }}
                        className={`status-badge transition-colors ${
                          active
                            ? "border-zinc-400 text-zinc-200 bg-zinc-800"
                            : "border-zinc-700 text-zinc-600 hover:border-zinc-500"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <EditableField label="筛选意图" value={item.filterIntent} onSave={(v) => save("filterIntent", v)} multiline />
            </div>
          )}
        </section>

        {/* ── 04 脚本 ───────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="脚本" index={4} />
          {!item.hook && item.status === "选题中" ? (
            <div className="block-brutalist border-dashed flex items-center justify-center py-8">
              <span className="font-label text-zinc-700">AI 生成后显示</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="block-brutalist border-l-2 border-zinc-500">
                <EditableField label="HOOK — 开场钩子" value={item.hook} onSave={(v) => save("hook", v)} multiline />
              </div>
              <div className="block-brutalist">
                <EditableField label="核心表达" value={item.coreExpression} onSave={(v) => save("coreExpression", v)} multiline />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="block-brutalist border-l-2 border-amber-800">
                  <EditableField label="冲突反差" value={item.conflict} onSave={(v) => save("conflict", v)} multiline />
                </div>
                <div className="block-brutalist">
                  <EditableField label="讨论点" value={item.discussionPoint} onSave={(v) => save("discussionPoint", v)} multiline />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 05 画面策略 ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="画面策略" index={5} />
          {!item.visualStrategy && item.status === "选题中" ? (
            <div className="block-brutalist border-dashed flex items-center justify-center py-8">
              <span className="font-label text-zinc-700">AI 生成后显示</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField
                label="画面策略"
                value={item.visualStrategy}
                options={["实拍", "AI生成", "混合", "素材拼接"]}
                onSave={(v) => save("visualStrategy", v)}
              />
              <EditableField label="画面目的" value={item.visualPurpose} onSave={(v) => save("visualPurpose", v)} multiline />
              <EditableField label="关键画面" value={item.keyVisuals} onSave={(v) => save("keyVisuals", v)} multiline />
            </div>
          )}
        </section>

        {/* ── 06 文案 ───────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="文案" index={6} />

          {/* Tone selector — shown when copy can be generated or already exists */}
          {(item.status === "脚本完成" || item.status === "待审核" || item.status === "待发布" || item.status === "已发布") && (
            <div className="mb-4 flex items-center gap-3">
              <span className="font-label text-zinc-600 text-xs">语气风格</span>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-1.5 text-xs border transition-all ${
                      tone === t.value
                        ? "border-zinc-300 bg-zinc-800 text-zinc-100"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span className="font-mono">{t.label}</span>
                    <span className="ml-1.5 text-zinc-600 hidden sm:inline">{t.desc}</span>
                  </button>
                ))}
              </div>
              {item.linkedinCopy && (
                <span className="font-mono text-zinc-700 text-xs ml-auto">选择风格后重新生成可更新文案</span>
              )}
            </div>
          )}

          {/* AI generating skeleton */}
          {item.aiGenerating === "copy" ? (
            <AIGeneratingSkeleton type="copy" />
          ) : !item.linkedinCopy && (item.status === "选题中" || item.status === "脚本中") ? (
            <div className="block-brutalist border-dashed flex flex-col items-center justify-center py-10 gap-3">
              <Zap size={20} className="text-zinc-600" />
              <div className="font-label text-zinc-600">等待 AI 文案生成</div>
              <p className="text-xs text-zinc-600 text-center max-w-xs">
                脚本生成完成后，点击「开始 AI 文案生成」按钮，AI 将自动生成 LinkedIn / Instagram / YouTube 三平台文案
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <PlatformCopyBlock
                platform="LINKEDIN"
                icon={Linkedin}
                value={item.linkedinCopy}
                onSave={(v) => save("linkedinCopy", v)}
              />
              <PlatformCopyBlock
                platform="INSTAGRAM"
                icon={Instagram}
                value={item.instagramCopy}
                onSave={(v) => save("instagramCopy", v)}
              />
              <PlatformCopyBlock
                platform="YOUTUBE"
                icon={Youtube}
                value={item.youtubeCopy}
                onSave={(v) => save("youtubeCopy", v)}
              />
              {item.cta && (
                <div className="block-brutalist">
                  <div className="font-label text-zinc-500 mb-2">CTA — 行动号召</div>
                  <p className="text-sm text-zinc-300">{item.cta}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── 07 标题与评论 ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="标题与评论" index={7} />
          {!item.titleOptions && (item.status === "选题中" || item.status === "脚本中") ? (
            <div className="block-brutalist border-dashed flex items-center justify-center py-8">
              <span className="font-label text-zinc-700">AI 生成后显示</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title options */}
              {Array.isArray(item.titleOptions) && item.titleOptions.length > 0 && (
                <div className="block-brutalist">
                  <div className="font-label text-zinc-500 mb-3">封面标题备选</div>
                  <div className="space-y-2">
                    {(item.titleOptions as string[]).map((t, i) => (
                      <button
                        key={i}
                        onClick={() => save("finalTitle", t)}
                        className={`w-full text-left px-3 py-2 border transition-colors text-sm ${
                          item.finalTitle === t
                            ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        <span className="font-mono text-zinc-600 mr-3">0{i + 1}</span>
                        {t}
                        {item.finalTitle === t && <Check size={12} className="inline ml-2 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Final title */}
              <div className="block-brutalist">
                <EditableField
                  label="最终标题（已确认）"
                  value={item.finalTitle}
                  onSave={(v) => save("finalTitle", v)}
                  placeholder="从备选中选择或手动填写"
                />
              </div>

              {/* First comment */}
              <div className="block-brutalist border-l-2 border-zinc-600">
                <EditableField
                  label="首条评论引流文案"
                  value={item.firstComment}
                  onSave={(v) => save("firstComment", v)}
                  multiline
                />
                {item.firstComment && (
                  <div className="mt-2">
                    <CopyButton text={item.firstComment} />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── 08 审核与发布 ─────────────────────────────────────────────────── */}
        {(item.status === "待审核" || item.status === "待发布" || item.status === "已发布") && (
          <section>
            <SectionHeader label="审核与发布" index={8} />
            <div className="block-brutalist">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="审核状态"
                  value={item.reviewStatus}
                  options={["内部通过", "待老板确认", "已确认"]}
                  onSave={(v) => save("reviewStatus", v)}
                />

                {/* Publish platforms */}
                <div>
                  <div className="font-label text-zinc-600 mb-1.5">发布平台</div>
                  <div className="flex flex-wrap gap-2">
                    {["LinkedIn", "Instagram", "Facebook", "YouTube"].map((p) => {
                      const platforms = (item.publishPlatforms as string[] | null) ?? [];
                      const active = platforms.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            const next = active ? platforms.filter((x) => x !== p) : [...platforms, p];
                            save("publishPlatforms", next);
                          }}
                          className={`status-badge transition-colors ${
                            active
                              ? "border-zinc-400 text-zinc-200 bg-zinc-800"
                              : "border-zinc-700 text-zinc-600 hover:border-zinc-500"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <EditableField
                  label="发布链接"
                  value={item.publishUrl}
                  onSave={(v) => save("publishUrl", v)}
                  placeholder="发布后回填链接"
                />

                <div>
                  <div className="font-label text-zinc-600 mb-1.5">发布时间</div>
                  <input
                    type="datetime-local"
                    className="input-industrial text-sm"
                    value={item.publishTime ? new Date(item.publishTime).toISOString().slice(0, 16) : ""}
                    onChange={(e) => save("publishTime", e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>
              </div>

              {/* Status advance */}
              {nextStatus && (
                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={advanceStatus}
                    disabled={updateMutation.isPending}
                    className="btn-industrial btn-industrial-primary flex items-center gap-2"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <ChevronRight size={10} />
                    )}
                    {nextLabel}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Bottom spacer */}
        <div className="h-16" />
      </div>
    </div>
  );
}
