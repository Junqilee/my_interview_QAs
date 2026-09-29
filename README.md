# 秋招模拟面试问答系统（autumn-interview-trainer）

一个**本地优先**的模拟面试 Web App（PWA），用于秋招面试准备。支持按方向 / 题型筛选、三阶段渐进揭示（主问题 → 追问 → 完整答案 / 解释 / 代码）、题库本地编辑与隐藏、从 Markdown 导入题目，并可离线使用。

> 当前线上版本通过 WorkBuddy 发布：https://interview-flashcards-14056.app.workbuddy.host/

---

## 技术栈

- 构建：**Vite 5** + **React 18** + **TypeScript**
- 样式：**Tailwind CSS 3**
- 路由：react-router-dom（HashRouter）
- 本地存储：**idb**（IndexedDB，用于题库「覆盖层」：隐藏 / 编辑 / 新增）
- PWA：**vite-plugin-pwa** + 手写 Service Worker（离线 + 版本自修复）
- 测试：**Vitest**

---

## 快速开始（换电脑续做）

```bash
git clone https://github.com/Junqilee/my_interview_QAs.git
cd my_interview_QAs
npm install
npm run dev        # 本地开发，默认 http://localhost:5173
```

生产构建与预览：

```bash
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物（--host 可被局域网访问）
```

环境要求：**Node 18+**（Vite 5 需要 Node 18 及以上）。

其他脚本：

```bash
npm run typecheck  # 仅做 TypeScript 类型检查
npm run test       # 运行 Vitest 单元测试
```

---

## 目录结构

```
面试问答系统/
├─ index.html
├─ package.json / package-lock.json   # 依赖与锁定版本（已提交，保证可复现安装）
├─ vite.config.ts / tsconfig.json
├─ tailwind.config.js / postcss.config.js
├─ public/
│  ├─ sw.js            # 手写 Service Worker（离线缓存 + 版本自修复）
│  ├─ manifest.webmanifest / favicon.svg / icon.svg
├─ src/
│  ├─ main.tsx         # 入口；注册 SW + 版本自修复（见下方“PWA/发布”）
│  ├─ App.tsx          # 路由
│  ├─ lib/
│  │  ├─ constants.ts  # DIRECTIONS / QUESTION_TYPES / APP_BUILD（构建号，发布前递增）
│  │  └─ types.ts      # InterviewQuestion 等类型定义
│  ├─ data/
│  │  ├─ index.ts      # 题库加载、去重保险、baseBank + 覆盖层组装
│  │  ├─ ops-theory.json       # 运筹优化八股（核心，91 题 / 14 模块）
│  │  ├─ agent-theory.json     # AI Agent / 大模型 八股
│  │  ├─ supply-chain.json     # 供应链 / 库存调度
│  │  ├─ driving-seed.json     # 智驾仿真
│  │  ├─ scenario.json         # 开放性场景题
│  │  └─ seed-from-notes.json  # 从笔记导入的种子题
│  └─ components/      # Home / Browse / Session / Import / EditQuestionModal / Setup / Progress / AddReal
├─ scripts/
│  ├─ extract_notes.py # 从笔记 Markdown 抽取题目
│  └─ import_md.py     # 将 Markdown 批量导入为题库 JSON
├─ tests/              # Vitest 单测（筛选 / 导入 / 覆盖层 / 渲染顺序等）
├─ gen_review_md.py    # ★ 从 JSON 导出人读“核对版” Markdown（只读，安全）
└─ gen_ops.py          # ⚠ 历史一次性生成器（会整体重写 ops-theory.json，见下方警告）
```

---

## 题库如何工作

- **数据即 JSON**：题目源是 `src/data/*.json`。App 启动时加载 `baseBank`，再叠加浏览器 IndexedDB 里的「覆盖层」——覆盖层记录你在界面上**隐藏 / 编辑 / 新增**的题目，本地优先。
- **题目字段**：`id`、`direction`、`questionType`、`question`、`answer`、`explanation`、`code?`（代码卡）、`followUps[]`（追问，按「答 / 解释」拆分渲染）、`difficulty`、`tags`、`source`、`status`、`version`。
- **渲染映射**：`answer` → 完整回答卡；`explanation` → 解释/思路卡；`code` → 代码卡；`followUps` → 追问卡。

---

## 如何修改 / 新增题目（推荐流程）

1. **改 JSON**：直接编辑 `src/data/ops-theory.json`（或对应方向文件）。可先在核对版 Markdown 上标注修改意见，再落到 JSON。
2. **重导核对版 Markdown**（可选但推荐）：
   ```bash
   python gen_review_md.py
   ```
   它会从 JSON 重新生成一份人读友好的 `运筹优化八股题库/运筹优化八股题_核对版.md`。**该脚本只读 JSON、不会反向改写 JSON**，可放心反复运行。
3. **构建 / 发布**：
   - 本地预览：`npm run build && npm run preview`
   - 线上发布：用 WorkBuddy「发布为应用」对 `dist/` 目录发布（覆盖式，同一链接）。
   - 发布前**递增 `src/lib/constants.ts` 里的 `APP_BUILD`**（如 `2026-09-29.r13`），并提醒使用者点页脚「🧹 强制刷新」清 PWA 缓存，否则可能看到旧包。
4. **测试**：增删题后跑 `npm run test` 验证筛选 / 渲染顺序等回归。

> ⚠ **不要重跑 `gen_ops.py`**：它会读取并按内嵌的 enrichment 字典**整体重写** `ops-theory.json`。一旦你已手工改过题库（例如 ops01 的 q2/q9 改动），重跑会覆盖这些修改。改题请直接编辑 JSON 或用上面的核对版流程。

---

## PWA / 发布

- 已通过 WorkBuddy 发布到 https://interview-flashcards-14056.app.workbuddy.host/ （覆盖式，链接不变）。
- 版本自修复逻辑：`src/main.tsx` 比对 `localStorage.app_build_seen` 与 `APP_BUILD`，不一致则注销旧 Service Worker、清空缓存并重载；`public/sw.js` 在 `install` 阶段删除旧缓存。
- 换设备 / 清缓存：链接页脚有「🧹 强制刷新」按钮，或关闭标签页重开即可拉到新包。

---

## 测试

```bash
npm run test        # Vitest 全量
npm run typecheck   # 类型检查（不改写文件）
```

---

## 仓库约定

- 本仓库**不含** `node_modules/`（依赖）与 `dist/`（构建产物），见 `.gitignore`。
- 不含任何密钥；云端能力（如 WorkBuddy 云服务等）的凭证不落库。
- 换行统一为 LF（见 `.gitattributes`），便于 Windows / macOS 跨机器协作。
