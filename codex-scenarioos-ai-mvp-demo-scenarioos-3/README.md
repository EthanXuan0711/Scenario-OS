# ScenarioOS · 个人决策推演系统（v0.4）

把一个真实困境放上桌面，系统把它拆成 **事件 / 角色 / 平台 / 风险 / 结果** 等维度，
在一个**旋臂银河**里把人生节点可视化，输入决策 → 相关节点飞出汇聚成一条**决策路径**，
并通过"判断强度 → 可验证时间窗 → 结果回填 → 命中率"形成可被持续验证的闭环。

> 定位：**个人推演决策系统，不是 AI 算命**。说"推演/路径/概率"，不说"预测命运"。
> 纯前端演示；真实大模型由后端自研，前端已预留接口（见 `deduction/runDeduction.ts`）。

---

## 一、版本状况（v0.4）

| 项 | 说明 |
|---|---|
| 版本 | **v0.4**（玄学八字命盘强化 + 命理合规译码 + 回填深化 + 全局视觉统一） |
| 框架 | Next.js 15（App Router）· React 19 · TypeScript 5.7 · Tailwind 3.4 |
| 3D | three.js 0.184 · @react-three/fiber 9 · drei 10 · postprocessing 3（Bloom/Vignette/Noise） |
| 动效 | gsap 3 + @gsap/react（命盘罗盘自转 / 五行相生能量流 / 入场时间线）· framer-motion 11（剧场） |
| 图表 | recharts 3（人生 K 线蜡烛图） |
| 其他 | @xyflow/react 12（实验）· zustand 5 · lucide-react |
| 构建校验 | `npm run typecheck` 0 错误；`npm run build` 7 页全部通过 |

### v0.4 相对 v0.3 的关键升级
1. **八字分析引擎**（`archive/bazi.ts`）：四柱排盘 + 藏干 + 十神 + 纳音 + 五行力量分布 + 旺衰（身强/均衡/身弱）+ 喜用神，确定性纯前端计算（月柱/真太阳时为近似）。
2. **五行命盘工作台重做**（`archive/MetaphysicsPanel.tsx`）：问真八字风格罗盘——外环八卦自转 + 内环五行逆转 + 五行相生能量流（`strokeDashoffset`）；右侧四柱（含十神/藏干/纳音）+ 五行力量条 + 十神格局/喜用神 + 命理批断。修复 SSR 三角函数水合不一致、GSAP 重跑卡 `autoAlpha:0` 的问题。
3. **命理符号 → 现实变量译码层**（PRD 5.9 合规）：每个符号（日主五行/主导十神/旺衰/喜用）都映射到「决策六维」现实变量 + 标注来源 + 配 30 天**可验证问题**，并附「非算命/可改变」声明；译码以全宽 2 列网格呈现。
4. **结果回填深化**（P0 闭环护城河）：`archive/Archive.tsx` 历史区由三按钮 → 可复盘表单（**真实结果 / 实际走了哪条路径 / 验证日期 / 回填说明**）；`Backfill` 扩 `chosenPathName·verifyDate`，`HistoryItem` 增 `paths` 快照。
5. **命理验证闭环**（`archive/baziVerifyStore.ts`）：八字可验证问题的 30 天回填（应验/部分/未发生），独立持久化。
6. **全局视觉统一**：暗金玄学体系下沉到共享层——`globals.css` 新增 `cosmic-field`（星空星云）/`mystic-card`（暗金玻璃卡）/`font-mystic`（衬线）；`CosmicNav` 暗金流光导航；`DeductionResult` 结果面板 mystic-card 化 + 「去档案回填」跳转。

### v0.2 相对 v0.1 的关键升级
1. **信息架构收敛 → 三导航**：聊天 / 推演 / 档案（统一浮动导航 `CosmicNav`）；驾驶舱 `/cockpit` 退役并重定向到「推演」。
2. **推演数据契约 + 服务地基**（`deduction/`）：冻结 `DeductionInput → DeductionResult` 契约；`runDeduction()` 为前端唯一入口，当前规则引擎兜底，**后端 LLM 就绪即替换、前端零改动**。
3. **档案页**（`/archive`）：命盘雷达 + 命中率仪表盘 + 推演历史**结果回填闭环**。
4. **沉浸式推演入场剧场**（`DeductionTheater`）：输入决策后全屏电影级动画（连接时空坐标→读取决策模式→推演路径→完成）。
5. **宇宙视觉升级**（`StarSystems3D`）：均匀盘 → **3 条旋臂 + 中心核球**；常驻**明亮星系核**（含光晕）；**深空渐变天幕**；星云/星场/尘埃加密；路径汇聚的**点火 + 冲击波 + 能量脉冲**电影感。
6. **产品文档 codex PRD 6.1**：`docs/codex PRD 6.1.md`（产品愿景 + 工程落地 + 前后端契约）。

