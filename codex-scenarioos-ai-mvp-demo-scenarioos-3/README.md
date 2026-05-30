# ScenarioOS

基于 Next.js App Router 的 ScenarioOS C 端个人决策大脑 Demo。

当前版本把原单文件 Demo 落成了本地 Next.js 应用：

- 左侧：聊天入口、三问捕获、快捷反馈和事实补充。
- 中央：Three.js 3D 命运电子云，展示人物、变量、风险和路径节点。
- 右侧：路径卡、变量权重、反方委员会、未来时间线和 14 天行动协议。

## Local Development

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

如果当前 Codex 环境没有全局 `npm`，可以使用项目内已配置的本地运行时：

```bash
./.runtime/node-v22.14.0-darwin-arm64/bin/npm install --cache .npm-cache
./scripts/next-local.sh dev -H 0.0.0.0 -p 3000
```

## Build

```bash
npm run build
npm run start
```

## Verification

```bash
npm run typecheck
npm run build
```

## GitHub Version Control

```bash
git init
git add .
git commit -m "Initial ScenarioOS Next.js MVP"
git branch -M main
git remote add origin git@github.com:<your-name>/<your-repo>.git
git push -u origin main
```

## Vercel Deployment

1. 在 Vercel 选择 `Add New Project`。
2. 导入上面的 GitHub repository。
3. Framework Preset 选择 `Next.js`。
4. Build Command 使用默认 `next build`。
5. 部署后，每次 push 到 `main` 会自动触发 Vercel 重新部署。

## Project Structure

- `src/app/page.tsx`: App Router 首页入口
- `src/app/layout.tsx`: Next.js 根布局和 metadata
- `src/components/ScenarioWorkspace.tsx`: 三栏式 ScenarioOS 工作台
- `src/components/ElectronCloud3D.tsx`: Three.js 电子云渲染与节点点击
- `src/data/scenarioOS.ts`: C 端路径推演 mock 数据、图谱节点和行动协议
- `src/types.ts`: ScenarioOS 数据契约
- `GEMINI_UI_HANDOFF.md`: 给 Gemini 继续制作前端 UI 的交接说明

## UI 重构说明（外壳克制 + 内核科幻）

本轮 UI 重构在保留原有"数据驱动 Obsidian 工作台"全部功能的前提下，融合了"3D 宇宙螺旋星系"视觉方向：

- **深空螺旋星系背景**：`ElectronCloud3D.tsx` 在数据驱动的决策图谱下方叠加了一层暗铜→靛蓝的螺旋星系粒子场（`THREE.Points` + 叠加混合 + 深空雾化），决策节点漂浮其上，节点本体写入深度从而正确遮挡星系。整体背景下沉到极夜深空色 `#030308`。
- **保留并强化交互**：拖拽旋转、滚轮缩放、点击节点选中、双链高亮、选中脉冲光环全部保留；右侧五个标签页（属性 / 反链 / 变量 / 协议 / 反方）、可调变量滑杆、14 天协议清单均可用。
- **性能修复**：原实现把 `selectedNodeId` 放进重场景 `useEffect` 依赖，导致每次点击节点都会销毁并重建整个 Three.js 场景（含上万粒子）。现改为仅在节点/连线结构变化时重建场景，选中/高亮通过 ref + 脏标记在动画循环内增量刷新。
- **健壮性**：新增 WebGL 不可用时的 2D 降级视图（按壳层分组、可点击选择），以及 `prefers-reduced-motion` 减弱动画支持。
- **代码清理**：移除了早期原型遗留、且未被任何页面引用的孤立组件与数据（`ElectronCloud.tsx`、`FloatingQuestions/FutureMap/FutureRouteCard/StepLayout/QuestionCard/ReportPanel/TarotReflectionCard.tsx`、`data/mockQuestions.ts`、`data/mockRoutes.ts`、`lib/scoring.ts`）及其对应的废弃类型；同时移除不再被使用的 `framer-motion` 依赖。原始文件仍保留在交付压缩包中。
