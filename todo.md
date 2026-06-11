# LAYO Content OS - TODO

## Phase 1: Database Schema & Migration
- [x] 设计 content_items 表（含全部 PRD 字段）
- [x] 执行数据库迁移
- [x] 验证表结构

## Phase 2: Server - DB Helpers & tRPC Routers
- [x] server/db.ts 添加 content 查询 helpers
- [x] content.list（支持按状态筛选）
- [x] content.getById
- [x] content.create
- [x] content.update（含状态流转）
- [x] content.delete
- [x] AI Workflow 1：generateScript（调用 LLM 生成脚本+客户画像+画面策略）
- [x] AI Workflow 2：generateCopy（调用 LLM 生成多平台文案+标题+首条评论）
- [x] 演示数据 seed 接口（支持 force 重置）

## Phase 3: Frontend - Layout & 内容列表看板
- [x] 全局样式（工业风灰度色板、Space Grotesk + Space Mono 字体）
- [x] 侧边栏导航（PIPELINE 状态计数）
- [x] 内容列表看板页（卡片/表格双视图）
- [x] 状态筛选 Tab
- [x] 统计数字卡片行

## Phase 4: Frontend - 新建表单 & 详情页
- [x] 新建选题表单（来源链接/来源类型/关键词）
- [x] 内容详情页（7个模块：选题层/AI拆解/客户画像/脚本/画面策略/文案/标题与评论）
- [x] 状态流转操作按钮（含 AI 触发提示）
- [x] AI 生成中 Loading 状态（自动轮询刷新）
- [x] 审核与发布模块（审核状态/发布平台/发布时间/发布链接）
- [x] 字段人工编辑支持（EditableField 组件）

## Phase 5: Demo Data & Tests & Polish
- [x] 预填充 6 条覆盖不同阶段的演示数据
- [x] vitest 单元测试（content CRUD + auth，10 tests passed）
- [x] TypeScript 编译无报错
- [x] UI 细节打磨（工业风样式、空状态、响应式）

## Phase 6: Checkpoint & Delivery
- [x] 内容看板补充排序功能（按更新时间/创建时间）
- [x] AI Workflow 1/2 vitest 覆盖（成功路径 + 错误处理，15 tests passed）
- [x] 保存 Checkpoint
- [x] 交付上线链接

## Feature Requests (Round 2)
- [x] AI 生成骨架屏动画（点击生成按钮后显示逐字段骨架屏 + 进度条）
- [x] 语气风格选择器（专业/幽默/热情，影响 AI 文案生成 Prompt）
- [x] 内容导出功能（PDF/Word，包含脚本和多平台文案）

## Feature Requests (Round 3)
- [ ] 数据库新增 prompt_templates 表（key, content, updatedAt）
- [ ] tRPC 路由：settings.getPrompt / settings.savePrompt / settings.resetPrompt
- [ ] generateScript/generateCopy 改为从 DB 读取自定义 Prompt
- [ ] 前端设置页面：双 Prompt 编辑器（脚本生成 / 文案生成）
- [ ] 变量提示面板（可用变量说明）
- [ ] 重置为默认按钮（含确认对话框）
- [ ] 侧边栏新增「设置」导航入口
