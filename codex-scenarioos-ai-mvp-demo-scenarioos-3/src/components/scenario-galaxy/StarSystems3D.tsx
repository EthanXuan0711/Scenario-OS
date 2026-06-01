"use client";

// 社会沙盘 · 5 维度恒星系 → 决策路径星系（R3F 版）。
// 运动：布朗运动（随机游走，不再固定环绕）。节点/恒星可点击 → 详情卡（评分/权重/内容）。
// 共享场景激活时：从 5 系各抽出节点 → 中心重组为决策路径星系；新增条件 → 生成新星球。

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { useSharedScenario, type SharedScenario } from "../scenarioBridge";
import { galaxyLabelsFor } from "../deriveScenario";
import type { NodeType } from "./galaxyTypes";
import type { SandboxNode } from "./sandboxScoring";

type Cat = { type: NodeType; name: string; color: string; pool: string[] };
const CATS: Cat[] = [
  { type: "event", name: "事件", color: "#e7c766", pool: ["突发事件", "政策变动", "舆论爆点", "行业拐点", "资本异动", "技术突破"] },
  { type: "actor", name: "角色", color: "#6ea8ff", pool: ["关键人物", "家人", "挚友", "对手", "投资人", "导师"] },
  { type: "platform", name: "平台", color: "#a78bfa", pool: ["公司", "平台", "社群", "媒体", "机构", "市场"] },
  { type: "risk", name: "风险", color: "#f0556a", pool: ["现金流", "健康", "关系", "时间", "声誉", "竞争"] },
  { type: "outcome", name: "结果", color: "#34d399", pool: ["破圈成功", "稳步增长", "原地踏步", "及时止损", "意外转机", "长期主义"] }
];

const CLOUD = 11; // 每个恒星系的节点云半径
const ACCEL = 2.6; // 布朗运动随机加速度
const DAMP = 0.9; // 速度阻尼
const MAXV = 7; // 最大游走速度

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SystemDef = { ci: number; type: NodeType; name: string; color: string; center: THREE.Vector3 };
type OrbiterDef = {
  id: string;
  ci: number;
  type: NodeType;
  color: string;
  importance: number;
  idleLabel: string;
  radius: number;
  homeOffset: THREE.Vector3;
  isCondition: boolean;
};

function buildSystems(): SystemDef[] {
  return CATS.map((cat, ci) => {
    const ang = (ci / 5) * Math.PI * 2 - Math.PI / 2;
    return { ci, type: cat.type, name: cat.name, color: cat.color, center: new THREE.Vector3(Math.cos(ang) * 46, ci % 2 ? 9 : -9, Math.sin(ang) * 46) };
  });
}

function randomInSphere(rng: () => number, R: number) {
  const r = R * Math.cbrt(rng());
  const th = rng() * Math.PI * 2;
  const ph = Math.acos(2 * rng() - 1);
  return new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, r * Math.cos(ph));
}

function buildOrbiters(conditions: SharedScenario["conditions"]): OrbiterDef[] {
  const rng = mulberry32(20260601);
  const tmp = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  const vary = (hex: string) => {
    tmp.set(hex);
    tmp.getHSL(hsl);
    tmp.setHSL((hsl.h + (rng() - 0.5) * 0.1 + 1) % 1, Math.min(1, hsl.s), Math.max(0.4, Math.min(0.8, hsl.l + (rng() - 0.5) * 0.3)));
    return "#" + tmp.getHexString();
  };
  const list: OrbiterDef[] = [];
  CATS.forEach((cat, ci) => {
    for (let i = 0; i < 6; i++) {
      list.push({
        id: `o${ci}-${i}`,
        ci,
        type: cat.type,
        color: vary(cat.color),
        importance: 0.45 + rng() * 0.45,
        idleLabel: cat.pool[i % cat.pool.length],
        radius: 0.5 + rng() * 0.55,
        homeOffset: randomInSphere(rng, CLOUD),
        isCondition: false
      });
    }
  });
  (conditions ?? []).forEach((c) => {
    const found = CATS.findIndex((cat) => cat.type === c.type);
    const ci = found >= 0 ? found : 0;
    list.push({
      id: `oc-${c.id}`,
      ci,
      type: CATS[ci].type,
      color: "#ffffff",
      importance: 0.72,
      idleLabel: c.label,
      radius: 0.78,
      homeOffset: randomInSphere(rng, CLOUD),
      isCondition: true
    });
  });
  return list;
}

