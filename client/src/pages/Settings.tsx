import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LayoutDashboard, SlidersHorizontal, RefreshCw, Save, RotateCcw,
  Loader2, ChevronRight, CheckCircle2, AlertCircle, Info,
  Code2, Zap, FileText
} from "lucide-react";
import { STATUS_ORDER } from "@shared/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Variable Hint Chip ───────────────────────────────────────────────────────
function VarChip({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="group relative inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-400 cursor-default hover:border-zinc-500 hover:text-zinc-300 transition-colors">
      <Code2 size={10} className="shrink-0" />
      {label}
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 w-48 bg-zinc-800 border border-zinc-600 p-2 text-xs text-zinc-300 font-sans leading-relaxed">
        {desc}
      </div>
    </div>
  );
}

// ─── Prompt Editor Card ───────────────────────────────────────────────────────
function PromptEditorCard({
  promptKey,
  label,
  description,
  icon: Icon,
  variables,
}: {
  promptKey: "script_system" | "copy_system";
  label: string;
  description: string;
  icon: any;
  variables: { label: string; desc: string }[];
}) {
  const utils = trpc.useUtils();
  const { data: prompts, isLoading } = trpc.settings.getPrompts.useQuery();
  const { data: defaultData } = trpc.settings.getDefaultPrompt.useQuery({ key: promptKey });

  const promptData = prompts?.[promptKey];
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Sync content when data loads
  useEffect(() => {
    if (promptData?.content && !isDirty) {
      setContent(promptData.content);
    }
  }, [promptData?.content]);

  const saveMutation = trpc.settings.savePrompt.useMutation({
    onSuccess: () => {
      toast.success(`${label} 已保存`);
      setIsDirty(false);
      utils.settings.getPrompts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = trpc.settings.resetPrompt.useMutation({
    onSuccess: () => {
      toast.success(`${label} 已重置为默认`);
      setIsDirty(false);
      if (defaultData?.content) setContent(defaultData.content);
      utils.settings.getPrompts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleChange = (val: string) => {
    setContent(val);
    setIsDirty(val !== promptData?.content);
  };

  const charCount = content.length;
  const lineCount = content.split("\n").length;

  return (
    <div className="block-brutalist">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={16} className="text-zinc-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display text-zinc-100">{label}</h2>
              {promptData?.isCustomized ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-900/40 border border-amber-700/50 text-amber-400 font-label text-[10px]">
                  <AlertCircle size={9} />
                  已自定义
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-500 font-label text-[10px]">
                  <CheckCircle2 size={9} />
                  默认
                </span>
              )}
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/40 border border-blue-700/50 text-blue-400 font-label text-[10px]">
                  未保存
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-sans">{description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {promptData?.updatedAt && (
            <span className="font-label text-zinc-600 text-[10px] hidden sm:block">
              {new Date(promptData.updatedAt).toLocaleDateString("zh-CN")} 更新
            </span>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="btn-industrial text-xs flex items-center gap-1.5"
                disabled={resetMutation.isPending || !promptData?.isCustomized}
                title={!promptData?.isCustomized ? "当前已是默认 Prompt" : "重置为系统默认"}
              >
                {resetMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                重置默认
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-zinc-100">确认重置 {label}？</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 font-sans">
                  此操作将删除你的自定义 Prompt，恢复为系统内置的默认模板。此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate({ key: promptKey })}
                  className="bg-red-900 border border-red-700 text-red-100 hover:bg-red-800"
                >
                  确认重置
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button
            className="btn-industrial btn-industrial-primary text-xs flex items-center gap-1.5"
            onClick={() => saveMutation.mutate({ key: promptKey, content })}
            disabled={saveMutation.isPending || !isDirty}
          >
            {saveMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            保存
          </button>
        </div>
      </div>

      {/* Variable hints */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={10} className="text-zinc-600" />
          <span className="font-label text-zinc-600 text-[10px]">可用变量（鼠标悬停查看说明）</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <VarChip key={v.label} label={v.label} desc={v.desc} />
          ))}
        </div>
      </div>

      {/* Textarea editor */}
      {isLoading ? (
        <div className="h-64 bg-zinc-800 border border-zinc-700 animate-pulse" />
      ) : (
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full h-72 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono p-4 resize-y leading-relaxed focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            placeholder="在此输入 System Prompt..."
            spellCheck={false}
          />
          {/* Stats bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 border border-t-0 border-zinc-700">
            <span className="font-label text-zinc-600 text-[10px]">{lineCount} 行 · {charCount} 字符</span>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="font-label text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors"
            >
              {showDiff ? "隐藏" : "查看"} 默认对比
            </button>
          </div>
        </div>
      )}

      {/* Default prompt diff view */}
      {showDiff && defaultData?.content && (
        <div className="mt-3 border border-zinc-700 bg-zinc-900/50">
          <div className="px-4 py-2 border-b border-zinc-700 flex items-center gap-2">
            <span className="font-label text-zinc-500 text-[10px]">系统默认 PROMPT（只读）</span>
          </div>
          <pre className="p-4 text-xs font-mono text-zinc-500 whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
            {defaultData.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function Settings() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="fixed left-0 top-0 bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col z-20">
        {/* Logo */}
        <div className="p-5 border-b border-zinc-800">
          <div className="font-label text-zinc-600 mb-1">CONTENT OS</div>
          <div className="text-xl font-display text-zinc-100">LAYO</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          <div className="font-label text-zinc-600 px-2 mb-2">WORKSPACE</div>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm font-medium transition-colors"
          >
            <LayoutDashboard size={14} />
            内容看板
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-medium"
          >
            <SlidersHorizontal size={14} />
            Prompt 设置
          </button>
        </nav>

        {/* Status legend */}
        <div className="p-3 border-t border-zinc-800">
          <div className="font-label text-zinc-600 px-2 mb-2">PIPELINE</div>
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-600">
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  s === "选题中" ? "bg-zinc-500" :
                  s === "脚本中" ? "bg-blue-500" :
                  s === "脚本完成" ? "bg-cyan-500" :
                  s === "待审核" ? "bg-amber-500" :
                  s === "待发布" ? "bg-emerald-500" : "bg-zinc-300"
                }`} />
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="ml-56 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-8 py-4">
          <div className="flex items-center gap-2 font-label text-zinc-600 text-xs mb-1">
            <button onClick={() => navigate("/")} className="hover:text-zinc-400 transition-colors">内容看板</button>
            <ChevronRight size={10} />
            <span className="text-zinc-400">Prompt 设置</span>
          </div>
          <h1 className="text-2xl font-display text-zinc-100">AI Prompt 模板</h1>
          <p className="text-xs text-zinc-500 font-sans mt-1">
            自定义 AI 脚本生成和文案生成的系统提示词，修改后立即生效于下一次 AI 调用。
          </p>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl space-y-6">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-700">
            <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-400 font-sans leading-relaxed">
              <strong className="text-zinc-300">使用说明：</strong>
              修改 Prompt 后点击「保存」，系统将在下一次 AI 生成时使用新的模板。
              你可以随时点击「重置默认」恢复系统内置的 Prompt。
              <br />
              <strong className="text-zinc-300 mt-1 block">注意：</strong>
              Prompt 末尾的 JSON Schema 格式要求必须保留，否则 AI 输出将无法被系统解析并自动回填字段。
            </div>
          </div>

          {/* Script Prompt Editor */}
          <PromptEditorCard
            promptKey="script_system"
            label="脚本生成 Prompt"
            description="控制 AI 如何分析选题、生成脚本结构和客户画像。在状态推进至「脚本中」时触发。"
            icon={Zap}
            variables={[
              { label: "keyword", desc: "选题关键词，来自新建选题时填写的内容" },
              { label: "sourceType", desc: "来源类型：PV官网 / 海外品牌 / 行业公众号 / 老板提出 / 内部经验" },
              { label: "sourceUrl", desc: "来源链接，用户填写的原始 URL" },
              { label: "LAYO品牌定位", desc: "小单快反、柔性供应链、面料开发能力（固定注入）" },
              { label: "目标市场", desc: "海外品牌主、采购、设计师（固定注入）" },
            ]}
          />

          {/* Copy Prompt Editor */}
          <PromptEditorCard
            promptKey="copy_system"
            label="文案生成 Prompt"
            description="控制 AI 如何根据脚本生成 LinkedIn / Instagram / YouTube 三平台文案。在状态推进至「脚本完成」时触发。"
            icon={FileText}
            variables={[
              { label: "keyword", desc: "选题关键词" },
              { label: "coreTrend", desc: "AI 生成的核心趋势（来自脚本生成阶段）" },
              { label: "hook", desc: "开场钩子（来自脚本生成阶段）" },
              { label: "coreExpression", desc: "核心表达（来自脚本生成阶段）" },
              { label: "conflict", desc: "冲突反差（来自脚本生成阶段）" },
              { label: "tone", desc: "语气风格：专业 / 幽默 / 热情（由用户在详情页选择）" },
              { label: "toneInstruction", desc: "根据 tone 自动注入的语气指令（固定注入）" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
