"use client";

// 可开关的 AI 推演聊天抽屉（纯新增，叠加在工作台之上，默认收起）。
// 发送的内容会联动工作台现有图谱（在选中节点旁生成新节点）与右侧变量。

import { useRef, useState } from "react";
import { MessageSquarePlus, Send, Sparkles, X } from "lucide-react";

type ThreadMessage = { role: "user" | "system"; text: string };

type Props = {
  messages: ThreadMessage[];
  onSend: (text: string) => void;
  side?: "left" | "right";
};

export default function WorkspaceChatDrawer({ messages, onSend, side = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLeft = side === "left";

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
    <>
      {/* 浮动开关按钮 */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`fixed bottom-5 z-40 flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-xs text-amber-100 shadow-lg backdrop-blur-md transition-colors hover:bg-amber-500/25 ${
          isLeft ? "left-5" : "right-5"
        }`}
      >
        <Sparkles size={15} />
        AI 推演
      </button>

      {/* 抽屉本体 */}
      <div
        className={`fixed top-0 z-50 flex h-full w-[360px] max-w-[88vw] flex-col border-zinc-800 bg-[#08080f] shadow-2xl transition-transform duration-300 ${
          isLeft ? "left-0 border-r" : "right-0 border-l"
        } ${open ? "translate-x-0" : isLeft ? "-translate-x-full" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <MessageSquarePlus size={15} className="text-amber-400" />
          <span className="text-sm font-medium text-zinc-100">AI 推演助手</span>
          <span className="ml-auto text-[11px] text-zinc-600">输入联动图谱</span>
          <button onClick={() => setOpen(false)} className="ml-2 text-zinc-500 transition-colors hover:text-zinc-200" aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber-500/15 px-3.5 py-2 text-sm leading-relaxed text-amber-50">
                  {message.text}
                </div>
              </div>
            ) : (
              <div key={index} className="flex gap-2.5">
                <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400/80 to-amber-600/50" />
                <div className="max-w-[88%] text-sm leading-relaxed text-zinc-300">{message.text}</div>
              </div>
            )
          )}
        </div>

        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-[#0c0c16] px-3 py-2 transition-colors focus-within:border-amber-500/40">
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
              placeholder="描述处境 / 担忧 / 选择，回车生成节点…"
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
          <div className="mt-1.5 px-1 text-[11px] text-zinc-600">回车发送 · 会在当前选中节点旁生成新节点并联动变量</div>
        </div>
      </div>
    </>
  );
}
