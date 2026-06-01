"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ScenarioEdge, ScenarioNode } from "../types";

type ElectronCloud3DProps = {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  selectedNodeId: string;
  highlightedNodeIds?: string[];
  /** 聚焦集：非空时，集合外（且未选中）的节点会被压暗。用于"邻居聚焦"与"搜索高亮"。 */
  focusNodeIds?: string[] | null;
  onNodeSelect: (nodeId: string) => void;
  pulseSeed: number;
};

type PositionedNode = ScenarioNode & {
  position: THREE.Vector3;
};

// 语义节点配色：暗铜/琥珀为核心抉择与自我，深红表示风险，墨绿表示价值，其余为克制的银灰。
const nodeColors: Record<ScenarioNode["type"], string> = {
  action: "#a1a1aa",
  choice: "#f59e0b",
  evidence: "#71717a",
  organization: "#a1a1aa",
  path: "#d97706",
  person: "#d4d4d8",
  risk: "#b91c1c",
  self: "#fbbf24",
  value: "#10b981"
};

// 标签默认配色：在深空底色上保证可读性，核心语义类型略加暖/冷色调。
const labelColors: Record<ScenarioNode["type"], string> = {
  action: "#c7c7d1",
  choice: "#fcd34d",
  evidence: "#9a9aa5",
  organization: "#c7c7d1",
  path: "#fbbf24",
  person: "#dcdce4",
  risk: "#f0a3a3",
  self: "#fde68a",
  value: "#86efac"
};

const SELECTED_COLOR = "#fde68a";
const HIGHLIGHT_COLOR = "#f59e0b";
const SELECTED_LABEL = "#fef3c7";
const HIGHLIGHT_LABEL = "#fcd34d";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function buildPositions(nodes: ScenarioNode[]) {
  const shellCounts = new Map<number, number>();
  const shellSeen = new Map<number, number>();

  nodes.forEach((node) => shellCounts.set(node.shell, (shellCounts.get(node.shell) ?? 0) + 1));

  return nodes.map<PositionedNode>((node) => {
    const shellIndex = shellSeen.get(node.shell) ?? 0;
    const count = shellCounts.get(node.shell) ?? 1;
    shellSeen.set(node.shell, shellIndex + 1);

    if (node.shell === 0) {
      const offset = node.type === "self" ? 0.58 : -0.58;
      return { ...node, position: new THREE.Vector3(offset, 0, 0) };
    }

    const radius = 1.05 + node.shell * 0.92;
    const angle = (shellIndex / count) * Math.PI * 2 + node.shell * 0.48;
    const y = Math.sin(angle * 1.7 + node.shell) * (0.45 + node.shell * 0.2);

    return {
      ...node,
      position: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    };
  });
}

// 文字标签贴图：白色文字（运行时用 material.color 着色），带柔和描边以保证深空底色上的可读性。
function makeLabelTexture(text: string) {
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const fontSize = 40;
  const padX = 10;
  const padY = 8;
  const font = `500 ${fontSize}px "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif`;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  measureCtx.font = font;
  const textWidth = Math.ceil(measureCtx.measureText(text).width);

  const cssWidth = textWidth + padX * 2;
  const cssHeight = fontSize + padY * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(cssWidth * dpr);
  canvas.height = Math.ceil(cssHeight * dpr);

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  // 柔和阴影描边：让浅色文字在亮节点附近也清晰
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, padX, cssHeight / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 2;
  texture.needsUpdate = true;

  return { texture, aspect: cssWidth / cssHeight };
}

