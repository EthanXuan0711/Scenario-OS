# ScenarioOS · 人生决策推演沙盘（MVP Demo）

把一个真实困境放上桌面，系统把它拆成 **事件 / 角色 / 平台 / 风险 / 结果** 五个维度，
用 3D 星系把"变量—人物—风险—路径"可视化，辅助你做更清醒的人生决策。

> 纯前端演示，无后端、无真实大模型 API；所有"推演"由本地关键词引擎 + 函数公式完成。

---

## 一、当前版本状况

| 项 | 说明 |
|---|---|
| 版本 | `0.1.0`（MVP 演示） |
| 框架 | Next.js 15（App Router）· React 19 · TypeScript 5.7 · Tailwind 3.4 |
| 3D | three.js 0.184 · @react-three/fiber 9 · drei 10 · postprocessing 3（Bloom） |
| 其他 | framer-motion 11（动效）· @xyflow/react 12（React Flow 实验）· zustand 5 |

### 本次迭代焦点：社会沙盘（`/scenario-map`）重写

- **5 维度恒星系**：事件🟡 / 角色🔵 / 平台🟣 / 风险🔴 / 结果🟢，各自一颗中心恒星 + 一圈节点。
- **布朗运动**：节点改为随机游走（不再固定环绕恒星），在各自的"星云"内自由漂移。
- **点击进入详情**：点击任意恒星 / 节点 → 弹出详情卡，显示 **评分 / 权重 / 内容**。
- **实时同步**：评分与权重由 6 个决策变量的函数公式推导，工作台调变量 / AI 推演 / 笔记改写，详情卡即时刷新。
- **输入即重组**：在推演框输入决策 → 从 5 个系各抽出节点，飞向中心重组为"决策路径星系"，5 个原系隐去。
- **新增条件 → 新增星球**：在"条件"面板添加一句条件，自动归类到对应维度并生成一颗带白环的新星球。

### 已知限制
- 预览/无头环境下 WebGL 的 drei `<Html>` 标签可能不渲染（canvas 尺寸退化所致）；**请用真实浏览器（Chrome/Edge）查看 3D 效果**。
- 演示数据为内置种子，非真实个人数据。

---

