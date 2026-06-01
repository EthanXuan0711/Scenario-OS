// 3D 星系布局 + 每节点配色变化。确定性（基于 id 哈希）→ SSR/重渲染稳定。

import * as THREE from "three";
import { coreNodeId } from "./galaxyMockData";
import { NODE_TYPE_META, type NodeType, type ScenarioNode } from "./galaxyTypes";

export type Vec3 = [number, number, number];

function hash01(str: string, salt: number) {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// 聚类中心拉远、扩散加大 → 整体更分散、不再挤成一团。
const CLUSTER_CENTROIDS: Record<NodeType, Vec3> = {
  event: [0, 1.5, 0],
  actor: [-36, 16, -12],
  platform: [36, -7, 15],
  risk: [-14, -29, 20],
  outcome: [42, 24, -20]
};

const CLUSTER_SPREAD: Record<NodeType, number> = {
  event: 6.5,
  actor: 12.5,
  platform: 11.5,
  risk: 11,
  outcome: 11
};

export function build3DPositions(nodes: ScenarioNode[]): Map<string, Vec3> {
  const map = new Map<string, Vec3>();
  nodes.forEach((node) => {
    if (node.id === coreNodeId) {
      map.set(node.id, [0, 0, 0]);
      return;
    }
    const centroid = CLUSTER_CENTROIDS[node.type];
    const spread = CLUSTER_SPREAD[node.type];
    const gx = (hash01(node.id, 11) + hash01(node.id, 12) + hash01(node.id, 13)) / 3 - 0.5;
    const gy = (hash01(node.id, 21) + hash01(node.id, 22) + hash01(node.id, 23)) / 3 - 0.5;
    const gz = (hash01(node.id, 31) + hash01(node.id, 32) + hash01(node.id, 33)) / 3 - 0.5;
    map.set(node.id, [centroid[0] + gx * 2 * spread, centroid[1] + gy * 2 * spread, centroid[2] + gz * 2 * spread]);
  });
  return map;
}

export function nodeRadius(node: ScenarioNode, isCore: boolean) {
  return (isCore ? 0.5 : 0.14) + node.importance * 0.34;
}

// 每个节点在其类型基色上做确定性色相/饱和/明度偏移，增加色彩层次（同类不再一个色）。
const tmpColor = new THREE.Color();
const tmpHsl = { h: 0, s: 0, l: 0 };
const clampN = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function nodeAccent(node: ScenarioNode): { core: string; glow: string } {
  tmpColor.set(NODE_TYPE_META[node.type].color);
  tmpColor.getHSL(tmpHsl);
  const dh = (hash01(node.id, 71) - 0.5) * 0.16;
  const ds = (hash01(node.id, 72) - 0.5) * 0.3;
  const dl = (hash01(node.id, 73) - 0.5) * 0.34;
  const h = (tmpHsl.h + dh + 1) % 1;
  const s = clampN(tmpHsl.s + ds, 0.45, 1);
  const l = clampN(tmpHsl.l + dl, 0.34, 0.78);
  tmpColor.setHSL(h, s, l);
  const core = `#${tmpColor.getHexString()}`;
  tmpColor.setHSL(h, clampN(s * 0.92, 0.4, 1), clampN(l + 0.16, 0.4, 0.92));
  const glow = `#${tmpColor.getHexString()}`;
  return { core, glow };
}
