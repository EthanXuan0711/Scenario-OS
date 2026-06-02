"use client";

// 聊天首页（PRD §4「简化冷启动」+ §5.1「30 秒首次体验流」）。
// 居中对话：3 问（纠结什么 / 最怕什么 / 以前怎么做）→ 推演 → 首次洞察报告（人格轮廓 + 2 条路径 + 可验证问题）。
// 洞察报告联动 scenarioBridge（推演页）与推演历史（档案页回填）。Vault/笔记收为可折叠「记忆」抽屉。

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, Sparkles, Brain, Compass, RotateCcw,
  Copy, Check, ChevronDown, Plus, NotebookPen, Loader2,
} from "lucide-react";
import { saveScenario, loadScenario } from "./scenarioBridge";
import { runDeduction, saveDeduction, type DeductionResult } from "./deduction";
import { matchArchetypeKey, archetypeDetail } from "./deriveScenario";
import { decisionVariables, defaultVariables } from "./cockpit/cockpitSim";

type Step = 0 | 1 | 2 | 3 | 4; // 0-2 三问, 3 推演中, 4 报告
type AnswerKey = "struggle" | "fear" | "past";
type Question = { key: AnswerKey; label: string; hint: string; placeholder: string };

const QUESTIONS: Question[] = [
  { key: "struggle", label: "你正在纠结一个什么决策？", hint: "一句话说清当下最让你卡住的选择，例如「要不要在 30 天内提离职去做独立产品」。", placeholder: "我在纠结……" },
  { key: "fear", label: "你最怕出现什么结果？", hint: "把最坏情况写出来——往往就是决策真正的约束。", placeholder: "我最怕……" },
  { key: "past", label: "以前遇到类似情况，你通常怎么做？", hint: "你的历史模式，是判断你这次会怎么选的关键依据。", placeholder: "以前我一般会……" },
];

const NOTES_KEY = "scenarioos.notes.v1";

export default function ChatHome() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<{ struggle: string; fear: string; past: string }>({ struggle: "", fear: "", past: "" });
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<DeductionResult | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 进入下一题时聚焦
  useEffect(() => {
    if (step <= 2) inputRef.current?.focus();
  }, [step]);

  const current: Question | undefined = step <= 2 ? QUESTIONS[step] : undefined;

  const goNext = () => {
    if (!current) return;
    const val = draft.trim();
    if (!val) return;
    const nextAnswers = { ...answers, [current.key]: val };
    setAnswers(nextAnswers);
    if (step < 2) {
      setStep((step + 1) as Step);
      setDraft("");
    } else {
      runFlow(nextAnswers);
    }
  };

  const goBack = () => {
    if (step === 0) return;
    const prev = (step - 1) as Step;
    setStep(prev);
    const prevKey = QUESTIONS[prev]?.key;
    setDraft(prevKey ? answers[prevKey] : "");
  };

  async function runFlow(a: { struggle: string; fear: string; past: string }) {
    setStep(3);
    const input = `困境：${a.struggle}\n最怕：${a.fear}\n过往模式：${a.past}`;
    const topic = a.struggle.length > 18 ? a.struggle.slice(0, 18) + "…" : a.struggle;
    const archetypeKey = matchArchetypeKey(a.struggle);
    const variables = { ...defaultVariables };

    // 先把场景写入桥接，推演页可无缝接续
    saveScenario({ active: true, topic, input, archetypeKey, variables, conditions: [] });

    // 推演 + 最短 1.4s 的「推演中」节奏感
    const [res] = await Promise.all([
      runDeduction({ text: input, topic, variables }),
      new Promise((r) => setTimeout(r, 1400)),
    ]);
    saveDeduction(res); // 进入档案历史，可回填
    setResult(res);
    setStep(4);
  }

  const reset = () => {
    setStep(0);
    setAnswers({ struggle: "", fear: "", past: "" });
    setDraft("");
    setResult(null);
  };

  return (
    <div className="cosmic-field mt-11 min-h-[calc(100dvh-2.75rem)] w-full overflow-x-hidden px-4 pb-24 pt-10 font-sans text-zinc-200 sm:pt-14">
      <div className="mx-auto w-full max-w-2xl">
        {/* 顶部品牌区 */}
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200/60">
            <Sparkles size={12} /> 30 秒 · 首次推演
          </div>
          <h1 className="font-mystic text-3xl font-semibold text-zinc-50 sm:text-4xl">先在这里，把决策推演一遍</h1>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-zinc-500">
            不是算命，是把一个真实困境拆成路径与概率，再用现实回填验证。回答三个问题，拿到第一份「懂你」的推演报告。
          </p>
        </header>

        {/* 主体：三问 / 推演中 / 报告 */}
        {step <= 2 && current && (
          <QuestionCard
            step={step}
            question={current}
            draft={draft}
            setDraft={setDraft}
            inputRef={inputRef}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 3 && <Deducing topic={answers.struggle} />}

        {step === 4 && result && <InsightReport result={result} answers={answers} onReset={reset} />}

        {/* 次要：可折叠「记忆」抽屉 */}
        <MemoryDrawer />
      </div>
    </div>
  );
}

