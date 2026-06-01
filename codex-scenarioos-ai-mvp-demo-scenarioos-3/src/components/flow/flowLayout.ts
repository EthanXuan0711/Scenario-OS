// React Flow 节点布局：按 shell 同心放射分布（确定性，无随机），生成 x/y 坐标。

import type { ScenarioNode } from "../../types";

export type XY = { x: number; y: number };

export function computeFlowLayout(nodes: ScenarioNode[]): Map<string, XY> {
  const byShell = new Map<number, ScenarioNode[]>();
  nodes.forEach((node) => {
    const arr = byShell.get(node.shell) ?? [];
    arr.push(node);
    byShell.set(node.shell, arr);
  });

  const map = new Map<string, XY>();
  const shells = Array.from(byShell.keys()).sort((a, b) => a - b);

  shells.forEach((shell) => {
    const list = byShell.get(shell)!;
    if (shell === 0) {
      list.forEach((node, index) => map.set(node.id, { x: (index - (list.length - 1) / 2) * 240, y: 0 }));
      return;
    }
    const radius = shell * 320;
    list.forEach((node, index) => {
      const angle = (index / list.length) * Math.PI * 2 - Math.PI / 2 + shell * 0.32;
      map.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.8 });
    });
  });

  return map;
}