## 二、快速开始

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 → http://localhost:3000
npm run typecheck  # TypeScript 类型检查（应为 0 错误）
npm run build      # 生产构建（可选）
```

> 注意：不要同时跑 `next build` 与 `next dev` 共用同一个 `.next` 目录，否则可能出现 ChunkLoadError；
> 若遇到，停止服务 → 删除 `.next` → 重新 `npm run dev`。

### 三个页面（路由）
| 路由 | 入口组件 | 功能 |
|---|---|---|
| `/` | `ScenarioWorkspace` | 经典工作台：原子笔记 Vault + 局部图谱(3D 星图) + Markdown/Canvas + AI 推演抽屉 + 变量面板 + 用户登录/档案 |
| `/scenario-map` | `ScenarioGalaxy` | **社会沙盘**：5 维度恒星系 → 决策路径星系（本次重写核心） |
| `/cockpit` | `Cockpit` | 驾驶舱：聊天式推演 + 数据面板 + 节点星系 |

三个页面通过 `scenarioBridge` 共享同一份推演场景（议题 / 输入 / 原型 / 变量 / 条件）。

---

## 三、文件结构与功能

```
src/
├── app/                      # Next.js App Router 路由层
│   ├── layout.tsx            # 根布局（字体、全局样式、metadata）
│   ├── page.tsx              # `/`             → ScenarioWorkspace
│   ├── scenario-map/page.tsx # `/scenario-map` → ScenarioGalaxy（社会沙盘）
│   └── cockpit/page.tsx      # `/cockpit`      → Cockpit（驾驶舱）
│
├── types.ts                  # 全局 TS 类型（ScenarioNode/Edge、DecisionVariable、ScenarioPath…）
├── data/
│   └── scenarioOS.ts         # 演示种子数据：图谱节点/连线、6 个决策变量、4 条路径、议会观点、时间线、行动清单
│
└── components/
    │  ── 共享层（跨页协作）──
    ├── scenarioBridge.ts     # ★ 跨页场景桥接：localStorage + 事件；字段 active/topic/input/archetypeKey/variables/conditions；含 addCondition/removeCondition/useSharedScenario
    ├── deriveScenario.ts     # ★ 原型引擎：输入文本 → 匹配人生原型（考公/婚恋/买房/留学/跳槽/创业…）→ 派生节点标签与变量覆盖；导出 galaxyLabelsFor / matchArchetypeKey
    │
    │  ── 首页·经典工作台 ──
    ├── ScenarioWorkspace.tsx # 经典工作台主组件（Vault / 三模式视图 / 推演 / 变量 / 登录装配）
    ├── ElectronCloud3D.tsx   # 3D 电子云星图（工作台"局部图谱"，three.js，点击节点聚焦+标签）
    ├── RailBar.tsx           # 左侧可收缩导航/笔记栏
    ├── GraphControlBar.tsx   # 图谱缩放/视图控制条
    ├── WorkspaceChatDrawer.tsx # 左侧 AI 聊天抽屉（折叠/展开）
    │
    │  ── 社会沙盘（本次重写核心，scenario-galaxy/）──
    ├── scenario-galaxy/
    │   ├── ScenarioGalaxy.tsx   # ★ 社会沙盘页主组件：装配 3D 场景 + 标题 + 条件面板 + 推演输入 + 详情卡
    │   ├── StarSystems3D.tsx    # ★ 5 维度恒星系 R3F 场景：布朗运动、可点击选中、输入重组、条件生成新星球、镜头飞入
    │   ├── SandboxNodeCard.tsx  # ★ 节点详情卡（评分/权重/内容，framer-motion 弹出）
    │   ├── sandboxScoring.ts    # ★ 节点评分/权重公式 + 关联变量映射 + 描述生成（由决策变量驱动，实现同步）
    │   ├── galaxyTypes.ts       # 维度类型与配色 token（NODE_TYPE_META / STAGES…）
    │   ├── index.ts             # 统一导出
    │   ├── Galaxy3D.tsx         # 旧版节点星系（驾驶舱仍在用）
    │   ├── galaxy3DLayout.ts    # 旧版星系布局算法
    │   ├── useGalaxyData.ts     # 旧版星系数据 hook（读共享场景，relabel 节点）
    │   ├── GalaxyHud.tsx        # 旧版 HUD
    │   ├── TimelineControl.tsx  # 旧版阶段时间线控件
    │   ├── NodeDetailCard.tsx   # 旧版节点详情卡
    │   ├── galaxyMockData.ts    # 旧版演示节点/连线数据
    │   └── useGalaxyCamera.ts   # 旧版 2D 相机/缩放 hook
    │
    │  ── 驾驶舱（cockpit/）──
    ├── cockpit/
    │   ├── Cockpit.tsx        # 驾驶舱主组件
    │   ├── useCockpit.ts      # 驾驶舱状态/逻辑 hook
    │   ├── ChatPanel.tsx      # 聊天推演面板
    │   ├── DataPanel.tsx      # 变量/路径数据面板
    │   └── cockpitSim.ts      # ★ 推演引擎：关键词→节点(simulate)、变量→路径评分(scorePaths/survivalScore)、条件分类(classifyType)、默认变量(defaultVariables)
    │
    │  ── 用户系统（user/）──
    ├── user/
    │   ├── userTypes.ts       # 用户档案类型（基本信息 + 出生年月日时，为八字玄学预留）
    │   ├── useUser.ts         # 用户状态（localStorage 持久化）
    │   ├── LoginModal.tsx     # 登录弹窗
    │   ├── ProfileModal.tsx   # 个人档案弹窗（含出生信息表单）
    │   ├── UserMenu.tsx       # 头部用户菜单（登录按钮 / 头像下拉，折叠展开）
    │   └── baziPreview.ts     # 八字预览（生肖/年柱/时辰推算）
    │
    │  ── 图谱工作台 & React Flow 实验 ──
    ├── ScenarioGraphWorkspace.tsx # React Flow 版图谱工作台（实验分支）
    ├── graph-workspace/      # 图谱工作台 UI 组件族：
    │   ├── GraphWorkspace.tsx / useWorkspaceGraph.ts  # 主体 + 数据 hook
    │   ├── LeftRail.tsx / RightRail.tsx / CollapsibleRail.tsx # 可收缩左右侧栏
    │   ├── NodeList.tsx / NodeDetail.tsx              # 节点列表 / 详情
    │   ├── VariablePanel.tsx / GraphLegend.tsx        # 变量面板 / 图例
    │   └── workspaceNodeMeta.ts                       # 节点元信息/配色
    └── flow/                 # React Flow 关系图组件：ScenarioFlow.tsx / ScenarioNodeCard.tsx / flowLayout.ts
```

★ = 共享层或本次迭代核心文件。

---

## 四、社会沙盘数据流（评分/权重如何同步）

```
工作台 / 社会沙盘输入
        │  saveScenario()（写 localStorage + 派发事件）
        ▼
  scenarioBridge  ──  active / topic / input / archetypeKey / variables / conditions
        │  useSharedScenario()（同页事件 + 跨标签 storage 同步）
        ├──────────────► StarSystems3D：重组场景 / 由 conditions 生成新星球
        └──────────────► SandboxNodeCard：
                          weightOf(type, importance, variables)  → 权重
                          scoreOf(type, importance, variables)   → 评分
                          （变量来自 cockpitSim 的决策变量公式）
```

因此：在工作台调整 6 个决策变量（风险承受度 / 现金流 / 自由度 / 关系 / 成长速度 / 身份一致性）、
做 AI 推演或改写笔记，社会沙盘里每个星球的评分与权重都会**实时联动刷新**。

---

## 五、部署

### GitHub
```bash
git init
git add .
git commit -m "ScenarioOS MVP"
git branch -M main
git remote add origin git@github.com:<your-name>/<your-repo>.git
git push -u origin main
```

### Vercel
1. Vercel → `Add New Project`，导入上面的 GitHub 仓库。
2. Framework Preset 选 `Next.js`，Build Command 用默认 `next build`。
3. 之后每次 push 到 `main` 自动重新部署。

---

## 六、致谢
ScenarioOS — 让每一次重大人生决策，都能先在沙盘里推演一遍。
