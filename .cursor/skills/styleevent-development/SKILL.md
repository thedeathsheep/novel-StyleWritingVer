---
name: styleevent-development
description: Guides implementation of StyleEvent (灵感共鸣式写作) features in this Novel-based repo. Use when implementing inspiration panel, resonance trigger, RAG/resonate API, or when editing layout or editor integration; ensures doc-driven phases, layout/trigger/RAG constraints, and correct use of EditorRoot/useEditor.
---

# StyleEvent 开发指引

在为本仓库实现灵感区、触发逻辑、RAG 接口或编辑器集成时，按以下步骤与约束执行。

## 实现前必读

1. **先对齐文档**：需求与阶段见 `docs/StyleEvent-基于Novel的改造规划.md`；指标与降级见 `docs/产品需求与指标.md`；流程与触发见 `docs/灵感瀑布流-流程原型.md`。
2. **约束不可违反**：出处 100% 真实；触发仅「停顿 1.5s」或「选中文本」；同一时刻只保留最新一次请求（取消上一请求）；超时 2s 静默降级，不阻塞编辑。

## 编辑器与触发

- **useEditor()** 必须在 **EditorRoot** 子树内调用；触发逻辑与灵感区 state 放在包含 `EditorContent` 的同一父组件或布局内，以便在 `EditorRoot` 下拿到 `editor`。
- 取查询文本：用 `editor.state`、`doc.textBetween` 或现有 `getPrevText`/当前 block 文本；选区变化时用选中内容。
- 触发封装建议：`apps/web/hooks/use-resonance-trigger.ts` — 1.5s debounce + 选区监听，输出「是否触发 + 查询文本」；请求层用 `AbortController` 取消上一次 `fetch`。

## RAG 与 API

- 契约：请求 `query: string`；响应 `{ items: { text: string, source: string }[] }`，`source` 至少库名。例如 `POST /api/resonate` 或 `/api/style-event/resonate`。
- 前端：2s 超时、取消时忽略响应；空/错误时灵感区显示「未找到相关片段」或保持上一状态，不弹窗。
- 服务端 MVP：单路向量检索 top-K 5～8，超时 2s 返回空数组。

## 布局与组件

- 主布局：品牌（左上）+ 灵感区（中间偏上）+ 编辑区 + 底部状态；无侧栏。建议 `style-event-layout.tsx` 包住 `InspirationPanel` 与 `TailwindAdvancedEditor`。
- 灵感区：`inspiration-panel.tsx` — 每条纯文本 + 小字出处；空态「灵感 · 风格写作」「继续写，相关片段会出现在这里」；loading 态轻量展示；新条插入顶部、列表上滑、最大条数可配置（如 6）。
- 样式：极简暗色；灵感区背光 + 轻微浮动；可复用 `style-event-prototype.tsx` 的 GLOBAL_STYLES / 类名。

## 文件与路由

| 用途 | 路径 |
|------|------|
| 主布局 | `apps/web/components/style-event-layout.tsx` |
| 灵感区 UI | `apps/web/components/inspiration-panel.tsx` |
| 触发 hook | `apps/web/hooks/use-resonance-trigger.ts` |
| 请求 hook（可选） | `apps/web/hooks/use-resonance-fetch.ts` |
| RAG API | `apps/web/app/api/resonate/route.ts` |
| 主写作页 | `apps/web/app/page.tsx`（用 StyleEventLayout + InspirationPanel + 编辑器） |
| 原型页（保留） | `apps/web/components/style-event-prototype.tsx`，路由 `/prototype` |

## 检查清单（实现后自检）

- [ ] 灵感内容均来自真实检索结果，带 `source`，无编造。
- [ ] 仅在停顿 1.5s 或选中时触发；进行中请求可被取消，只保留最新一次。
- [ ] 超时 2s 或失败时静默降级，不阻塞输入、不弹窗。
- [ ] `useEditor()` 仅在 `EditorRoot` 子树内调用；触发/灵感 state 在可访问 editor 的层级。

## 更多细节

- 阶段任务拆解与风险：见 [reference.md](reference.md)。
- 产品指标与检索分层：`docs/产品需求与指标.md`。
