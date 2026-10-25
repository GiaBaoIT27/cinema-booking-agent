"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Square,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useAgentChat } from "../hooks/use-agent-chat";
import { AgentWidgetView } from "./agent-widgets";
import { ChatText } from "./chat-text";

const SUGGESTED_PROMPTS = [
  "Hôm nay có phim gì đang chiếu?",
  "Gợi ý cho mình phim hành động đang chiếu",
  "Mình muốn đặt 2 vé xem tối nay",
];

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export function AIAssistantModal({
  isOpen,
  onClose,
  initialPrompt,
}: AIAssistantModalProps) {
  const { messages, isStreaming, send, stop, reset } = useAgentChat();
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consumedPromptRef = useRef<string | null>(null);

  // Tự cuộn xuống tin mới nhất (cả khi chữ đang được stream về)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Câu hỏi mở đầu từ thanh đặt vé nhanh: mỗi lần mở chỉ gửi một lần
  useEffect(() => {
    if (!isOpen) {
      consumedPromptRef.current = null;
      return;
    }
    if (initialPrompt && consumedPromptRef.current !== initialPrompt) {
      consumedPromptRef.current = initialPrompt;
      void send(initialPrompt);
    }
  }, [initialPrompt, isOpen, send]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void send(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 pointer-events-none">
      <div
        className={`pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-[#1F2937] bg-[#0E1422] shadow-[0_25px_60px_rgba(0,0,0,0.85)] transition-all duration-300 w-full ${
          isExpanded
            ? "sm:w-[540px] h-[92vh] sm:h-[680px]"
            : "sm:w-[420px] h-[85vh] sm:h-[580px]"
        }`}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-[#1F2937] bg-linear-to-r from-[#111827] via-[#151d30] to-[#111827] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#EF4444] to-[#B91C1C] text-white shadow-lg shadow-red-500/20">
              <Sparkles size={18} className="animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Cinema AI Assistant
                </h3>
                <span className="rounded bg-[#EF4444]/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-[#EF4444]">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                Trợ lý đặt vé tự động thông minh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#9CA3AF]">
            <button
              type="button"
              onClick={reset}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition"
              title="Cuộc trò chuyện mới"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition"
              title={isExpanded ? "Thu nhỏ" : "Phóng to"}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition"
              title="Đóng chat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  msg.sender === "user"
                    ? "bg-[#374151] text-white"
                    : "bg-linear-to-br from-[#EF4444] to-[#991B1B] text-white"
                }`}
              >
                {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Message Content */}
              <div
                className={`space-y-2 max-w-[82%] text-xs leading-relaxed ${
                  msg.sender === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block rounded-2xl px-3.5 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-[#EF4444] text-white rounded-br-none shadow-md"
                      : "bg-[#161F33] text-slate-100 rounded-bl-none border border-[#1F2937]"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <>
                      {msg.text && <ChatText text={msg.text} />}
                      {msg.status && (
                        <div className="flex items-center gap-2 text-[11px] italic text-[#9CA3AF]">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-bounce [animation-delay:0.2s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-bounce [animation-delay:0.4s]" />
                          </span>
                          <span>{msg.status}</span>
                        </div>
                      )}
                      {msg.error && (
                        <p role="alert" className="text-[#F87171]">
                          {msg.error}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Widget do agent dựng (lịch chiếu, ghế, thanh toán...) */}
                {msg.widgets.map((w, i) => (
                  <AgentWidgetView
                    key={`${msg.id}-w${i}`}
                    widget={w}
                    onSend={(t) => void send(t)}
                    onNavigate={onClose}
                    disabled={isStreaming}
                  />
                ))}

                <span className="block text-[10px] text-[#6B7280]">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-[#1F2937]/60 bg-[#0B0F19]/50">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
              Gợi ý nhanh:
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void send(prompt)}
                  disabled={isStreaming}
                  className="rounded-lg border border-[#1F2937] bg-[#111827] px-2.5 py-1.5 text-left text-[10px] text-slate-300 hover:border-[#EF4444]/60 hover:text-white transition line-clamp-1"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Footer */}
        <div className="border-t border-[#1F2937] bg-[#0E1422] p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi AI đặt vé (ví dụ: '2 vé Người Nhện tối nay')..."
              className="flex-1 rounded-xl border border-[#1F2937] bg-[#080C15] px-3.5 py-2.5 text-xs text-white placeholder-[#6B7280] focus:border-[#EF4444] focus:outline-none focus:ring-1 focus:ring-[#EF4444]/30"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                title="Dừng"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#374151] text-white transition hover:bg-[#4B5563] active:scale-95"
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EF4444] text-white transition hover:bg-[#F87171] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#EF4444]"
              >
                <Send size={15} />
              </button>
            )}
          </form>
          <p className="mt-1.5 text-center text-[10px] text-[#6B7280]">
            Trợ lý AI có thể sai sót. Thông tin giá, ghế và thanh toán luôn lấy từ
            hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
}