// 节点辉光精灵贴图：径向渐变白色光斑，叠加混合后形成"发光核心 + bloom"质感。
function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.75)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// 底层螺旋星系：提供"内核科幻"的沉浸感，作为决策图谱漂浮其上的深空背景。
function buildGalaxy() {
  const params = {
    count: 9000,
    size: 0.085,
    radius: 16,
    branches: 3,
    spin: 1.05,
    randomness: 0.55,
    randomnessPower: 3,
    insideColor: "#f59e0b", // 核心：温暖暗铜
    outsideColor: "#312e81" // 边缘：深邃靛蓝
  };

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(params.count * 3);
  const colors = new Float32Array(params.count * 3);
  const colorInside = new THREE.Color(params.insideColor);
  const colorOutside = new THREE.Color(params.outsideColor);

  for (let i = 0; i < params.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * params.radius;
    const spinAngle = radius * params.spin;
    const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;

    const sign = () => (Math.random() < 0.5 ? 1 : -1);
    const randomX = Math.pow(Math.random(), params.randomnessPower) * sign() * params.randomness * radius;
    const randomY = Math.pow(Math.random(), params.randomnessPower) * sign() * params.randomness * radius;
    const randomZ = Math.pow(Math.random(), params.randomnessPower) * sign() * params.randomness * radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY * 0.18; // 压扁成星系盘
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const mixed = colorInside.clone().lerp(colorOutside, radius / params.radius);
    colors[i3] = mixed.r;
    colors[i3 + 1] = mixed.g;
    colors[i3 + 2] = mixed.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: params.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.58
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = Math.PI * 0.2;
  points.position.y = -1.8;
  points.renderOrder = -1;
  return { points, geometry, material };
}

// 远景星点层：包裹整个场景的稀疏白色星点，增强"深空 + 闪烁"的纵深感。
function buildStarfield() {
  const count = 1400;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // 球壳分布，留出中心给决策图谱
    const radius = 9 + Math.random() * 16;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.cos(phi) * 0.7;
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 0.05,
    sizeAttenuation: true,
    color: "#cdd2ff",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = -2;
  return { points, geometry, material };
}

export default function ElectronCloud3D({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds = [],
  focusNodeIds = null,
  onNodeSelect,
  pulseSeed
}: ElectronCloud3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedNodeId);
  const highlightedSetRef = useRef<Set<string>>(new Set(highlightedNodeIds));
  const focusSetRef = useRef<Set<string> | null>(focusNodeIds && focusNodeIds.length ? new Set(focusNodeIds) : null);
  const onNodeSelectRef = useRef(onNodeSelect);
  const pulseSeedRef = useRef(pulseSeed);
  const styleDirtyRef = useRef(true);

  const [renderMode, setRenderMode] = useState<"pending" | "webgl" | "fallback">("pending");

  const positionedNodes = useMemo(() => buildPositions(nodes), [nodes]);
  const highlightedKey = useMemo(() => highlightedNodeIds.join("|"), [highlightedNodeIds]);
  const focusKey = useMemo(() => (focusNodeIds ? focusNodeIds.join("|") : ""), [focusNodeIds]);

  // 实时同步交互状态到 ref，供渲染循环读取（避免因选中态变化而重建整个场景）。
  onNodeSelectRef.current = onNodeSelect;
  pulseSeedRef.current = pulseSeed;

  // 仅在选中/高亮变化时打脏标记，由动画循环增量刷新颜色与高亮连线，无需重建场景。
  useEffect(() => {
    selectedIdRef.current = selectedNodeId;
    highlightedSetRef.current = new Set(highlightedNodeIds);
    focusSetRef.current = focusNodeIds && focusNodeIds.length ? new Set(focusNodeIds) : null;
    styleDirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, highlightedKey, focusKey]);

  // 重场景构建：仅在节点/连线结构变化时执行一次。
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    if (!isWebGLAvailable()) {
      setRenderMode("fallback");
      return;
    }

    const reduceMotion = prefersReducedMotion();
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const nodeIndex = new Map(positionedNodes.map((node, index) => [node.id, { node, index }]));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030308");
    scene.fog = new THREE.FogExp2("#030308", 0.014);

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 1000);
    camera.position.set(0, 0.5, 8.6);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      setRenderMode("fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    setRenderMode("webgl");

    // --- 远景星点 + 深空螺旋星系背景 ---
    const starfield = buildStarfield();
    scene.add(starfield.points);

    const galaxy = buildGalaxy();
    scene.add(galaxy.points);

    // 共享的辉光贴图（节点核心 bloom）
    const glowTexture = makeGlowTexture();

    // --- 决策图谱组（漂浮在星系之上） ---
    const graphGroup = new THREE.Group();
    graphGroup.rotation.x = -0.05;
    scene.add(graphGroup);

    const ambient = new THREE.AmbientLight("#f4f4f5", 0.7);
    const keyLight = new THREE.PointLight("#f59e0b", 2.4, 28);
    keyLight.position.set(3.5, 4, 5);
    scene.add(ambient, keyLight);

    // 节点本体（不透明，写入深度，让星系被正确遮挡）
    const nodeGeometry = new THREE.SphereGeometry(0.115, 22, 22);
    const nodeMaterial = new THREE.MeshBasicMaterial();
    const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, positionedNodes.length);
    nodeMesh.renderOrder = 1;

    // 节点外发光光晕（叠加混合，营造"发光节点"质感）
    const glowGeometry = new THREE.SphereGeometry(0.26, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowMesh = new THREE.InstancedMesh(glowGeometry, glowMaterial, positionedNodes.length);
    glowMesh.renderOrder = 0;

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scaleVector = new THREE.Vector3();
    const color = new THREE.Color();

    // 每个节点的核心 bloom 精灵 + 文字标签 + 部分节点的原子轨道环
    type NodeDeco = {
      index: number;
      bloom: THREE.Sprite;
      label: THREE.Sprite;
      labelBase: THREE.Color;
      rings: Array<{ mesh: THREE.Mesh; speed: number; axis: "x" | "y" | "z" }>;
    };
    const decos: NodeDeco[] = [];
    const bloomMaterials: THREE.SpriteMaterial[] = [];
    const labelTextures: THREE.Texture[] = [];
    const labelMaterials: THREE.SpriteMaterial[] = [];
    const ringGeometries: THREE.BufferGeometry[] = [];
    const ringMaterials: THREE.Material[] = [];

    positionedNodes.forEach((node, index) => {
      const scale = 0.72 + node.weight / 140;
      scaleVector.set(scale, scale, scale);
      matrix.compose(node.position, quaternion, scaleVector);
      nodeMesh.setMatrixAt(index, matrix);

      const glowScale = scale * (node.shell === 0 ? 1.5 : 1.2);
      scaleVector.set(glowScale, glowScale, glowScale);
      matrix.compose(node.position, quaternion, scaleVector);
      glowMesh.setMatrixAt(index, matrix);

      const baseColor = new THREE.Color(nodeColors[node.type]);

      // 核心 bloom 精灵（径向辉光，叠加在节点上形成发亮核心）
      const bloomMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: baseColor.clone(),
        transparent: true,
        opacity: node.shell === 0 ? 0.85 : 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      });
      const bloom = new THREE.Sprite(bloomMaterial);
      const bloomScale = (node.shell === 0 ? 1.5 : 1.0) * (0.7 + node.weight / 120);
      bloom.scale.setScalar(bloomScale);
      bloom.position.copy(node.position);
      bloom.renderOrder = 2;
      graphGroup.add(bloom);
      bloomMaterials.push(bloomMaterial);

      // 文字标签精灵（白字 + material.color 着色），锚定在节点右侧
      const { texture: labelTexture, aspect } = makeLabelTexture(node.label);
      const labelBase = new THREE.Color(labelColors[node.type]);
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        color: labelBase.clone(),
        transparent: true,
        opacity: 0, // 默认隐藏，由 applyStyles 在选中/相关时点亮
        depthWrite: false,
        depthTest: false
      });
      const label = new THREE.Sprite(labelMaterial);
      const labelHeight = 0.22 + node.weight / 520;
      label.scale.set(labelHeight * aspect, labelHeight, 1);
      label.center.set(0, 0.5); // 左-中锚点，让文字从节点右侧向外延伸
      label.position.copy(node.position).add(new THREE.Vector3(scale * 0.14 + 0.05, 0.02, 0));
      label.renderOrder = 5;
      graphGroup.add(label);
      labelTextures.push(labelTexture);
      labelMaterials.push(labelMaterial);

      // 原子轨道环：仅给核心/高权重节点添加，避免拥挤
      const rings: NodeDeco["rings"] = [];
      const isProminent = node.shell <= 1 || node.weight >= 62 || node.type === "choice" || node.type === "self";
      if (isProminent) {
        const ringCount = node.shell === 0 ? 2 : 1;
        for (let r = 0; r < ringCount; r++) {
          const ringRadius = scale * (0.42 + r * 0.16);
          const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.006, 6, 90);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: baseColor.clone().lerp(new THREE.Color("#ffffff"), 0.3),
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.copy(node.position);
          ring.rotation.x = Math.PI / 2 + (r === 0 ? 0.5 : -0.4);
          ring.rotation.y = r * 0.8 + index * 0.3;
          ring.renderOrder = 1;
          graphGroup.add(ring);
          ringGeometries.push(ringGeometry);
          ringMaterials.push(ringMaterial);
          const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
          rings.push({ mesh: ring, speed: 0.004 + Math.random() * 0.006, axis: axes[(index + r) % 3] });
        }
      }

      decos.push({ index, bloom, label, labelBase, rings });
    });
    nodeMesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
    graphGroup.add(glowMesh);
    graphGroup.add(nodeMesh);

    // 全部连线（暗色底层，构建一次）
    const baseLinePositions: number[] = [];
    edges.forEach((edge) => {
      const source = nodeIndex.get(edge.source)?.node.position;
      const target = nodeIndex.get(edge.target)?.node.position;
      if (!source || !target) return;
      baseLinePositions.push(source.x, source.y, source.z, target.x, target.y, target.z);
    });
    const baseLineGeometry = new THREE.BufferGeometry();
    baseLineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(baseLinePositions, 3));
    const baseLineMaterial = new THREE.LineBasicMaterial({ color: "#3f3f46", transparent: true, opacity: 0.28 });
    const baseLineSegments = new THREE.LineSegments(baseLineGeometry, baseLineMaterial);
    graphGroup.add(baseLineSegments);

    // 高亮连线（与选中/高亮节点相关，叠加在上层，随交互动态刷新）
    const highlightGeometry = new THREE.BufferGeometry();
    highlightGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(edges.length * 6), 3));
    const highlightMaterial = new THREE.LineBasicMaterial({ color: "#fcd34d", transparent: true, opacity: 0.7 });
    const highlightSegments = new THREE.LineSegments(highlightGeometry, highlightMaterial);
    highlightSegments.renderOrder = 2;
    graphGroup.add(highlightSegments);

    // 同心壳层指示环
    const ringGroup = new THREE.Group();
    const shellRingMeshes: THREE.Mesh[] = [];
    [1, 2, 3, 4].forEach((shell) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.55 + shell * 1.18, 0.004, 6, 128),
        new THREE.MeshBasicMaterial({ color: "#27272a", transparent: true, opacity: 0.32 })
      );
      ring.rotation.x = Math.PI / 2;
      shellRingMeshes.push(ring);
      ringGroup.add(ring);
    });
    graphGroup.add(ringGroup);

    // 焦点大扫掠圆环：围绕选中节点的多圈大同心环，随选中节点移动、缓慢自转。
    const focalGroup = new THREE.Group();
    const focalRings: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    const focalSpecs = [
      { radius: 0.62, tilt: 0.4, tiltY: 0.2, opacity: 0.55 },
      { radius: 0.92, tilt: -0.7, tiltY: 0.5, opacity: 0.4 },
      { radius: 1.34, tilt: 0.3, tiltY: -0.6, opacity: 0.28 },
      { radius: 1.9, tilt: -0.45, tiltY: 0.35, opacity: 0.18 }
    ];
    focalSpecs.forEach((spec, i) => {
      const geometry = new THREE.TorusGeometry(spec.radius, 0.008, 8, 160);
      const material = new THREE.MeshBasicMaterial({
        color: "#fcd34d",
        transparent: true,
        opacity: spec.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI / 2 + spec.tilt;
      ring.rotation.y = spec.tiltY;
      ringGeometries.push(geometry);
      ringMaterials.push(material);
      focalGroup.add(ring);
      focalRings.push({ mesh: ring, speed: (i % 2 === 0 ? 1 : -1) * (0.0025 + i * 0.0015) });
    });
    focalGroup.visible = false;
    graphGroup.add(focalGroup);

    // 选中节点的脉冲光环
    const haloGeometry = new THREE.SphereGeometry(0.3, 24, 24);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.34,
      wireframe: true
    });
    const selectedHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    selectedHalo.renderOrder = 3;
    graphGroup.add(selectedHalo);

    // 增量刷新：节点配色 + bloom/标签着色 + 高亮连线（由 styleDirtyRef 触发）
    const applyStyles = () => {
      const selId = selectedIdRef.current;
      const highlighted = highlightedSetRef.current;
      const focus = focusSetRef.current;
      const dimColor = new THREE.Color("#0a0a16");

      positionedNodes.forEach((node, index) => {
        const isSelected = node.id === selId;
        const isHighlighted = highlighted.has(node.id);
        const isDimmed = focus !== null && !focus.has(node.id) && !isSelected;
        const base = isSelected ? SELECTED_COLOR : isHighlighted ? HIGHLIGHT_COLOR : nodeColors[node.type];
        color.set(base);
        if (isDimmed) color.lerp(dimColor, 0.82);
        nodeMesh.setColorAt(index, color);
        glowMesh.setColorAt(index, color);
      });
      nodeMesh.instanceColor!.needsUpdate = true;
      glowMesh.instanceColor!.needsUpdate = true;

      // bloom 与标签着色：当前最亮、邻居/匹配次亮、无关压暗
      decos.forEach((deco) => {
        const node = positionedNodes[deco.index];
        const isSelected = node.id === selId;
        const isHighlighted = highlighted.has(node.id);
        const isDimmed = focus !== null && !focus.has(node.id) && !isSelected;
        const bloomColor = isSelected ? SELECTED_COLOR : isHighlighted ? HIGHLIGHT_COLOR : nodeColors[node.type];
        deco.bloom.material.color.set(bloomColor);
        deco.bloom.material.opacity = isDimmed ? 0.04 : isSelected ? 1 : isHighlighted ? 0.8 : node.shell === 0 ? 0.85 : 0.6;

        const labelColor = isSelected ? SELECTED_LABEL : isHighlighted ? HIGHLIGHT_LABEL : `#${deco.labelBase.getHexString()}`;
        deco.label.material.color.set(labelColor);
        // 标签仅在选中及其相关/匹配节点时显示，无关隐藏
        deco.label.material.opacity = isDimmed ? 0 : isSelected ? 1 : isHighlighted ? 0.7 : 0;
      });

      const positionAttribute = highlightGeometry.getAttribute("position") as THREE.BufferAttribute;
      const array = positionAttribute.array as Float32Array;
      let cursor = 0;
      edges.forEach((edge) => {
        const isRelated =
          highlighted.has(edge.source) ||
          highlighted.has(edge.target) ||
          edge.source === selId ||
          edge.target === selId;
        if (!isRelated) return;
        const source = nodeIndex.get(edge.source)?.node.position;
        const target = nodeIndex.get(edge.target)?.node.position;
        if (!source || !target) return;
        array[cursor++] = source.x;
        array[cursor++] = source.y;
        array[cursor++] = source.z;
        array[cursor++] = target.x;
        array[cursor++] = target.y;
        array[cursor++] = target.z;
      });
      highlightGeometry.setDrawRange(0, cursor / 3);
      positionAttribute.needsUpdate = true;
    };

    // --- 指针交互：拖拽旋转、滚轮缩放、点击选择 ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragDistance = 0;
    let targetRotationX = graphGroup.rotation.x;
    let targetRotationY = 0;

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const handlePointerDown = (event: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      targetRotationY += dx * 0.004;
      targetRotationX = clampRotation(targetRotationX + dy * 0.0025);
      lastX = event.clientX;
      lastY = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      isDragging = false;
      if (dragDistance > 8) return; // 视为拖拽，不触发选择

      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(nodeMesh);
      const instanceId = intersections[0]?.instanceId;
      if (typeof instanceId === "number" && positionedNodes[instanceId]) {
        onNodeSelectRef.current(positionedNodes[instanceId].id);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = Math.max(5.6, Math.min(13, camera.position.z + event.deltaY * 0.005));
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });

    // --- 动画循环 ---
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const render = () => {
      if (styleDirtyRef.current) {
        applyStyles();
        styleDirtyRef.current = false;
      }

      const elapsed = clock.getElapsedTime();

      if (!reduceMotion) {
        targetRotationY += 0.0008 + pulseSeedRef.current * 0.000002;
        galaxy.points.rotation.y = elapsed * 0.02;
        starfield.points.rotation.y = elapsed * 0.006;
        ringGroup.rotation.z += 0.0007;

        // 原子轨道环自转
        decos.forEach((deco) => {
          deco.rings.forEach((ring) => {
            ring.mesh.rotation[ring.axis] += ring.speed;
          });
        });
        // 焦点大圆环自转
        focalRings.forEach((ring) => {
          ring.mesh.rotation.z += ring.speed;
        });
      }
      graphGroup.rotation.y += (targetRotationY - graphGroup.rotation.y) * 0.06;
      graphGroup.rotation.x += (targetRotationX - graphGroup.rotation.x) * 0.06;

      const selected = nodeIndex.get(selectedIdRef.current)?.node;
      if (selected) {
        selectedHalo.visible = true;
        selectedHalo.position.copy(selected.position);
        const pulse = reduceMotion ? 1.04 : 1 + Math.sin(elapsed * 4) * 0.11;
        selectedHalo.scale.setScalar(pulse);

        focalGroup.visible = true;
        focalGroup.position.copy(selected.position);
        const focalPulse = reduceMotion ? 1 : 1 + Math.sin(elapsed * 1.6) * 0.03;
        focalGroup.scale.setScalar(focalPulse);
      } else {
        selectedHalo.visible = false;
        focalGroup.visible = false;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      const nextWidth = Math.max(1, mount.clientWidth);
      const nextHeight = Math.max(1, mount.clientHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mount);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(animationFrameId);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);

      starfield.geometry.dispose();
      starfield.material.dispose();
      galaxy.geometry.dispose();
      galaxy.material.dispose();
      glowTexture.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      baseLineGeometry.dispose();
      baseLineMaterial.dispose();
      highlightGeometry.dispose();
      highlightMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      bloomMaterials.forEach((material) => material.dispose());
      labelTextures.forEach((texture) => texture.dispose());
      labelMaterials.forEach((material) => material.dispose());
      ringGeometries.forEach((geometry) => geometry.dispose());
      ringMaterials.forEach((material) => material.dispose());
      shellRingMeshes.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
    // 仅依赖结构数据，选中/高亮通过 ref + styleDirtyRef 增量更新。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionedNodes, edges]);

  if (renderMode === "fallback") {
    return (
      <FallbackGraph
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedNodeId}
        highlightedNodeIds={highlightedNodeIds}
        onNodeSelect={onNodeSelect}
      />
    );
  }

  return <div ref={mountRef} className="h-full w-full cursor-crosshair" aria-hidden="true" />;
}