### 已知限制
- 无后端 / 无真实 LLM / 无数据库；持久化仅 localStorage。
- 预览/无头环境渲染不出 WebGL 的辉光/旋臂/剧场，**请用真实浏览器（Chrome/Edge）查看 3D**。

---

## 二、快速开始

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # 应为 0 错误
```

> 若黑屏：先 `Ctrl+Shift+R` 硬刷新；仍黑屏则停 dev → 删 `.next` → 重跑（避免 build/dev 共用 .next 损坏）。

### 三导航（路由）
| 导航 | 路由 | 入口组件 | 功能 |
|---|---|---|---|
| **聊天** | `/` | `ScenarioWorkspace` | 工作台：原子笔记 Vault + 局部图谱(3D) + Markdown/Canvas + AI 抽屉 + 变量面板 + 登录/档案 |
| **推演** | `/scenario-map` | `ScenarioGalaxy` | 旋臂银河 → 决策路径（入场剧场 + 点击详情 + 条件折叠） |
| **档案** | `/archive` | `Archive` | 命盘雷达 + 命中率仪表盘 + 推演历史回填 |
| (退役) | `/cockpit` | — | 重定向到 `/scenario-map` |

三页通过 `scenarioBridge` 共享同一份场景（议题/输入/原型/变量/条件）。

---

## 三、文件结构与功能

```
docs/
└── codex PRD 6.1.md          # ★ 产品需求文档（愿景 + 工程落地 + 前后端契约 + 路线图）