type SceneProps = {
  scenario: SharedScenario | null;
  onSelect: (node: SandboxNode | null) => void;
  selectedId: string | null;
};

function Scene({ scenario, onSelect, selectedId }: SceneProps) {
  const active = Boolean(scenario?.active);
  const { camera } = useThree();

  const systems = useMemo(buildSystems, []);
  const conditionsKey = JSON.stringify(scenario?.conditions ?? []);
  const orbiters = useMemo(() => buildOrbiters(scenario?.conditions), [conditionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 重组：抽取节点、相似标签、中心目标位
  const recombine = useMemo(() => {
    const pools = galaxyLabelsFor(scenario?.input ?? "", scenario?.topic ?? "");
    const labels = orbiters.map((o) => o.idleLabel);
    const extracted: boolean[] = orbiters.map(() => false);
    const targets = orbiters.map(() => new THREE.Vector3());
    if (active) {
      const picked: number[] = [];
      systems.forEach((sys) => {
        const idxs = orbiters.map((o, i) => (o.ci === sys.ci ? i : -1)).filter((i) => i >= 0).slice(0, 3);
        idxs.forEach((i) => picked.push(i));
      });
      const counters: Record<string, number> = {};
      picked.forEach((i) => {
        extracted[i] = true;
        const type = orbiters[i].type;
        const pool = pools[type] ?? [labels[i]];
        const c = counters[type] ?? 0;
        counters[type] = c + 1;
        labels[i] = pool[c % pool.length];
      });
      picked.forEach((i, k) => {
        const t = (k + 0.5) / picked.length;
        const phi = Math.acos(1 - 2 * t);
        const th = k * 2.399;
        targets[i].set(13 * Math.sin(phi) * Math.cos(th), 13 * Math.cos(phi) * 0.75, 13 * Math.sin(phi) * Math.sin(th));
      });
    }
    return { labels, extracted, targets };
  }, [orbiters, systems, scenario, active]);

  const combineT = useRef(0);
  const joff = useRef<THREE.Vector3[]>([]);
  const jvel = useRef<THREE.Vector3[]>([]);
  const starGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const starMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const orbGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const orbMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const newStarMat = useRef<THREE.MeshStandardMaterial>(null);
  const newStarGroup = useRef<THREE.Group>(null);

  const selRef = useRef<string | null>(selectedId);
  selRef.current = selectedId;
  const hovRef = useRef<string | null>(null);
  const flyDoneRef = useRef(false);
  const [flyDone, setFlyDone] = useState(false);

  const anchor = useMemo(() => new THREE.Vector3(), []);
  const camClose = useMemo(() => new THREE.Vector3(0, 8, 42), []);

  // 初始化/同步布朗运动状态（节点数量变化时重置）
  useEffect(() => {
    joff.current = orbiters.map((o) => o.homeOffset.clone());
    jvel.current = orbiters.map(() => new THREE.Vector3());
  }, [orbiters]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    combineT.current += ((active ? 1 : 0) - combineT.current) * 0.05;
    const ct = combineT.current;

    systems.forEach((sys, ci) => {
      const g = starGroupRefs.current[ci];
      if (g) {
        g.position.copy(sys.center).multiplyScalar(1 + ct * 1.8);
        g.scale.setScalar(selRef.current === `s${ci}` ? 1.16 : 1); // mesh 已含基础 3.2，group 仅承担选中倍率
      }
      const m = starMatRefs.current[ci];
      if (m) {
        m.opacity = 1 - ct * 0.9;
        m.emissiveIntensity = (selRef.current === `s${ci}` ? 3.4 : 2.2) * (1 - ct) + 0.2;
      }
    });

    orbiters.forEach((o, i) => {
      const joffV = joff.current[i];
      const jvelV = jvel.current[i];
      if (!joffV || !jvelV) return;
      // 布朗随机游走
      jvelV.x += (Math.random() - 0.5) * ACCEL;
      jvelV.y += (Math.random() - 0.5) * ACCEL;
      jvelV.z += (Math.random() - 0.5) * ACCEL;
      jvelV.multiplyScalar(DAMP);
      if (jvelV.lengthSq() > MAXV * MAXV) jvelV.setLength(MAXV);
      joffV.addScaledVector(jvelV, dt);

      const ext = recombine.extracted[i];
      let cloudR: number;
      if (active && ext) {
        anchor.lerpVectors(systems[o.ci].center, recombine.targets[i], ct);
        cloudR = THREE.MathUtils.lerp(CLOUD, 3, ct);
      } else if (active) {
        anchor.copy(systems[o.ci].center).multiplyScalar(1 + ct * 1.8);
        cloudR = CLOUD;
      } else {
        anchor.copy(systems[o.ci].center);
        cloudR = CLOUD;
      }
      if (joffV.lengthSq() > cloudR * cloudR) {
        joffV.setLength(cloudR);
        jvelV.multiplyScalar(0.4);
      }

      const g = orbGroupRefs.current[i];
      if (g) {
        g.position.copy(anchor).add(joffV);
        const sel = selRef.current === o.id;
        const hov = hovRef.current === o.id;
        g.scale.setScalar(sel ? 1.7 : hov ? 1.3 : 1); // mesh 已含基础 o.radius，group 仅承担选中/悬停倍率
      }
      const mat = orbMatRefs.current[i];
      if (mat) {
        mat.opacity = active && !ext ? 1 - ct * 0.9 : 1;
        const sel = selRef.current === o.id;
        mat.emissiveIntensity = (ext ? 2 : 1.4) + (sel ? 1.6 : 0) + (ext ? ct : 0);
      }
    });

    if (newStarMat.current) {
      newStarMat.current.opacity = ct;
      newStarMat.current.emissiveIntensity = ct * 3.2;
    }
    if (newStarGroup.current) newStarGroup.current.visible = ct > 0.02;

    // 重组时镜头飞向中心；到位后交还 OrbitControls，让用户继续环视/点击
    if (active) {
      if (!flyDoneRef.current) {
        camera.position.lerp(camClose, 0.04);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(camClose) < 1.4) {
          flyDoneRef.current = true;
          setFlyDone(true);
        }
      }
    } else if (flyDoneRef.current) {
      flyDoneRef.current = false;
      setFlyDone(false);
    }
  });

  const pickStar = (sys: SystemDef) =>
    onSelect({ id: `s${sys.ci}`, kind: "star", type: sys.type, label: sys.name, color: sys.color, importance: 0.95, systemName: sys.name });

  const pickNode = (o: OrbiterDef, label: string) =>
    onSelect({ id: o.id, kind: "node", type: o.type, label, color: o.color, importance: o.importance, systemName: CATS[o.ci].name, isCondition: o.isCondition });

  return (
    <>
      <color attach="background" args={["#04060e"]} />
      <fog attach="fog" args={["#04060e", 60, 260]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[60, 50, 60]} intensity={1.1} color="#ffffff" />
      <Stars radius={200} depth={120} count={5000} factor={5} saturation={0.4} fade speed={0.3} />

      {systems.map((sys, ci) => (
        <group key={sys.ci} ref={(el) => { starGroupRefs.current[ci] = el; }} position={sys.center}>
          <mesh
            scale={3.2}
            onClick={(e) => { e.stopPropagation(); pickStar(sys); }}
            onPointerOver={(e) => { e.stopPropagation(); hovRef.current = `s${ci}`; document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { if (hovRef.current === `s${ci}`) hovRef.current = null; document.body.style.cursor = "auto"; }}
          >
            <sphereGeometry args={[1, 22, 22]} />
            <meshStandardMaterial
              ref={(el) => { starMatRefs.current[ci] = el; }}
              color={sys.color}
              emissive={sys.color}
              emissiveIntensity={2.2}
              roughness={0.3}
              metalness={0.1}
              transparent
              toneMapped={false}
            />
          </mesh>
          <Html center position={[0, 5, 0]} distanceFactor={26} style={{ pointerEvents: "none" }}>
            <div style={{ ...starLabelStyle, color: sys.color, border: `1px solid ${sys.color}55`, opacity: active ? 0.25 : 1 }}>{sys.name}</div>
          </Html>
        </group>
      ))}

      {orbiters.map((o, i) => (
        <group key={o.id} ref={(el) => { orbGroupRefs.current[i] = el; }}>
          <mesh
            scale={o.radius}
            onClick={(e) => { e.stopPropagation(); pickNode(o, recombine.labels[i]); }}
            onPointerOver={(e) => { e.stopPropagation(); hovRef.current = o.id; document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { if (hovRef.current === o.id) hovRef.current = null; document.body.style.cursor = "auto"; }}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              ref={(el) => { orbMatRefs.current[i] = el; }}
              color={o.color}
              emissive={o.color}
              emissiveIntensity={1.4}
              roughness={0.35}
              metalness={0.1}
              transparent
              toneMapped={false}
            />
          </mesh>
          {o.isCondition && (
            <mesh scale={o.radius * 1.7}>
              <ringGeometry args={[0.9, 1, 28]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          )}
          {((recombine.extracted[i] && active) || selectedId === o.id) && (
            <Html center position={[0, o.radius + 0.9, 0]} distanceFactor={16} style={{ pointerEvents: "none" }}>
              <div style={selectedId === o.id ? { ...labelStyle, borderColor: o.color } : labelStyle}>{recombine.labels[i]}</div>
            </Html>
          )}
        </group>
      ))}

      <group ref={newStarGroup} visible={false}>
        <mesh scale={3.6}>
          <sphereGeometry args={[1, 22, 22]} />
          <meshStandardMaterial ref={newStarMat} color="#fff7e0" emissive="#f5d97a" emissiveIntensity={0} roughness={0.25} metalness={0.1} transparent opacity={0} toneMapped={false} />
        </mesh>
        {active && (
          <Html center position={[0, 5.2, 0]} distanceFactor={22} style={{ pointerEvents: "none" }}>
            <div style={{ ...starLabelStyle, color: "#fde68a", border: "1px solid rgba(245,217,122,.4)" }}>{scenario?.topic || "决策路径"}</div>
          </Html>
        )}
      </group>

      <OrbitControls enabled={!active || flyDone} enableDamping dampingFactor={0.08} autoRotate={!active} autoRotateSpeed={0.25} minDistance={10} maxDistance={320} enablePan={false} />
      <EffectComposer>
        <Bloom intensity={1} luminanceThreshold={0.16} luminanceSmoothing={0.9} mipmapBlur radius={0.6} />
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
  background: "rgba(8,10,20,.66)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(255,255,255,.14)"
};
const starLabelStyle: CSSProperties = {
  whiteSpace: "nowrap",
  fontSize: 14,
  fontWeight: 600,
  padding: "3px 12px",
  borderRadius: 10,
  background: "rgba(8,10,20,.7)"
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
      camera={{ position: [0, 16, 118], fov: 55, near: 0.1, far: 1000 }}
      gl={{ antialias: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <Scene scenario={scenario} onSelect={onSelect} selectedId={selectedId} />
    </Canvas>
  );
}