function clampRotation(value: number) {
  return Math.max(-0.78, Math.min(0.42, value));
}

const fallbackTypeLabels: Record<ScenarioNode["type"], string> = {
  action: "行动",
  choice: "抉择",
  evidence: "证据",
  organization: "组织",
  path: "路径",
  person: "人物",
  risk: "风险",
  self: "自我",
  value: "价值"
};

// 无 WebGL（或被禁用）时的 2D 降级视图：按壳层分组、可点击选择，保持核心交互可用。
function FallbackGraph({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds = [],
  onNodeSelect
}: Omit<ElectronCloud3DProps, "pulseSeed">) {
  const highlighted = new Set(highlightedNodeIds);
  const shells = Array.from(new Set(nodes.map((node) => node.shell))).sort((a, b) => a - b);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#030308] p-5">
      <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        2D 图谱视图（当前环境未启用 WebGL）· {nodes.length} 节点 / {edges.length} 链接
      </div>
      <div className="space-y-5">
        {shells.map((shell) => (
          <div key={shell}>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-600">Shell {shell}</div>
            <div className="flex flex-wrap gap-2">
              {nodes
                .filter((node) => node.shell === shell)
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isHighlighted = highlighted.has(node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onNodeSelect(node.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/15 text-amber-200"
                          : isHighlighted
                            ? "border-amber-500/50 text-amber-200/80"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      [[{node.label}]]
                      <span className="ml-2 text-[10px] text-zinc-600">{fallbackTypeLabels[node.type]}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