// ─── 三问卡片 ─────────────────────────────────────────────────
function QuestionCard({
  step, question, draft, setDraft, inputRef, onNext, onBack,
}: {
  step: number;
  question: Question;
  draft: string;
  setDraft: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mystic-card overflow-hidden p-5 sm:p-7">
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
      {/* 进度 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 26 : 8,
                background: i <= step ? "linear-gradient(90deg,#f0c85a,#e7c766)" : "rgba(255,255,255,0.12)",
                boxShadow: i === step ? "0 0 10px rgba(240,200,90,0.5)" : undefined,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[11px] text-zinc-600">第 {step + 1} / 3 问</span>
      </div>

      <h2 className="font-mystic text-xl font-semibold text-zinc-50">{question.label}</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{question.hint}</p>

      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onNext();
        }}
        rows={3}
        placeholder={question.placeholder}
        className="mt-4 w-full resize-none rounded-xl border border-white/12 bg-black/30 px-4 py-3 text-[14px] leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-amber-200/45"
      />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-zinc-500 transition-colors hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ArrowLeft size={15} /> 上一步
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!draft.trim()}
          className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-5 py-2.5 text-[14px] font-medium text-amber-100 transition-all hover:bg-amber-300/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step < 2 ? "下一步" : "开始推演"}
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="mt-2 text-right font-mono text-[10px] text-zinc-700">⌘/Ctrl + Enter 快速下一步</div>
    </div>
  );
}

// ─── 推演中 ───────────────────────────────────────────────────
function Deducing({ topic }: { topic: string }) {
  const PHASES = ["连接时空坐标", "读取你的决策模式", "推演可能路径", "生成洞察报告"];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 360);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mystic-card flex flex-col items-center gap-5 p-10 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full border border-amber-300/30" />
        <Loader2 size={40} className="animate-spin text-amber-300/80" />
      </div>
      <div className="font-mystic text-lg text-zinc-100">正在推演「{topic.length > 14 ? topic.slice(0, 14) + "…" : topic}」</div>
      <div className="flex flex-col gap-1.5">
        {PHASES.map((p, i) => (
          <div key={p} className={`flex items-center gap-2 text-[12px] transition-colors ${i <= phase ? "text-amber-200/80" : "text-zinc-700"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i <= phase ? "bg-amber-300" : "bg-white/10"}`} />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 首次洞察报告 ─────────────────────────────────────────────
const STRENGTH_META: Record<DeductionResult["strength"], { label: string; color: string }> = {
  high: { label: "高把握", color: "#34d399" },
  medium: { label: "中等把握", color: "#e7c766" },
  "needs-verification": { label: "需进一步验证", color: "#fb7185" },
};

function InsightReport({ result, answers, onReset }: { result: DeductionResult; answers: { struggle: string; fear: string; past: string }; onReset: () => void }) {
  const sm = STRENGTH_META[result.strength];
  const detail = archetypeDetail(answers.struggle);
  // 决策画像：取数值最高的 3 个变量
  const topVars = decisionVariables
    .map((v) => ({ name: v.name, value: defaultVariables[v.id] ?? v.value, high: v.highLabel }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const paths = result.paths.slice(0, 2);

  const [copied, setCopied] = useState(false);
  const shareText =
    `【ScenarioOS 首次推演】「${result.topic}」\n` +
    `判断强度：${sm.label}\n` +
    paths.map((p, i) => `路径${i + 1} ${p.name}（${p.probability}%）：${p.bestOutcome}`).join("\n") +
    `\n可验证：${result.verificationWindow}`;
  const copyShare = () => {
    try {
      navigator.clipboard?.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 报告头 */}
      <div className="mystic-card overflow-hidden p-5 sm:p-6">
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200/50">
            <Sparkles size={12} /> 首次洞察报告
          </span>
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ color: sm.color, background: `${sm.color}1c`, border: `1px solid ${sm.color}44` }}>
            {sm.label}
          </span>
        </div>
        <h2 className="font-mystic text-xl font-semibold text-zinc-50">「{result.topic}」</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">
          {result.situation.stage} · 核心矛盾：{result.situation.mainConflict}
        </p>
      </div>

      {/* 决策画像 */}
      <ReportSection icon={<Brain size={15} />} title="你的决策画像（初步）">
        <p className="mb-3 text-[12.5px] leading-relaxed text-zinc-400">
          从你的描述看，你更像「{detail.org}」型决策者：看重{detail.values.slice(0, 2).join("、")}，对{detail.risks[0]}尤其警觉。
        </p>
        <div className="flex flex-col gap-2">
          {topVars.map((v) => (
            <div key={v.name} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[11px] text-zinc-500">{v.name}</span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${v.value}%`, background: "linear-gradient(90deg,#e7c76688,#f0c85a)", boxShadow: "0 0 10px rgba(240,200,90,0.4)" }} />
              </div>
              <span className="w-16 shrink-0 truncate text-right font-mono text-[10px] text-amber-200/60">{v.high}</span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* 两条路径 */}
      <ReportSection icon={<Compass size={15} />} title="当前困境的两条路径">
        <div className="flex flex-col gap-2.5">
          {paths.map((p, i) => {
            const color = i === 0 ? "#f0c85a" : "#6ea8ff";
            return (
              <div key={p.id} className="rounded-xl border p-3" style={{ borderColor: `${color}33`, background: `linear-gradient(135deg, ${color}0e, transparent)` }}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-zinc-100">路径 {String.fromCharCode(65 + i)} · {p.name}</span>
                  <span className="font-mono text-[12px]" style={{ color }}>{p.probability}%</span>
                </div>
                <div className="mb-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${p.probability}%`, background: color }} />
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-400">触发：{p.trigger}</p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: `${color}cc` }}>✓ {p.bestOutcome}</p>
                {p.risk.chance > 55 && <p className="mt-0.5 text-[11px] text-rose-300/70">⚠ {p.risk.desc}（{p.risk.chance}%）</p>}
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* 可验证问题 */}
      <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.05] p-4">
        <div className="mb-1 flex items-center gap-2 text-[12px] text-amber-200/80">
          <span className="text-amber-300">?</span> 可验证 · {result.verificationWindow}
        </div>
        <p className="text-[12px] leading-relaxed text-amber-100/70">
          {result.actionAdvice[0] ?? "选一个最小试探动作，并约定一个验证日期。"}
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link
          href="/scenario-map"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-300/12 px-5 py-3 text-[14px] font-medium text-amber-100 transition-all hover:bg-amber-300/22 active:scale-[0.98]"
        >
          进入银河深度推演 <ArrowRight size={16} />
        </Link>
        <button type="button" onClick={copyShare} className="flex items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-3 text-[13px] text-zinc-300 transition-colors hover:border-white/25 hover:text-zinc-100">
          {copied ? <><Check size={15} className="text-emerald-400" /> 已复制</> : <><Copy size={15} /> 复制分享文案</>}
        </button>
        <button type="button" onClick={onReset} className="flex items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-3 text-[13px] text-zinc-500 transition-colors hover:text-zinc-200">
          <RotateCcw size={14} /> 重新开始
        </button>
      </div>
      <p className="text-center font-mono text-[10px] text-zinc-700">报告已存入档案 · 到期后回「档案」回填真实结果，积累你的命中率</p>
    </div>
  );
}

function ReportSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mystic-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-amber-200/70">{icon}</span>
        <h3 className="font-mystic text-[15px] font-semibold text-zinc-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── 可折叠「记忆」抽屉（Vault 收为次要）─────────────────────────
type Note = { id: string; text: string; at: number };

function MemoryDrawer() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]") as Note[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Note[]) => {
    setNotes(next);
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(next.slice(0, 50)));
    } catch {
      /* ignore */
    }
  };
  const add = () => {
    const v = text.trim();
    if (!v) return;
    persist([{ id: `n${notes.length}-${v.slice(0, 4)}`, text: v, at: Date.now() }, ...notes]);
    setText("");
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-[13px] text-zinc-400 transition-colors hover:border-white/15 hover:text-zinc-200"
      >
        <span className="flex items-center gap-2">
          <NotebookPen size={15} className="text-amber-200/60" /> 记忆 · 笔记
          <span className="font-mono text-[10px] text-zinc-600">{notes.length}</span>
        </span>
        <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="mb-2 text-[11px] leading-relaxed text-zinc-600">
            随手记下与决策相关的事实、担忧或反驳——后续会成为推演的判断依据（被动记忆抽取，Phase 1 自动识别候选）。
          </p>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="写入一条事实 / 担忧 / 反驳…"
              className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-amber-200/40"
            />
            <button type="button" onClick={add} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300/40 bg-amber-300/10 text-amber-200 transition-colors hover:bg-amber-300/20">
              <Plus size={16} />
            </button>
          </div>
          {notes.length > 0 && (
            <div className="mt-2 flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
              {notes.map((n) => (
                <div key={n.id} className="group flex items-start gap-2 rounded-lg border border-white/6 bg-black/20 px-3 py-2 text-[12px] text-zinc-400">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-300/50" />
                  <span className="min-w-0 flex-1 break-words">{n.text}</span>
                  <button
                    type="button"
                    onClick={() => persist(notes.filter((x) => x.id !== n.id))}
                    className="shrink-0 text-zinc-700 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                    aria-label="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
