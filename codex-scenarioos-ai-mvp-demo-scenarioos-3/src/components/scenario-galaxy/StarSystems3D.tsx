"use client";

// 社会沙盘 · 银河（均匀打散）→ 决策路径。
// 默认：大量原子元素均匀分布、各自独立、平滑漂移（无聚集、无固定环绕）。
// 输入问题 / 加入条件：相关元素飞出、汇聚到中心连成一条有联系的路径（带连线）。
// 标签默认隐藏，点击节点才显示；每颗星球颜色都不同（多彩低饱和）。

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useSharedScenario, type SharedScenario } from "../scenarioBridge";
import { galaxyLabelsFor } from "../deriveScenario";
import type { NodeType } from "./galaxyTypes";
import type { SandboxNode } from "./sandboxScoring";

const N_NODES = 150; // 银河节点总数
const GAL_R = 58; // 银河盘半径
const GAL_Y = 14; // 银河盘半厚
const PATH_R = 13; // 决策路径汇聚半径
const DRIFT_AMP = 2.4; // 漂移幅度（平滑、低频）
const ARMS = 3; // 旋臂数量
const SPIRAL_TWIST = 3.6; // 旋臂缠绕强度

const TYPES: NodeType[] = ["event", "actor", "platform", "risk", "outcome"];
const POOLS: Record<NodeType, string[]> = {
  event: ["突发事件", "政策变动", "舆论爆点", "行业拐点", "资本异动", "技术突破", "周期转折", "机会窗口"],
  actor: ["关键人物", "家人", "挚友", "对手", "投资人", "导师", "同行", "决策者"],
  platform: ["公司", "平台", "社群", "媒体", "机构", "市场", "渠道", "生态"],
  risk: ["现金流", "健康", "关系", "时间", "声誉", "竞争", "合规", "情绪"],
  outcome: ["破圈成功", "稳步增长", "原地踏步", "及时止损", "意外转机", "长期主义", "复利积累", "重新洗牌"]
};

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _c = new THREE.Color();
// 多彩低饱和：全色相 + 受控饱和/明度（融合墨蓝/墨绿/深紫/莫兰迪的沉静质感）
function diverseColor(rng: () => number, bright = false) {
  _c.setHSL(rng(), bright ? 0.5 + rng() * 0.25 : 0.32 + rng() * 0.3, bright ? 0.6 + rng() * 0.12 : 0.46 + rng() * 0.2);
  return "#" + _c.getHexString();
}

type Drift = { a1: number; f1: number; p1: number; a2: number; f2: number; p2: number };
function mkDrift(rng: () => number): Drift {
  return {
    a1: DRIFT_AMP * (0.6 + rng() * 0.8),
    f1: 0.08 + rng() * 0.18,
    p1: rng() * Math.PI * 2,
    a2: DRIFT_AMP * (0.3 + rng() * 0.5),
    f2: 0.16 + rng() * 0.26,
    p2: rng() * Math.PI * 2
  };
}
const driftAxis = (d: Drift, t: number) => d.a1 * Math.sin(t * d.f1 + d.p1) + d.a2 * Math.sin(t * d.f2 + d.p2);
const smoothstep = (x: number) => x * x * (3 - 2 * x);

