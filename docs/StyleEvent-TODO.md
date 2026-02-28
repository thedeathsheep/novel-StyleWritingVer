# StyleEvent 改造 TODO

与《StyleEvent-基于Novel的改造规划》对应，按阶段勾选完成情况。

---

## 阶段 1：主界面布局与灵感区

- [x] **1.1** 主布局：单栏：品牌 → 灵感区 → 编辑区 → 底部状态（在 `page.tsx` + `style-event-editor.tsx` 内实现）
- [x] **1.2** 灵感区组件：`inspiration-panel.tsx`，每条纯文本 + 小字出处，背光+浮动，最大条数可配置（默认 6）
- [x] **1.3** 空态：未触发时显示「灵感 · 风格写作」+「继续写，相关片段会出现在这里」
- [x] **1.4** 主题与品牌：极简暗色、左上 StyleEvent、底部状态文案（Resonating / StyleEvent Active / Focus）
- [x] **1.5** 主路由 `/` 使用新布局，灵感区接 API 展示

---

## 阶段 2：编辑器与触发逻辑

- [x] **2.1** 获取查询文本：`resonance-bridge.tsx` 内从 editor 取当前段落/选中内容（`useEditor` + 选区）
- [x] **2.2** 触发 hook：`use-resonance-trigger.ts`，停顿 1.5s 或选中即触发
- [x] **2.3** 请求取消：AbortController 取消上一次未完成请求，只保留最新一次
- [x] **2.4** 与灵感区联动：触发时调用 API，结果插入灵感区并去重

---

## 阶段 3：RAG 检索接口

- [x] **3.1** API 契约：`POST /api/resonate`，body `{ query }`，response `{ items: { text, source }[] }`，类型见 `lib/types.ts`
- [x] **3.2** 服务端：V1 已接 **真实 RAG**（OpenAI text-embedding-3-small + 内存向量检索，种子见 `lib/data/resonate-chunks.json`，运行 `npm run embed-seed` 生成 `lib/data/embeddings.json`）；无 key 或无文件时回退 mock
- [x] **3.3** 前端：2s 超时、取消忽略响应、空/错误时静默不弹窗
- [x] **3.4** 出处展示：灵感区每条小字渲染 `source`（库名/书名）

---

## 阶段 4：体验与收尾

- [x] **4.1** 加载态：灵感区根据 `loading` 显示「Resonating」轻量 loading
- [x] **4.2** 列表行为：新条插入顶部、去重、最大 6 条，fade-in-up + float-slow 动效
- [x] **4.3** 延迟观测：开发环境前端 console 打点 `[StyleEvent] resonate latency: Xms`；服务端 dev 打点 `[resonate] query=... items=N ms=X`
- [x] **4.4** 主写作页精简：已隐藏 Usage in dialog、Docs 等，仅保留品牌 + Prototype 链接

---

## V1 已完成（本版）

- [x] 种子数据 `lib/data/resonate-chunks.json` + 预计算脚本 `npm run embed-seed` → `lib/data/embeddings.json`
- [x] 内存向量检索 `lib/vector-store.ts`（cosine 相似度）+ API 接入；2s 超时、查询缓存（最近 50 条 / 5min TTL）
- [x] 延迟观测：前端/服务端 dev 打点

## 可选 / 后续

- [ ] 封装 `use-resonance-fetch.ts`（API 调用 + 超时 + Abort 可单独复用）
- [ ] 多库与权重、混合检索 + rerank（V1.5）
- [ ] 用户自定义知识库（创建/导入/建索引/选库权重）
- [ ] 本地 embedding / 本地向量库（V2）