src/
├── app/                      # 路由层
│   ├── layout.tsx            # 根布局 + 全局挂载 CosmicNav（三导航）
│   ├── page.tsx              # `/`             → ScenarioWorkspace（聊天）
│   ├── scenario-map/page.tsx # `/scenario-map` → ScenarioGalaxy（推演）
│   ├── archive/page.tsx      # `/archive`      → Archive（档案）
│   └── cockpit/page.tsx      # `/cockpit`      → 重定向到 /scenario-map（已退役）
│
├── types.ts                  # 全局类型（ScenarioNode/Edge、DecisionVariable、ScenarioPath…）
├── data/scenarioOS.ts        # 种子数据：图谱节点/连线、6 决策变量、4 路径、议会、时间线
│
└── components/
    ├── CosmicNav.tsx         # ★ 统一三导航（聊天/推演/档案）浮动药丸
    │
    │  ── 共享层 ──
    ├── scenarioBridge.ts     # ★ 跨页场景桥接（localStorage+事件）：active/topic/input/archetypeKey/variables/conditions + 条件增删
    ├── deriveScenario.ts     # 原型引擎：输入→匹配人生原型→派生标签/变量；archetypeDetail / galaxyLabelsFor / matchArchetypeKey
    │
    │  ── 推演地基（deduction/，后端接口预留）──
    ├── deduction/
    │   ├── deductionTypes.ts  # ★ 数据契约：DeductionInput / DeductionResult（判断强度·五维自检·局势·路径A/B/C·行动建议·依据·验证窗）+ Backfill(chosenPathName·verifyDate)/命中率
    │   ├── runDeduction.ts    # ★ 推演唯一入口（后端接入点）；现走规则引擎，未来 fetch('/api/deduce')
    │   ├── ruleEngine.ts      # 离线规则引擎兜底（复用原型库 + 评分引擎产出契约结果）
    │   ├── backfillStore.ts   # 推演历史(含 paths 快照) + 结果回填 + 命中率（localStorage + useHitRate/useDeductionHistory/useBackfills）
    │   └── index.ts           # 出口
    │
    │  ── 推演（社会沙盘 scenario-galaxy/）──
    ├── scenario-galaxy/
    │   ├── ScenarioGalaxy.tsx   # ★ 推演页主组件：银河 + 标题 + 条件折叠面板 + 推演输入 + 详情卡 + 入场剧场
    │   ├── StarSystems3D.tsx    # ★ 旋臂银河 R3F 场景：旋臂分布/平滑漂移/点击选中/输入汇聚成路径/星系核/深空天幕/冲击波点火/后处理
    │   ├── DeductionTheater.tsx # ★ 沉浸式推演入场剧场（framer-motion 全屏动画）
    │   ├── SandboxNodeCard.tsx  # 节点详情卡（评分/权重/内容，随变量同步）
    │   ├── sandboxScoring.ts    # 节点评分/权重公式 + 关联变量映射
    │   ├── galaxyTypes.ts       # 维度类型 + 配色 token（NODE_TYPE_META）
    │   ├── index.ts             # 出口
    │   └── （旧版保留）Galaxy3D / galaxy3DLayout / useGalaxyData / GalaxyHud / TimelineControl / NodeDetailCard / galaxyMockData / useGalaxyCamera
    │
    │  ── 档案（archive/）──
    ├── archive/
    │   ├── Archive.tsx         # ★ 档案主页：命主横幅 + 决策六维雷达 + 命中率仪表盘 + 五行命盘 + 人生K线 + 衍生品 + 推演历史「回填表单」(结果/路径/验证日期/说明)
    │   ├── bazi.ts             # ★ 八字分析引擎：四柱/藏干/十神/纳音/五行力量/旺衰/喜用神 + interpretBazi()(符号→现实变量译码) + BAZI_DISCLAIMER
    │   ├── MetaphysicsPanel.tsx# ★ 五行命盘工作台：八卦/五行自转罗盘(GSAP) + 五行相生能量流 + 四柱 + 命理译码(可验证问题)
    │   ├── baziVerifyStore.ts  # 命理可验证问题的 30 天回填(应验/部分/未发生，localStorage + useBaziVerify)
    │   ├── LifeKLineChart.tsx  # 人生 K 线蜡烛图(recharts)：大运轨道 + MA + 流年详批 + 缩放刷
    │   └── klineTypes.ts       # K 线类型 + 演示数据生成 + MA 计算
    │
    │  ── 聊天/工作台 ──
    ├── ScenarioWorkspace.tsx  # 工作台主组件（Vault / 三模式 / 推演 / 变量 / 登录）
    ├── ElectronCloud3D.tsx    # 局部图谱 3D 电子云星图（three.js）
    ├── RailBar.tsx / GraphControlBar.tsx / WorkspaceChatDrawer.tsx  # 侧栏 / 缩放条 / AI 聊天抽屉
    │
    │  ── 推演引擎（cockpit/，驾驶舱组件保留备用）──
    ├── cockpit/
    │   ├── cockpitSim.ts      # ★ 引擎：关键词→节点、变量→路径评分(scorePaths/survivalScore)、条件分类(classifyType)、默认变量
    │   └── Cockpit / useCockpit / ChatPanel / DataPanel  # 旧驾驶舱（路由已退役，组件保留）
    │
    │  ── 用户系统（user/）──
    ├── user/  userTypes / useUser / LoginModal / ProfileModal / UserMenu / baziPreview  # 登录 + 档案(出生信息，为命盘/八字预留)
    │
    │  ── 实验分支 ──
    ├── ScenarioGraphWorkspace.tsx + graph-workspace/* + flow/*  # React Flow 版图谱工作台（实验，未在主路由）
```

★ = 共享层 / 核心文件。

---

## 四、推演数据流（前后端契约）

```
工作台 / 推演输入 ──saveScenario──► scenarioBridge ──useSharedScenario──► 推演页 / 档案
                                          │
                                runDeduction(DeductionInput)
                                          │  现：规则引擎兜底；未来：POST /api/deduce
                                          ▼
                                   DeductionResult（结果页六大区块）
                                          │  saveDeduction / saveBackfill
                                          ▼
                                   档案：命中率 = (命中×1 + 偏差×0.5) / 已验证
```

**后端只需实现 `POST /api/deduce`：入参 `DeductionInput` → 回参 `DeductionResult`**（见 `deduction/deductionTypes.ts`），前端零改动对接。

---

## 五、部署

```bash
# GitHub（版本管理：提交 + 打标签 + 推送）
git add -A && git commit -m "ScenarioOS v0.4" && git tag v0.4 && git push origin main --tags
# Vercel：导入仓库 → Framework 选 Next.js → 默认 next build
```

> 源码快照：`Desktop/源码/ScenarioOS-源码-v0.4.zip`（由 `git archive` 导出，仅含受版本管理的源码，不含 node_modules/.next）。

---

ScenarioOS v0.4 — 让每一次重大人生决策，都能先在银河里推演一遍，再被现实验证和修正。