// 径向渐变贴图（星云软云团）
function makeRadialTexture(hex: string) {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, hex + "cc");
    g.addColorStop(0.35, hex + "55");
    g.addColorStop(1, hex + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

// 体积感星云背景（多片加色软云团，整体缓慢旋转）
function Nebula() {
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo(() => {
    const rng = mulberry32(424242);
    const palette = ["#2a3a7a", "#3a2a6a", "#1f5a5a", "#5a2a4a", "#243a8a", "#402a64"];
    return Array.from({ length: 8 }, (_, i) => ({
      tex: makeRadialTexture(palette[i % palette.length]),
      pos: [(rng() - 0.5) * 190, (rng() - 0.5) * 70, (rng() - 0.5) * 190 - 30] as [number, number, number],
      rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI] as [number, number, number],
      size: 90 + rng() * 110,
      opacity: 0.1 + rng() * 0.14
    }));
  }, []);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.008;
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={c.rot}>
          <planeGeometry args={[c.size, c.size]} />
          <meshBasicMaterial map={c.tex} transparent opacity={c.opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// 深空渐变天幕（巨大内壁球，竖向渐变营造空间纵深）
function makeSkyTexture() {
  const cv = document.createElement("canvas");
  cv.width = 8;
  cv.height = 256;
  const ctx = cv.getContext("2d");
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#0b0a1e");
    g.addColorStop(0.4, "#05060f");
    g.addColorStop(0.72, "#080612");
    g.addColorStop(1, "#120a24");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
  }
  return new THREE.CanvasTexture(cv);
}

function DeepSpace() {
  const tex = useMemo(makeSkyTexture, []);
  return (
    <mesh scale={600}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} toneMapped={false} fog={false} />
    </mesh>
  );
}

// 明亮星系核（中心隆起 + 多层光晕 Billboard）
function GalacticCore() {
  const halo = useMemo(() => makeRadialTexture("#ffe7b8"), []);
  return (
    <group>
      <Billboard>
        <mesh>
          <planeGeometry args={[44, 44]} />
          <meshBasicMaterial map={halo} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>
      <Billboard>
        <mesh>
          <planeGeometry args={[18, 18]} />
          <meshBasicMaterial map={halo} transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>
      <mesh>
        <sphereGeometry args={[2, 24, 24]} />
        <meshBasicMaterial color="#fff4d6" toneMapped={false} />
      </mesh>
    </group>
  );
}

type GNode = {
  id: string;
  type: NodeType;
  color: string;
  importance: number;
  idleLabel: string;
  radius: number;
  home: THREE.Vector3;
  dx: Drift;
  dy: Drift;
  dz: Drift;
  isCondition: boolean;
};

// 旋臂银河分布：部分落入中心核球（bulge），其余沿 3 条对数旋臂缠绕散布
function spiralHome(rng: () => number, innerBias = false): THREE.Vector3 {
  if (!innerBias && rng() < 0.16) {
    const r = GAL_R * 0.15 * Math.cbrt(rng());
    const a = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    return new THREE.Vector3(r * Math.sin(ph) * Math.cos(a), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(a));
  }
  const arm = Math.floor(rng() * ARMS);
  const tt = Math.pow(rng(), innerBias ? 1.4 : 0.72);
  const rad = 6 + tt * (GAL_R - 6) * (innerBias ? 0.6 : 1);
  const baseAng = arm * ((Math.PI * 2) / ARMS) + tt * SPIRAL_TWIST;
  const scatter = (rng() - 0.5) * 0.55 * (1 - tt * 0.4) + (rng() - 0.5) * 0.1;
  const ang = baseAng + scatter;
  const thin = GAL_Y * (1 - tt * 0.4) * 0.6;
  return new THREE.Vector3(Math.cos(ang) * rad, (rng() - 0.5) * 2 * thin, Math.sin(ang) * rad);
}

function buildNodes(conditions: SharedScenario["conditions"]): GNode[] {
  const rng = mulberry32(20260601);
  const list: GNode[] = [];
  for (let i = 0; i < N_NODES; i++) {
    const type = TYPES[i % TYPES.length];
    list.push({
      id: `n${i}`,
      type,
      color: diverseColor(rng),
      importance: 0.4 + rng() * 0.5,
      idleLabel: POOLS[type][i % POOLS[type].length],
      radius: 0.42 + rng() * 0.66,
      home: spiralHome(rng),
      dx: mkDrift(rng),
      dy: mkDrift(rng),
      dz: mkDrift(rng),
      isCondition: false
    });
  }
  (conditions ?? []).forEach((c) => {
    const type = (TYPES.includes(c.type as NodeType) ? c.type : "event") as NodeType;
    list.push({
      id: `oc-${c.id}`,
      type,
      color: diverseColor(rng, true),
      importance: 0.78,
      idleLabel: c.label,
      radius: 0.85,
      home: spiralHome(rng, true),
      dx: mkDrift(rng),
      dy: mkDrift(rng),
      dz: mkDrift(rng),
      isCondition: true
    });
  });
  return list;
}

