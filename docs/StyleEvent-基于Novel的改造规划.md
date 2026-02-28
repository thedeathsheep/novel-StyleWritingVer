# StyleEvent（风格写作）— 基于 Novel 的改造规划

本文档说明如何在本仓库（Novel 开源项目）的现有架构上，改造成目标产品 **StyleEvent**：灵感共鸣式写作助手（不代写、只检索，灵感区中间偏上、纯文本+出处）。  
产品需求与指标见《产品需求与指标》；流程与交互见《灵感瀑布流-流程原型》。

---

## 一、当前项目架构（简述）

| 层级 | 路径 | 说明 |
|------|------|------|
| **根** | `package.json` | Turborepo，`pnpm`，脚本 `dev` / `build` / `figma-socket` |
| **应用** | `apps/web` | Next.js App Router；主编辑页 `/`，原型页 `/prototype` |
| **编辑器包** | `packages/headless` | 包名 `novel`：Tiptap 封装，导出 `EditorRoot`、`EditorContent`、`useEditor`、扩展与插件 |
| **主编辑器** | `apps/web/components/tailwind/advanced-editor.tsx` | `EditorRoot` → `EditorContent`（`onUpdate` 防抖存 localStorage、slash command、气泡菜单、AI 等） |
| **原型** | `apps/web/components/style-event-prototype.tsx` | 极简暗色 UI：灵感区居中偏上、textarea、mock RAG、背光+浮动；路由 `/prototype` |

**关键接入点**：

- **编辑器内容/选区**：`EditorContent` 的 `onUpdate`、Tiptap `editor`（来自 `useEditor()`）；选区与当前句/词可从 `editor.state` 或现有 `getPrevText` 等工具获取。
- **布局**：主页 `app/page.tsx` 当前为居中单栏 + `TailwindAdvancedEditor`；无「灵感区」占位。
- **数据流**：无 RAG 接口；原型内为前端 mock。

---

## 二、改造目标与约束

- **产品形态**：主界面 = 左上品牌（StyleEvent）+ **中间偏上灵感区**（纯文本 + 小字出处）+ 下方主编辑区 + 底部状态；无侧栏、无卡片框。
- **触发**：停顿 1.5s 或选中文本 → 触发一次检索；同一时刻只保留**最新一次请求**（取消未完成的上一次）。
- **检索**：仅 RAG 检索，不生成；每条结果必须带**可追溯出处**；超时 2s 静默降级，不阻塞编辑。
- **表现**：触发到灵感区首条可见 P95 &lt; 1.2s（MVP），出处 100% 真实。

---

## 三、改造阶段与任务拆解

### 阶段 1：主界面布局与灵感区（不接真实检索）

**目标**：主写作页具备「中间偏上灵感区 + 下方编辑器」的布局，视觉与原型一致；灵感区可展示静态或 mock 列表。

| 任务 | 说明 | 建议路径/改动 |
|------|------|----------------|
| 1.1 主布局 | 单栏布局：上 → 品牌；中上 → 灵感区；中下 → 编辑区；底 → 状态 | 新建 `apps/web/components/style-event-layout.tsx` 或改 `app/page.tsx`，将编辑器包在布局内 |
| 1.2 灵感区组件 | 纯文本列表（每条：正文 + 小字出处），背光+浮动，最大条数可配置 | 新建 `apps/web/components/inspiration-panel.tsx`，样式可复用 `style-event-prototype.tsx` 的 GLOBAL_STYLES / 类名 |
| 1.3 空/占位状态 | 未触发时展示「灵感 · 风格写作」+「继续写，相关片段会出现在这里」 | 在 `inspiration-panel` 内根据列表为空且非 loading 显示 |
| 1.4 主题与品牌 | 极简暗色、StyleEvent 品牌、底部状态文案 | 布局内左上 logo+文案、底部状态区；可选全局暗色或仅主写作页暗色 |

**产出**：主路由 `/` 打开即为「灵感区 + 编辑器」布局，灵感区可写死或 mock 数据展示几条。

---

### 阶段 2：编辑器与触发逻辑打通

**目标**：从 Tiptap 编辑器获取「当前句/词或选中文本」，按「停顿 1.5s 或选中」触发，且不发起真实 RAG（可先 log 或 mock 返回）。

| 任务 | 说明 | 建议路径/改动 |
|------|------|----------------|
| 2.1 获取查询文本 | 触发时用于检索的字符串：当前段落/句，或选中内容 | 在 `advanced-editor` 或包装层用 `useEditor()` 取 `editor.state`；可复用/封装 `getPrevText`、取选区 `doc.textBetween` 或当前 block 文本 |
| 2.2 触发条件 | 停顿 1.5s（防抖）或选区变化（有选中即触发） | 新建 `apps/web/hooks/use-resonance-trigger.ts`：`onUpdate`/`onSelectionUpdate` 驱动，1.5s debounce + 选区监听；输出「是否触发 + 查询文本」 |
| 2.3 请求节流与取消 | 同一触发下仅保留最新请求；未完成请求需取消 | 在触发回调内用 `AbortController` 取消上一次 `fetch`；或封装 `useResonanceFetch`，内部维护 requestId/abort |
| 2.4 与灵感区联动 | 触发 → 传入查询文本 → 展示 mock 列表（或后续替换为 API） | 布局层或父组件 state：`inspirationItems`、`loading`；触发时 setLoading(true)，用 mock 数据 setItems，setLoading(false) |

**产出**：打字停顿 1.5s 或选中一段文字后，灵感区更新为 mock 列表；无真实 API 时也可用固定 mock。

---

### 阶段 3：RAG 检索接口与数据契约

**目标**：定义并实现「查询 → 检索 → 返回带出处的列表」的接口；前端按契约展示，超时 2s 降级。

