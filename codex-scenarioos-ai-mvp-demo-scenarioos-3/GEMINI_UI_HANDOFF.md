# ScenarioOS UI Handoff for Gemini

This is a local Next.js App Router prototype for the ScenarioOS C-side decision workspace.

## Goal

Continue polishing the frontend UI for ScenarioOS:

- Left: chat intake, three-question entry, quick feedback, fact refill.
- Center: 3D "命运电子云" decision graph.
- Right: scenario path cards, variable sliders, adversarial council, future timeline, 14-day action protocol.

This is not a marketing landing page. The first screen is the actual product workspace.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Local URL:

```text
http://127.0.0.1:3000
```

## Current Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS base setup
- Three.js for the 3D electron cloud
- lucide-react for icons

## Main Files

```text
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css
src/components/ScenarioWorkspace.tsx
src/components/ElectronCloud3D.tsx
src/data/scenarioOS.ts
src/types.ts
```

## Component Ownership

### `ScenarioWorkspace.tsx`

The main client UI shell. It owns:

- chat messages
- selected path
- active right-panel tab
- variable slider values
- selected graph node
- action protocol checked state

Recommended next edits:

- improve mobile tab ergonomics
- refine right-panel card hierarchy
- add better interaction states for quick feedback
- add a share card panel
- add mock streaming status transitions

### `ElectronCloud3D.tsx`

Three.js rendering layer. It owns:

- scene/camera/renderer lifecycle
- graph node meshes
- graph edge lines
- particle field
- pointer drag and node click

Recommended next edits:

- improve graph layout depth and label placement
- add selected-path edge highlighting
- add mobile 2D fallback
- add reduced-motion mode
- add better color encoding for relation types

### `scenarioOS.ts`

Mock data for the product concept:

- graph nodes
- graph edges
- path cards
- variables
- adversarial council
- timeline
- action protocol

Recommended next edits:

- keep data contract stable
- expand examples for relationship scenarios
- add evidence source fields
- add uncertainty and validation window fields

## Design Direction

Current aesthetic: restrained spatial decision cockpit, dark bronze/ink palette, less generic AI neon.

Keep:

- dense but legible workspace layout
- actual product UI as first screen
- no hero page
- no generic purple/cyan glow SaaS style
- no decorative cards inside cards
- controls should remain usable, not only pretty

Improve:

- make the 3D graph feel more dimensional
- make tabs and cards easier to scan
- tighten text rhythm on the right panel
- improve mobile stacking and bottom-tab behavior
- add visible streaming/generation affordances

## Product Constraints

ScenarioOS must express:

- multi-path deduction, not deterministic prophecy
- user can edit, refute, delete, or refill facts
- every recommendation should expose uncertainty
- final output should point to a 14-day real-world validation protocol

Avoid:

- "命中注定"
- "精准预测"
- medical/legal/financial diagnosis
- UI that manipulates users into one choice

## Verification Checklist

Before handing back:

```bash
npm run typecheck
npm run build
```

Manual checks:

- page opens at `http://127.0.0.1:3000`
- 3D canvas is visible
- dragging/scrolling the electron cloud works
- clicking graph nodes updates the node dossier
- right tabs switch correctly
- sliders update path scores
- mobile viewport does not overlap core text