// 斐波那契球面点（决策路径汇聚目标）
function fibPoint(k: number, n: number, R: number) {
  const t = (k + 0.5) / n;
  const phi = Math.acos(1 - 2 * t);
  const th = k * 2.399963229;
  return new THREE.Vector3(R * Math.sin(phi) * Math.cos(th), R * Math.cos(phi) * 0.8, R * Math.sin(phi) * Math.sin(th));
}

type SceneProps = {
  scenario: SharedScenario | null;
  onSelect: (node: SandboxNode | null) => void;
  selectedId: string | null;
};

function Scene({ scenario, onSelect, selectedId }: SceneProps) {
  const active = Boolean(scenario?.active);
  const { camera } = useThree();

  const conditionsKey = JSON.stringify(scenario?.conditions ?? []);
  const nodes = useMemo(() => buildNodes(scenario?.conditions), [conditionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 选出"相关"节点 → 汇聚为路径；其余继续独立漂移
  const recombine = useMemo(() => {
    const labels = nodes.map((n) => n.idleLabel);
    const isPath = nodes.map(() => false);
    const targets = nodes.map(() => new THREE.Vector3());
    const order: number[] = [];
    if (active) {
      const pools = galaxyLabelsFor(scenario?.input ?? "", scenario?.topic ?? "");
      const want: Record<NodeType, number> = { event: 2, actor: 3, platform: 1, risk: 2, outcome: 2 };
      const counters: Record<string, number> = {};
      // 条件节点优先纳入路径
      nodes.forEach((n, i) => {
        if (n.isCondition) order.push(i);
      });
      TYPES.forEach((type) => {
        let need = want[type];
        for (let i = 0; i < nodes.length && need > 0; i++) {
          if (nodes[i].type === type && !nodes[i].isCondition && !order.includes(i)) {
            order.push(i);
            need -= 1;
          }
        }
      });
      order.forEach((idx) => {
        isPath[idx] = true;
        const type = nodes[idx].type;
        if (!nodes[idx].isCondition) {
          const pool = pools[type] ?? [labels[idx]];
          const c = counters[type] ?? 0;
          counters[type] = c + 1;
          labels[idx] = pool[c % pool.length];
        }
      });
      order.forEach((idx, k) => targets[idx].copy(fibPoint(k, order.length, PATH_R)));
    }
    return { labels, isPath, targets, order };
  }, [nodes, scenario, active]);

  // 路径连线几何（按 order 顺序串成一条折线）
  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    const { order, targets } = recombine;
    for (let k = 0; k < order.length - 1; k++) {
      const a = targets[order[k]];
      const b = targets[order[k + 1]];
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts.length ? pts : [0, 0, 0, 0, 0, 0], 3));
    return g;
  }, [recombine]);

  const combineT = useRef(0);
  const time = useRef(0);
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const edgeMat = useRef<THREE.LineBasicMaterial>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const coreGroup = useRef<THREE.Group>(null);
  const shockRef = useRef<THREE.Mesh>(null);
  const shockMat = useRef<THREE.MeshBasicMaterial>(null);
  const shockT = useRef(-1); // -1 空闲；0..1 播放中
  const firedRef = useRef(false);

  const selRef = useRef<string | null>(selectedId);
  selRef.current = selectedId;
  const hovRef = useRef<string | null>(null);
  const flyDoneRef = useRef(false);
  const [flyDone, setFlyDone] = useState(false);

  const camClose = useMemo(() => new THREE.Vector3(0, 9, 44), []);

  useEffect(() => {
    flyDoneRef.current = false;
    setFlyDone(false);
  }, [active]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    const t = time.current;
    combineT.current += ((active ? 1 : 0) - combineT.current) * 0.045;
    const ct = combineT.current;
    const e = smoothstep(ct);

    nodes.forEach((n, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      const ox = driftAxis(n.dx, t);
      const oy = driftAxis(n.dy, t) * 0.6;
      const oz = driftAxis(n.dz, t);
      const path = recombine.isPath[i];
      if (active && path) {
        const tg = recombine.targets[i];
        const damp = 1 - ct * 0.75;
        g.position.set(
          n.home.x + (tg.x - n.home.x) * e + ox * damp,
          n.home.y + (tg.y - n.home.y) * e + oy * damp,
          n.home.z + (tg.z - n.home.z) * e + oz * damp
        );
      } else {
        g.position.set(n.home.x + ox, n.home.y + oy, n.home.z + oz);
      }
      const sel = selRef.current === n.id;
      const hov = hovRef.current === n.id;
      g.scale.setScalar(sel ? 1.9 : hov ? 1.35 : 1);

      const mat = matRefs.current[i];
      if (mat) {
        mat.opacity = active && !path ? 1 - ct * 0.74 : 1;
        const shimmer = path && active ? Math.sin(t * 4 + i) * 0.5 : 0;
        mat.emissiveIntensity = (path && active ? 2.2 : 1.3) + shimmer + (sel ? 1.8 : 0);
      }
    });

    // 连线：能量脉冲流动感
    if (edgeMat.current) edgeMat.current.opacity = ct * (0.42 + 0.26 * (0.5 + 0.5 * Math.sin(t * 3)));

    // 中心核：点火（末段急亮）+ 呼吸
    const ignite = smoothstep(Math.max(0, ct - 0.7) / 0.3);
    if (coreMat.current) {
      coreMat.current.opacity = ct * 0.92;
      coreMat.current.emissiveIntensity = ct * 2.4 + ignite * 4.5;
    }
    if (coreGroup.current) {
      coreGroup.current.visible = ct > 0.02;
      coreGroup.current.scale.setScalar(1 + ignite * 0.28 + Math.sin(t * 2) * 0.03 * ct);
    }

    // 汇聚完成时的一次性冲击波
    if (active && !firedRef.current && ct > 0.72) {
      firedRef.current = true;
      shockT.current = 0;
    }
    if (!active) {
      firedRef.current = false;
      shockT.current = -1;
    }
    if (shockT.current >= 0 && shockT.current < 1) {
      shockT.current = Math.min(1, shockT.current + dt * 0.7);
      const s = shockT.current;
      if (shockRef.current) shockRef.current.scale.setScalar(2 + s * 28);
      if (shockMat.current) shockMat.current.opacity = (1 - s) * 0.5;
    } else if (shockMat.current) {
      shockMat.current.opacity = 0;
    }

    // 镜头：激活时飞入框住中心路径，到位后交还控制
    if (active) {
      if (!flyDoneRef.current) {
        camera.position.lerp(camClose, 0.04);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(camClose) < 1.4) {
          flyDoneRef.current = true;
          setFlyDone(true);
        }
      }
    }
  });

  const pickNode = (n: GNode, label: string) =>
    onSelect({ id: n.id, kind: "node", type: n.type, label, color: n.color, importance: n.importance, systemName: "银河", isCondition: n.isCondition });

  return (
    <>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#040510", 90, 360]} />
      <DeepSpace />
      <ambientLight intensity={0.5} />
      <pointLight position={[40, 60, 60]} intensity={1.0} color="#cfe0ff" />
      <pointLight position={[-50, -30, -40]} intensity={0.5} color="#ffd9c0" />
      <Nebula />
      <Stars radius={520} depth={60} count={4000} factor={3} saturation={0} fade speed={0.08} />
      <Stars radius={260} depth={140} count={8000} factor={5} saturation={0.5} fade speed={0.22} />
      <Sparkles count={180} scale={[180, 56, 180]} size={2.2} speed={0.2} opacity={0.5} color="#aac4ff" />
      <GalacticCore />

      {nodes.map((n, i) => (
        <group key={n.id} ref={(el) => { groupRefs.current[i] = el; }}>
          <mesh
            scale={n.radius}
            onClick={(ev) => { ev.stopPropagation(); pickNode(n, recombine.labels[i]); }}
            onPointerOver={(ev) => { ev.stopPropagation(); hovRef.current = n.id; document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { if (hovRef.current === n.id) hovRef.current = null; document.body.style.cursor = "auto"; }}
          >
            <sphereGeometry args={[1, 14, 14]} />
            <meshStandardMaterial
              ref={(el) => { matRefs.current[i] = el; }}
              color={n.color}
              emissive={n.color}
              emissiveIntensity={1.3}
              roughness={0.4}
              metalness={0.1}
              transparent
              toneMapped={false}
            />
          </mesh>
          {n.isCondition && (
            <mesh scale={n.radius * 1.7}>
              <ringGeometry args={[0.9, 1, 26]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          )}
          {selectedId === n.id && (
            <Html center position={[0, n.radius + 1.1, 0]} distanceFactor={15} style={{ pointerEvents: "none" }}>
              <div style={{ ...labelStyle, borderColor: n.color }}>{recombine.labels[i]}</div>
            </Html>
          )}
        </group>
      ))}

      {/* 决策路径连线 */}
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial ref={edgeMat} color="#9fb4ff" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </lineSegments>

      {/* 中心综合核 */}
      <group ref={coreGroup} visible={false}>
        <mesh scale={3.2}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial ref={coreMat} color="#fff3d6" emissive="#ffd98a" emissiveIntensity={0} roughness={0.25} metalness={0.1} transparent opacity={0} toneMapped={false} />
        </mesh>
        {active && (
          <Html center position={[0, 5, 0]} distanceFactor={20} style={{ pointerEvents: "none" }}>
            <div style={coreLabelStyle}>{scenario?.topic || "决策路径"}</div>
          </Html>
        )}
      </group>

      {/* 汇聚完成冲击波（横躺银河盘平面，向外扩散淡出） */}
      <mesh ref={shockRef} rotation={[-Math.PI / 2, 0, 0]} scale={0}>
        <ringGeometry args={[0.92, 1, 80]} />
        <meshBasicMaterial ref={shockMat} color="#bcd4ff" transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>

      <OrbitControls enabled={!active || flyDone} enableDamping dampingFactor={0.08} autoRotate={!active} autoRotateSpeed={0.12} minDistance={12} maxDistance={400} enablePan={false} />
      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.14} luminanceSmoothing={0.9} mipmapBlur radius={0.72} />
        <Vignette offset={0.28} darkness={0.82} />
        <Noise opacity={0.035} />
      </EffectComposer>
    </>
  );
}

const labelStyle: CSSProperties = {
  whiteSpace: "nowrap",
  fontSize: 12,
  color: "#e6e9f4",
  padding: "2px 8px",
  borderRadius: 8,
  background: "rgba(8,10,20,.72)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(255,255,255,.16)"
};
const coreLabelStyle: CSSProperties = {
  whiteSpace: "nowrap",
  fontSize: 14,
  fontWeight: 600,
  color: "#fde68a",
  padding: "3px 12px",
  borderRadius: 10,
  background: "rgba(8,10,20,.7)",
  border: "1px solid rgba(245,217,122,.4)"
};

type Props = {
  onSelect: (node: SandboxNode | null) => void;
  selectedId: string | null;
};

export default function StarSystems3D({ onSelect, selectedId }: Props) {
  const scenario = useSharedScenario();
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 48, 122], fov: 55, near: 0.1, far: 1400 }}
      gl={{ antialias: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <Scene scenario={scenario} onSelect={onSelect} selectedId={selectedId} />
    </Canvas>
  );
}
