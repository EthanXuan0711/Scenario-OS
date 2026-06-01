"use client";

// 真 3D 星系引擎（react-three-fiber + drei + postprocessing）
// 节点=发光球（emissive + Bloom），连线=3D 线，相机可环绕/缩放/飞向选中节点。
// 复用 useGalaxyData 的状态与派生数据，渲染层完全 3D 化。

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { NODE_TYPE_META, type ScenarioNode } from "./galaxyTypes";
import { coreNodeId } from "./galaxyMockData";
import { build3DPositions, nodeAccent, nodeRadius, type Vec3 } from "./galaxy3DLayout";
import type { NodeVisualState, UseGalaxyData } from "./useGalaxyData";

function labelStyle(selected: boolean): CSSProperties {
  return {
    whiteSpace: "nowrap",
    padding: "2px 9px",
    borderRadius: 9,
    fontSize: selected ? 13 : 12,
    fontWeight: 500,
    color: selected ? "#fef3c7" : "#e6e9f4",
    background: "rgba(8,10,20,0.68)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
    transform: "translateY(-2px)"
  };
}

function setCursor(value: string) {
  if (typeof document !== "undefined") document.body.style.cursor = value;
}

type NodeMeshProps = {
  node: ScenarioNode;
  pos: Vec3;
  isCore: boolean;
  state: NodeVisualState;
  isHovered: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

function NodeMesh({ node, pos, isCore, state, isHovered, showLabel, onSelect, onHover }: NodeMeshProps) {
  const group = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const accent = useMemo(() => nodeAccent(node), [node.id]);
  const selected = state === "selected";
  const dim = state === "dim";
  const neighbor = state === "neighbor";
  const radius = nodeRadius(node, isCore);
  const prominent = (isCore || node.importance > 0.55) && !dim;

  const targetScale = selected ? 1.7 : isHovered ? 1.3 : 1;
  const emissiveIntensity = selected ? 3.4 : isHovered ? 2.7 : neighbor ? 2.1 : dim ? 0.25 : 1.5;

  useFrame((_, delta) => {
    const g = group.current;
    if (g) {
      const next = g.scale.x + (targetScale - g.scale.x) * 0.18;
      g.scale.setScalar(next);
    }
    if (orbitRef.current) {
      orbitRef.current.rotation.y += delta * 0.5;
      orbitRef.current.rotation.x += delta * 0.18;
    }
  });

  return (
    <group ref={group} position={pos}>
      <mesh
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHover(node.id);
          setCursor("pointer");
        }}
        onPointerOut={() => {
          onHover(null);
          setCursor("auto");
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={accent.core}
          emissive={accent.core}
          emissiveIntensity={emissiveIntensity}
          roughness={0.35}
          metalness={0.1}
          transparent
          opacity={dim ? 0.5 : 1}
          toneMapped={false}
        />
      </mesh>

      {/* 原子轨道环（核心 / 高权重节点，缓慢自转） */}
      {prominent && (
        <group ref={orbitRef}>
          <mesh rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[radius * 2.1, radius * 0.04, 6, 64]} />
            <meshBasicMaterial color={accent.glow} transparent opacity={0.55} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 3.2, Math.PI / 4, 0]}>
            <torusGeometry args={[radius * 2.8, radius * 0.03, 6, 64]} />
            <meshBasicMaterial color={accent.glow} transparent opacity={0.3} toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* 风险节点外环 */}
      {node.status === "risk" && !dim && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.6, 0.012, 6, 40]} />
          <meshBasicMaterial color="#ff8492" transparent opacity={0.6} toneMapped={false} />
        </mesh>
      )}

      {showLabel && (
        <Html center position={[0, radius + 0.55, 0]} distanceFactor={14} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div style={labelStyle(selected)}>{node.label}</div>
        </Html>
      )}
    </group>
  );
}

function Nodes({ data, positions }: { data: UseGalaxyData; positions: Map<string, Vec3> }) {
  const visible = data.nodes.filter((node) => data.visibleNodeIds.has(node.id));
  return (
    <>
      {visible.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const isHovered = data.hoveredId === node.id;
        const showLabel =
          node.id === data.selectedId || isHovered || (data.focusMode && data.neighborIds.has(node.id));
        return (
          <NodeMesh
            key={node.id}
            node={node}
            pos={pos}
            isCore={node.id === coreNodeId}
            state={data.nodeStateOf(node.id)}
            isHovered={isHovered}
            showLabel={showLabel}
            onSelect={data.select}
            onHover={data.hover}
          />
        );
      })}
    </>
  );
}

