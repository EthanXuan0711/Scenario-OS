"use client";

// 沉浸式推演入场剧场 v2（GSAP 版）：
// 全屏电影级仪式感 —— GSAP Timeline + 粒子汇聚 + 文字逐字浮现 + 命理能量环。
// PRD 7.4.7：连接时空坐标 → 读取决策模式 → 推演路径 → 完成，约 3.8s 后淡出。

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";

const STEPS = [
  "正在连接你的时空坐标…",
  "正在读取你的决策模式…",
  "正在推演可能路径…",
  "推演完成"
];

type Props = { playing: boolean; topic: string; onDone: () => void };

export default function DeductionTheater({ playing, topic, onDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!playing) return;

    // 杀掉上一轮
    tlRef.current?.kill();
    gsap.set([ring1Ref.current, ring2Ref.current, coreRef.current, barFillRef.current], { clearProps: "all" });

    const tl = gsap.timeline({ onComplete: () => doneRef.current() });
    tlRef.current = tl;

    // 入场：全体淡入
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" });

    // 能量环 1：快速旋转扩散
    tl.fromTo(ring1Ref.current,
      { scale: 0.3, opacity: 0, rotation: 0 },
      { scale: 1, opacity: 1, rotation: 360, duration: 1.4, ease: "power3.out" },
      "<0.1"
    );
    // 能量环 2：反向慢转
    tl.fromTo(ring2Ref.current,
      { scale: 0.2, opacity: 0, rotation: 0 },
      { scale: 1, opacity: 0.7, rotation: -200, duration: 2.0, ease: "power2.out" },
      "<"
    );
    // 中心核：爆发点亮
    tl.fromTo(coreRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2.2)" },
      "<0.3"
    );
    // 核心呼吸
    tl.to(coreRef.current, { scale: 1.22, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 4 }, "<0.2");

    // 文字序列（每步淡入淡出）
    STEPS.forEach((step, i) => {
      const delay = i === 0 ? "<-0.2" : `<${i === STEPS.length - 1 ? 0.4 : 0.85}`;
      tl.add(() => {
        if (stepRef.current) stepRef.current.textContent = step;
      }, delay);
      tl.fromTo(stepRef.current,
        { opacity: 0, y: 10, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
        "<"
      );
      if (i < STEPS.length - 1) {
        tl.to(stepRef.current,
          { opacity: 0, y: -10, filter: "blur(4px)", duration: 0.28, ease: "power1.in" },
          `<+0.7`
        );
      }
    });

    // 进度条：跑满
    tl.fromTo(barFillRef.current,
      { width: "0%" },
      { width: "100%", duration: 3.4, ease: "power1.inOut" },
      0.6
    );

    // 话题文字
    if (topicRef.current) {
      tl.fromTo(topicRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        1
      );
    }

    // 推演完成时核心爆亮
    tl.to(coreRef.current, { scale: 2.8, opacity: 0, duration: 0.7, ease: "power3.out" }, "+=0.1");

    // 整体淡出
    tl.to(containerRef.current, { opacity: 0, duration: 0.5, ease: "power2.in" }, "<0.2");

    return () => { tl.kill(); };
  }, [playing]);

  const topicRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          ref={containerRef}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(ellipse at center, rgba(8,10,22,0.88), rgba(2,3,8,0.96))", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* 背景浮动粒子 */}
          <div ref={particlesRef} className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-amber-300/20"
                style={{
                  width: 2 + (i % 4),
                  height: 2 + (i % 4),
                  left: `${5 + (i * 37 % 90)}%`,
                  top: `${8 + (i * 41 % 82)}%`,
                  animation: `float-up ${3 + (i % 4)}s ${(i * 0.4) % 3}s ease-in-out infinite alternate`
                }}
              />
            ))}
          </div>

          {/* 核心仪式 */}
          <div className="relative mb-10 flex h-52 w-52 items-center justify-center">
            {/* 外环 — 命理八卦符号感 */}
            <div
              ref={ring1Ref}
              className="absolute inset-0 rounded-full"
              style={{
                border: "1.5px solid transparent",
                background: "linear-gradient(135deg, rgba(251,191,36,0.6), rgba(139,92,246,0.4), rgba(56,189,248,0.4)) border-box",
                WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "destination-out",
                maskComposite: "exclude",
                opacity: 0
              }}
            />
            {/* 内环 — 旋转对应感 */}
            <div
              ref={ring2Ref}
              className="absolute"
              style={{
                inset: "14px",
                borderRadius: "50%",
                border: "1px dashed rgba(251,191,36,0.35)",
                opacity: 0
              }}
            />
            {/* 中心核 */}
            <div
              ref={coreRef}
              className="relative flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(254,240,138,1) 0%, rgba(245,158,11,0.8) 55%, rgba(139,92,246,0.3) 100%)",
                boxShadow: "0 0 40px 12px rgba(252,211,77,0.45), 0 0 80px 30px rgba(139,92,246,0.18)",
                opacity: 0
              }}
            >
              <span className="text-xl font-bold text-amber-950">命</span>
            </div>
          </div>

          {/* 步骤文字 */}
          <div
            ref={stepRef}
            className="mb-2 text-base font-medium tracking-wide text-zinc-100"
            style={{ opacity: 0, minHeight: "1.5rem" }}
          />

          {/* 议题 */}
          <div
            ref={topicRef}
            className="mb-8 font-mono text-[11px] text-zinc-500"
            style={{ opacity: 0 }}
          >
            {topic ? `议题：「${topic}」` : ""}
          </div>

          {/* 进度条 */}
          <div ref={barRef} className="relative h-[2px] w-60 overflow-hidden rounded-full bg-white/8">
            <div
              ref={barFillRef}
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: "0%",
                background: "linear-gradient(90deg, #f59e0b, #a78bfa, #38bdf8)"
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
