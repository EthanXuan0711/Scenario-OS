"use client";

// 左侧 AI 聊天面板（Claude 风格）：消息流 + 输入框，原子笔记/路径折叠在一个按钮里。
// 隐式框样式：贴边全高列，细分隔线，无浮层卡片。

import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Network, NotebookPen, Send } from "lucide-react";
import type { ScoredPath } from "./cockpitSim";
import type { AtomicNote, ChatMessage } from "./useCockpit";

type Props = {
  messages: ChatMessage[];
  notes: AtomicNote[];
  scoredPaths: ScoredPath[];
  onSend: (text: string) => void;
};

export default function ChatPanel({ messages, notes, scoredPaths, onSend }: Props) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/5 bg-[#08080f]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <MessageSquare size={15} className="text-amber-400" />
        <span className="text-sm font-medium text-zinc-100">推演助手</span>
        <span className="ml-auto text-[11px] text-zinc-600">模拟引擎 · 本地</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber-500/15 px-3.5 py-2 text-sm leading-relaxed text-amber-50">
                {message.text}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex gap-2.5">
              <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400/80 to-amber-600/50" />
              <div className="max-w-[88%] text-sm leading-relaxed text-zinc-300">{message.text}</div>
            </div>
          )
        )}
      </div>

      <div className="border-t border-white/5">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <NotebookPen size={13} />
          原子笔记 · 路径
          <span className="ml-auto text-[11px] text-zinc-600">{notes.length} 条笔记</span>
        </button>

        {expanded && (
          <div className="max-h-56 space-y-3 overflow-y-auto px-4 pb-3">
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wider text-zinc-600">原子笔记</div>
              {notes.length === 0 ? (
                <p className="text-xs text-zinc-600">还没有笔记，发送一句话即可生成。</p>
              ) : (
                <div className="space-y-1.5">
                  {notes.slice(0, 10).map((note) => (
                    <div key={note.id} className="truncate border-l border-amber-500/40 pl-2 text-xs text-zinc-400">
                      {note.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-600">
                <Network size={11} /> 路径评分
              </div>
              <div className="space-y-1.5">
                {scoredPaths.map((path) => (
                  <div key={path.id} className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 truncate text-zinc-400">{path.name}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-amber-500/70" style={{ width: `${path.score}%` }} />
                    </div>
                    <span className="w-7 text-right font-mono text-amber-200">{path.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#0c0c16] px-3 py-2 transition-colors focus-within:border-amber-500/40">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="描述你的处境 / 担忧 / 选择…"
            className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 transition-colors hover:bg-amber-400"
            aria-label="发送"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-zinc-600">Enter 发送 · 内容会生成星球并联动右侧数据</div>
      </div>
    </aside>
  );
}
