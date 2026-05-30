"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ScenarioEdge, ScenarioNode } from "../types";

type ElectronCloud3DProps = {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  selectedNodeId: string;
  highlightedNodeIds?: string[];
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

const SELECTED_COLOR = "#fde68a";
const HIGHLIGHT_COLOR = "#f59e0b";

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

// 底层螺旋星系：提供"内核科幻"的沉浸感，作为决策图谱漂浮其上的深空背景。
function buildGalaxy() {
  const params = {
    count: 6500,
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
    opacity: 0.52
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = Math.PI * 0.2;
  points.position.y = -1.8;
  points.renderOrder = -1;
  return { points, geometry, material };
}

export default function ElectronCloud3D({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds = [],
  onNodeSelect,
  pulseSeed
}: ElectronCloud3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedNodeId);
  const highlightedSetRef = useRef<Set<string>>(new Set(highlightedNodeIds));
  const onNodeSelectRef = useRef(onNodeSelect);
  const pulseSeedRef = useRef(pulseSeed);
  const styleDirtyRef = useRef(true);

  const [renderMode, setRenderMode] = useState<"pending" | "webgl" | "fallback">("pending");

  const positionedNodes = useMemo(() => buildPositions(nodes), [nodes]);
  const highlightedKey = useMemo(() => highlightedNodeIds.join("|"), [highlightedNodeIds]);

  // 实时同步交互状态到 ref，供渲染循环读取（避免因选中态变化而重建整个场景）。
  onNodeSelectRef.current = onNodeSelect;
  pulseSeedRef.current = pulseSeed;

  // 仅在选中/高亮变化时打脏标记，由动画循环增量刷新颜色与高亮连线，无需重建场景。
  useEffect(() => {
    selectedIdRef.current = selectedNodeId;
    highlightedSetRef.current = new Set(highlightedNodeIds);
    styleDirtyRef.current = true;
  }, [selectedNodeId, highlightedKey, highlightedNodeIds]);

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
    scene.fog = new THREE.FogExp2("#030308", 0.015);

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

    // --- 深空螺旋星系背景 ---
    const galaxy = buildGalaxy();
    scene.add(galaxy.points);

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
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowMesh = new THREE.InstancedMesh(glowGeometry, glowMaterial, positionedNodes.length);
    glowMesh.renderOrder = 0;

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scaleVector = new THREE.Vector3();
    const color = new THREE.Color();

    positionedNodes.forEach((node, index) => {
      const scale = 0.72 + node.weight / 140;
      scaleVector.set(scale, scale, scale);
      matrix.compose(node.position, quaternion, scaleVector);
      nodeMesh.setMatrixAt(index, matrix);

      const glowScale = scale * (node.shell === 0 ? 1.5 : 1.2);
      scaleVector.set(glowScale, glowScale, glowScale);
      matrix.compose(node.position, quaternion, scaleVector);
      glowMesh.setMatrixAt(index, matrix);
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
    const ringMeshes: THREE.Mesh[] = [];
    [1, 2, 3, 4].forEach((shell) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.55 + shell * 1.18, 0.004, 6, 128),
        new THREE.MeshBasicMaterial({ color: "#27272a", transparent: true, opacity: 0.32 })
      );
      ring.rotation.x = Math.PI / 2;
      ringMeshes.push(ring);
      ringGroup.add(ring);
    });
    graphGroup.add(ringGroup);

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

    // 增量刷新：节点配色 + 高亮连线（由 styleDirtyRef 触发）
    const applyStyles = () => {
      const selId = selectedIdRef.current;
      const highlighted = highlightedSetRef.current;

      positionedNodes.forEach((node, index) => {
        const isSelected = node.id === selId;
        const isHighlighted = highlighted.has(node.id);
        const base = isSelected ? SELECTED_COLOR : isHighlighted ? HIGHLIGHT_COLOR : nodeColors[node.type];
        nodeMesh.setColorAt(index, color.set(base));
        glowMesh.setColorAt(index, color.set(base));
      });
      nodeMesh.instanceColor!.needsUpdate = true;
      glowMesh.instanceColor!.needsUpdate = true;

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
        ringGroup.rotation.z += 0.0007;
      }
      graphGroup.rotation.y += (targetRotationY - graphGroup.rotation.y) * 0.06;
      graphGroup.rotation.x += (targetRotationX - graphGroup.rotation.x) * 0.06;

      const selected = nodeIndex.get(selectedIdRef.current)?.node;
      if (selected) {
        selectedHalo.visible = true;
        selectedHalo.position.copy(selected.position);
        const pulse = reduceMotion ? 1.04 : 1 + Math.sin(elapsed * 4) * 0.11;
        selectedHalo.scale.setScalar(pulse);
      } else {
        selectedHalo.visible = false;
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

      galaxy.geometry.dispose();
      galaxy.material.dispose();
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
      ringMeshes.forEach((ring) => {
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