| 任务 | 说明 | 建议路径/改动 |
|------|------|----------------|
| 3.1 API 契约 | 请求：当前句/词或选中文本；响应：`{ items: { text, source }[] }`，source 至少库名 | 文档化在 `docs/` 或代码内类型；如 `POST /api/resonate` 或 `/api/style-event/resonate`，body `{ query: string }`，response `{ items: { text: string, source: string }[] }` |
| 3.2 服务端检索（MVP） | 单路向量检索，top-K 5～8；embedding 可调云端 API | 新建 `apps/web/app/api/resonate/route.ts`（或 next route）；内调 embedding 服务 + 向量库，返回 top-K；超时 2s 返回空数组 |
| 3.3 前端调用与降级 | 请求 2s 超时、取消时忽略响应、空结果与错误时灵感区显示占位 | 在 `useResonanceFetch` 或调用处：`AbortController` + `setTimeout(2000)`、空/错误时 setItems([]) 或显示「未找到相关片段」 |
| 3.4 出处与展示 | 每条必带 source（库名/书名）；前端小字展示 | 类型 `{ text: string, source: string }`；`inspiration-panel` 每条下方小字渲染 `source` |

**产出**：前端触发后请求 `/api/resonate`，得到带出处的列表并展示；超时或失败时静默降级。

---

### 阶段 4：体验与可观测（可选提前，建议与 2/3 并行部分）

| 任务 | 说明 | 建议路径/改动 |
|------|------|----------------|
| 4.1 加载态 | 检索中灵感区显示 loading（不阻塞输入） | `inspiration-panel` 根据 `loading` 显示轻量 loading 态 |
| 4.2 列表行为 | 新条插入顶部、列表上滑、最大条数（如 6） | 与原型一致：新结果 unshift，slice(0, N)，CSS 或简单动画「向上滑」 |
| 4.3 延迟与监控 | 记录「触发 → 首条可见」耗时，便于后续 P95 优化 | 前端打点或送后端；MVP 可先 log 或简单 metrics 端点 |
| 4.4 简化/隐藏与产品无关 UI | 主写作页隐藏或弱化「Usage in dialog」、Docs 等，突出写作+灵感 | 调整 `app/page.tsx` 导航与入口，或新增「写作模式」路由 |

---

## 四、建议文件与目录变更

| 类型 | 路径 | 说明 |
|------|------|------|
| **新增** | `apps/web/components/style-event-layout.tsx` | 主写作页布局：品牌 + 灵感区 + 编辑区 + 底部状态 |
| **新增** | `apps/web/components/inspiration-panel.tsx` | 灵感区 UI：空态/loading/列表（纯文本+出处）、背光+浮动样式 |
| **新增** | `apps/web/hooks/use-resonance-trigger.ts` | 从 editor 取文本 + 1.5s 停顿/选中触发 + 取消上一请求的封装 |
| **新增** | `apps/web/hooks/use-resonance-fetch.ts`（可选） | 封装 resonate API 调用、2s 超时、AbortController、返回 items |
| **新增** | `apps/web/app/api/resonate/route.ts` | Next API：接收 query → embedding + 向量检索 → 返回 items（MVP 可 mock 或最小实现） |
| **修改** | `apps/web/app/page.tsx` | 使用 `StyleEventLayout`，内嵌 `TailwindAdvancedEditor` 与 `InspirationPanel`，并传入触发结果/items state |
| **修改** | `apps/web/components/tailwind/advanced-editor.tsx` | 可选：暴露 `onUpdate`/`onSelectionUpdate` 或通过 context 提供 editor 给触发 hook；或保持现状，由布局层用 `useEditor` 需在 EditorRoot 内取 editor |
| **保留** | `apps/web/components/style-event-prototype.tsx` + `/prototype` | 独立原型页保留，便于对比与演示 |
| **可选** | `packages/headless` | 若需在包内增加「选区/当前块文本」工具函数，可在此扩展；否则仅 apps/web 内使用现有 `useEditor` + `getPrevText` 等 |

**注意**：`useEditor()` 必须在 `EditorRoot` 子树内调用，因此触发逻辑与灵感区 state 建议放在包含 `EditorContent` 的同一父组件或布局内，以便在 `EditorRoot` 下调用 `useEditor()` 获取 editor。

---

## 五、与产品文档的对应关系

| 文档 | 对应改造内容 |
|------|--------------|
| 《产品需求与指标》 | 表现目标（P95、出处 100%）、检索分层、降级策略、阶段里程碑 → 阶段 3/4 的实现与验收 |
| 《灵感瀑布流-流程原型》 | ①～⑤ 流程、触发条件、F1～F4 → 阶段 1/2 的布局与触发、阶段 4 的列表行为 |
| 《FIGMA-原型设计说明》 | 主界面布局、灵感区形态、暗色与品牌 → 阶段 1 的布局与组件 |
| 《技术架构评估与改进建议》 | 检索分层、缓存、多库、可观测 → 阶段 3 及后续 V1.5 扩展 |

---

## 六、风险与依赖

- **编辑器实例获取**：触发逻辑依赖在 `EditorRoot` 内拿到 `editor`；若将布局拆到外层，需通过 context 或 props 把 editor 传入，或把「布局+灵感区+触发」都放在 `EditorRoot` 内。
- **RAG 与 embedding**：MVP 依赖云端 embedding + 向量库或 mock；需环境变量或配置，不写死 key。
- **pnpm**：根目录使用 pnpm；若本地无 pnpm，可在 `apps/web` 下单独 `npm run dev` 开发。

---

本文档为改造的**总览与任务拆解**，具体 API 契约、类型定义和实现细节可在对应阶段在代码或补充文档中细化。