function Edges({ data, positions }: { data: UseGalaxyData; positions: Map<string, Vec3> }) {
  const { baseGeom, activeGeom } = useMemo(() => {
    const basePos: number[] = [];
    const activePos: number[] = [];
    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const control = new THREE.Vector3();
    const SEGMENTS = 16;
    const pushCurve = (arr: number[], a: Vec3, b: Vec3) => {
      va.set(a[0], a[1], a[2]);
      vb.set(b[0], b[1], b[2]);
      mid.addVectors(va, vb).multiplyScalar(0.5);
      const dist = va.distanceTo(vb);
      // 控制点：中点沿"远离星系中心"方向外凸 + 轻微上扬，形成弯曲弧线。
      dir.copy(mid);
      if (dir.lengthSq() > 0.0001) dir.normalize();
      else dir.set(0, 1, 0);
      control.copy(mid).addScaledVector(dir, dist * 0.24);
      control.y += dist * 0.1;
      const curve = new THREE.QuadraticBezierCurve3(va, control, vb);
      const points = curve.getPoints(SEGMENTS);
      for (let i = 0; i < points.length - 1; i++) {
        arr.push(points[i].x, points[i].y, points[i].z, points[i + 1].x, points[i + 1].y, points[i + 1].z);
      }
    };
    data.visibleEdges.forEach((edge) => {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) return;
      const isActive = Boolean(edge.mainPath) || data.activeEdgeIds.has(edge.id);
      pushCurve(isActive ? activePos : basePos, a, b);
    });
    const baseGeom = new THREE.BufferGeometry();
    baseGeom.setAttribute("position", new THREE.Float32BufferAttribute(basePos, 3));
    const activeGeom = new THREE.BufferGeometry();
    activeGeom.setAttribute("position", new THREE.Float32BufferAttribute(activePos, 3));
    return { baseGeom, activeGeom };
  }, [data.visibleEdges, data.activeEdgeIds, positions]);

  useEffect(() => () => {
    baseGeom.dispose();
    activeGeom.dispose();
  }, [baseGeom, activeGeom]);

  return (
    <>
      <lineSegments geometry={baseGeom}>
        <lineBasicMaterial color="#3a4870" transparent opacity={0.16} />
      </lineSegments>
      <lineSegments geometry={activeGeom}>
        <lineBasicMaterial color="#fcd34d" transparent opacity={0.85} toneMapped={false} />
      </lineSegments>
    </>
  );
}

function FocusRing3D({ pos, color }: { pos: Vec3; color: string }) {
  const ring = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (ring.current) ring.current.rotation.z += delta * 0.6;
    if (pulse.current) {
      const p = (elapsed.current % 2.4) / 2.4;
      pulse.current.scale.setScalar(1 + p * 3.2);
      const material = pulse.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 * (1 - p);
    }
  });

  return (
    <group position={pos}>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.02, 8, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh ref={pulse} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.014, 8, 56]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CameraRig({ focus }: { focus: Vec3 | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3());
  const camVec = useRef(new THREE.Vector3());

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (focus) {
      c.autoRotate = false;
      targetVec.current.set(focus[0], focus[1], focus[2]);
      camVec.current.set(focus[0] + 3.4, focus[1] + 2.2, focus[2] + 5.6);
      c.target.lerp(targetVec.current, 0.06);
      camera.position.lerp(camVec.current, 0.05);
    } else {
      c.autoRotate = true;
      targetVec.current.set(0, 0, 0);
      c.target.lerp(targetVec.current, 0.04);
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      autoRotateSpeed={0.35}
      minDistance={4}
      maxDistance={240}
      enablePan={false}
    />
  );
}

export default function Galaxy3D({ data }: { data: UseGalaxyData }) {
  const positions = useMemo(() => build3DPositions(data.nodes), [data.nodes]);
  const focus = data.selectedId ? positions.get(data.selectedId) ?? null : null;
  const focusColor = data.selectedNode ? NODE_TYPE_META[data.selectedNode.type].glow : "#ffffff";

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 8, 74], fov: 55, near: 0.1, far: 800 }}
      gl={{ antialias: true }}
      onPointerMissed={() => data.clearSelection()}
    >
      <color attach="background" args={["#04060e"]} />
      <fog attach="fog" args={["#04060e", 95, 320]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[40, 32, 26]} intensity={1.4} color="#f5d97a" />
      <pointLight position={[-40, -26, -20]} intensity={0.6} color="#6ea8ff" />

      <Stars radius={340} depth={200} count={8000} factor={6} saturation={0.5} fade speed={0.32} />

      <Edges data={data} positions={positions} />
      <Nodes data={data} positions={positions} />
      {focus && <FocusRing3D pos={focus} color={focusColor} />}

      <CameraRig focus={focus} />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
