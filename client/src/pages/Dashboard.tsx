import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus, Grid3X3, List, Loader2, Zap, FileText,
  Clock, CheckCircle2, Send, Globe, LayoutDashboard,
  ChevronRight, Trash2, RefreshCw, SlidersHorizontal
} from "lucide-react";
import { STATUS_BG, STATUS_ORDER, type ContentStatus } from "@shared/types";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status as ContentStatus] ?? "bg-zinc-800 text-zinc-400 border-zinc-600";
  return (
    <span className={`status-badge ${cls}`}>
      <span className="w-1 h-1 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="block-brutalist flex items-center gap-4">
      <div className="w-10 h-10 border border-zinc-700 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-zinc-400" />
      </div>
      <div>
        <div className="text-2xl font-bold font-display text-zinc-100">{value}</div>
        <div className="font-label text-zinc-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────
function ContentCard({ item, onDelete }: { item: any; onDelete: (id: number) => void }) {
  const [, navigate] = useLocation();
  return (
    <div
      className="block-brutalist hover-lift cursor-pointer group relative"
      onClick={() => navigate(`/content/${item.id}`)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <StatusBadge status={item.status} />
        <div className="flex items-center gap-2">
          {item.aiGenerating !== "none" && (
            <Loader2 size={12} className="animate-spin text-zinc-400" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 text-zinc-600"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Keyword */}
      <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-2 line-clamp-2">
        {item.keyword || "（未填写关键词）"}
      </h3>

      {/* Source type */}
      {item.sourceType && (
        <div className="font-label text-zinc-600 mb-3">{item.sourceType}</div>
      )}

      {/* Hook preview */}
      {item.hook && (
        <p className="text-xs text-zinc-500 line-clamp-2 border-t border-zinc-800 pt-2 mt-2">
          {item.hook}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800">
        <span className="font-caption">
          {new Date(item.updatedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
        </span>
        <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
    </div>
  );
}

// ─── Content Row (table view) ─────────────────────────────────────────────────
function ContentRow({ item, onDelete }: { item: any; onDelete: (id: number) => void }) {
  const [, navigate] = useLocation();
  return (
    <tr
      className="border-b border-zinc-800 hover:bg-zinc-900 cursor-pointer group transition-colors"
      onClick={() => navigate(`/content/${item.id}`)}
    >
      <td className="py-3 px-4">
        <StatusBadge status={item.status} />
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-zinc-200 font-medium line-clamp-1">
          {item.keyword || "（未填写关键词）"}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="font-label text-zinc-500">{item.sourceType || "—"}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-zinc-500 line-clamp-1 max-w-[200px] block">
          {item.hook || "—"}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="font-caption">
          {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
        </span>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 text-zinc-600"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}

// ─── New Content Modal ────────────────────────────────────────────────────────
function NewContentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const createMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      toast.success("选题已创建");
      onCreated();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-800 p-5 flex items-center justify-between">
          <div>
            <div className="font-label text-zinc-500 mb-1">NEW TOPIC</div>
            <h2 className="text-lg font-bold text-zinc-100">新建选题</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 font-mono text-xs">
            [ESC]
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="font-label text-zinc-500 block mb-2">关键词 *</label>
            <input
              className="input-industrial"
              placeholder="例如：小单快反如何降低初创品牌库存风险"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="font-label text-zinc-500 block mb-2">来源类型</label>
            <select
              className="input-industrial"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              style={{ appearance: "none" }}
            >
              <option value="">选择来源类型</option>
              {["PV官网", "海外品牌", "行业公众号", "老板提出", "内部经验"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-label text-zinc-500 block mb-2">来源链接</label>
            <input
              className="input-industrial"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-zinc-800 p-5 flex justify-end gap-3">
          <button className="btn-industrial" onClick={onClose}>取消</button>
          <button
            className="btn-industrial btn-industrial-primary"
            onClick={() => {
              if (!keyword.trim()) { toast.error("请填写关键词"); return; }
              createMutation.mutate({
                keyword: keyword.trim(),
                sourceType: sourceType as any || null,
                sourceUrl: sourceUrl.trim() || null,
              });
            }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" />创建中</span>
            ) : "创建选题"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewModal, setShowNewModal] = useState(false);
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt">("updatedAt");
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  const { data: allItems = [], isLoading, refetch } = trpc.content.list.useQuery({ status: null });
  const { data: filteredItems = [] } = trpc.content.list.useQuery(
    { status: activeStatus === "all" ? null : activeStatus },
    { enabled: true }
  );

  const seedMutation = trpc.content.seedDemo.useMutation({
    onSuccess: (data) => {
      if (data.skipped) toast.info("演示数据已存在，无需重置");
      else toast.success(`已预填充 ${(data as any).count} 条演示数据`);
      utils.content.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      utils.content.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Seed demo data on first load
  useEffect(() => {
    if (!isLoading && allItems.length === 0) {
      seedMutation.mutate({ force: false });
    }
  }, [isLoading, allItems.length]);

  // Stats
  const stats = STATUS_ORDER.map((s) => ({
    status: s,
    count: allItems.filter((i: any) => i.status === s).length,
  }));

  const sortedItems = [...(activeStatus === "all" ? allItems : filteredItems)].sort((a: any, b: any) => {
    const aTime = sortBy === "updatedAt" ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = sortBy === "updatedAt" ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
  const displayItems = sortedItems;

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
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-medium">
            <LayoutDashboard size={14} />
            内容看板
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm font-medium transition-colors mt-1"
          >
            <SlidersHorizontal size={14} />
            Prompt 设置
          </button>
        </nav>

        {/* Status legend */}
        <div className="p-3 border-t border-zinc-800">
          <div className="font-label text-zinc-600 px-2 mb-2">PIPELINE</div>
          {STATUS_ORDER.map((s) => {
            const count = stats.find((x) => x.status === s)?.count ?? 0;
            return (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                  activeStatus === s ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
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
                <span className="font-mono text-zinc-600">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Seed button */}
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={() => seedMutation.mutate({ force: true })}
            disabled={seedMutation.isPending}
            className="w-full btn-industrial text-xs flex items-center justify-center gap-2"
          >
            {seedMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            重置演示数据
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="ml-56 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div>
            <div className="font-label text-zinc-600 mb-0.5">CONTENT PIPELINE</div>
            <h1 className="text-2xl font-display text-zinc-100">内容看板</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort toggle */}
            <div className="flex border border-zinc-700">
              <button
                onClick={() => setSortBy("updatedAt")}
                className={`px-3 py-1.5 font-label text-xs transition-colors ${sortBy === "updatedAt" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                最近更新
              </button>
              <button
                onClick={() => setSortBy("createdAt")}
                className={`px-3 py-1.5 font-label text-xs transition-colors ${sortBy === "createdAt" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                创建时间
              </button>
            </div>

            {/* View toggle */}
            <div className="flex border border-zinc-700">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <List size={14} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex border border-zinc-700">
              {["all", ...STATUS_ORDER].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`px-3 py-1.5 font-label text-xs transition-colors ${
                    activeStatus === s
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s === "all" ? "ALL" : s}
                </button>
              ))}
            </div>

            {/* New button */}
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-industrial btn-industrial-primary flex items-center gap-2"
            >
              <Plus size={12} />
              新建选题
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Stats row */}
          <div className="grid grid-cols-6 gap-3 mb-8">
            {stats.map(({ status, count }) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`block-brutalist text-left transition-all hover-lift ${
                  activeStatus === status ? "border-zinc-500" : ""
                }`}
              >
                <div className="text-xl font-display text-zinc-100">{count}</div>
                <div className="font-label text-zinc-600 mt-1 text-xs">{status}</div>
              </button>
            ))}
          </div>

          {/* Content area */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-zinc-600" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 border border-zinc-800 flex items-center justify-center mb-4">
                <FileText size={24} className="text-zinc-700" />
              </div>
              <div className="font-label text-zinc-600 mb-2">NO CONTENT</div>
              <p className="text-sm text-zinc-600 mb-4">
                {activeStatus === "all" ? "暂无内容，点击新建选题开始" : `暂无「${activeStatus}」状态的内容`}
              </p>
              {activeStatus === "all" && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="btn-industrial btn-industrial-primary flex items-center gap-2"
                >
                  <Plus size={12} />
                  新建选题
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayItems.map((item: any) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onDelete={(id) => deleteMutation.mutate({ id })}
                />
              ))}
            </div>
          ) : (
            <div className="border border-zinc-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="text-left py-3 px-4 font-label text-zinc-500">状态</th>
                    <th className="text-left py-3 px-4 font-label text-zinc-500">关键词</th>
                    <th className="text-left py-3 px-4 font-label text-zinc-500">来源</th>
                    <th className="text-left py-3 px-4 font-label text-zinc-500">Hook</th>
                    <th className="text-left py-3 px-4 font-label text-zinc-500">更新时间</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item: any) => (
                    <ContentRow
                      key={item.id}
                      item={item}
                      onDelete={(id) => deleteMutation.mutate({ id })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Content Modal */}
      {showNewModal && (
        <NewContentModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => utils.content.list.invalidate()}
        />
      )}
    </div>
  );
}
