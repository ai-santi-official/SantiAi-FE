"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { SparklesIcon } from "@/components/icons";
import { apiFetch } from "@/utils/api";

// ─── Types ───────────────────────────────────────────────────────────────────
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// ─── Icons ───────────────────────────────────────────────────────────────────
function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Quick-action chips ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  "Extend deadlines",
  "Add a meeting",
  "Change assignee",
  "Summarize plan",
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ActiveEditWithAiPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [projectName, setProjectName] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load project info on mount
  useEffect(() => {
    if (!projectId) return;
    apiFetch(`/api/v1/projects/${projectId}`)
      .then((r) => r.json())
      .then(({ project }) => {
        setProjectName(project.project_name ?? "");
        const d = project.final_due_date
          ? new Date(project.final_due_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "";
        setProjectDeadline(d);
      })
      .catch(() => {});

    // Initial greeting
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content:
          "Hi! I'm ready to help you refine your plan. What would you like to change? I can adjust deadlines, add tasks, or reassign members.",
      },
    ]);
  }, [projectId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || !projectId || sending) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await apiFetch(`/api/v1/ai/plans/projects/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ change_type: "ai_reprompt", prompt_text: prompt }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json();
      const reasoning =
        data.plan_version?.snapshot?.ai_reasoning ??
        data.plan_version?.snapshot?.plan_rationale ??
        "Done! I've updated the plan based on your request. Tap \"View full plan\" to see the changes.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: reasoning,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-white">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex-1 ml-1">
          <h2 className="text-lg font-bold text-black">Edit with AI</h2>
        </div>
        <button
          onClick={() => router.push("/info-edit")}
          aria-label="Close"
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-slate-50 transition-colors"
        >
          <CloseIcon />
        </button>
      </header>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-5 pb-4">
        {messages.map((msg) =>
          msg.role === "assistant" ? (
            <div key={msg.id} className="flex items-start gap-2.5">
              {/* Santi avatar */}
              <div className="w-8 h-8 rounded-full bg-santi-secondary flex items-center justify-center shrink-0 border border-santi-primary/20">
                <SparklesIcon className="w-4 h-4 text-santi-primary" />
              </div>
              <div className="flex flex-col gap-1 items-start max-w-[80%]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-santi-muted ml-1">
                  Santi
                </p>
                <div className="text-sm leading-relaxed rounded-2xl rounded-tl-none px-3.5 py-2.5 bg-santi-secondary text-black/80">
                  {msg.content}
                </div>
                {msg.id !== "greeting" && (
                  <button
                    onClick={() => router.push(`/info-edit/project/${projectId}`)}
                    className="flex items-center gap-1 mt-1.5 ml-1 text-xs font-medium text-santi-primary active:opacity-70 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    View in calendar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex items-start gap-2.5 justify-end">
              <div className="flex flex-col gap-1 items-end max-w-[80%]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-santi-muted mr-1">
                  You
                </p>
                <div className="text-sm leading-relaxed rounded-2xl rounded-tr-none px-3.5 py-2.5 bg-slate-100 text-black/80 border border-slate-200">
                  {msg.content}
                </div>
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-santi-secondary flex items-center justify-center shrink-0 border border-santi-primary/20">
              <SparklesIcon className="w-4 h-4 text-santi-primary" />
            </div>
            <div className="flex flex-col gap-1 items-start">
              <p className="text-[10px] font-bold uppercase tracking-wider text-santi-muted ml-1">
                Santi
              </p>
              <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-santi-secondary">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-black/30 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-black/30 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-black/30 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick action chips */}
      <div className="px-4 pb-2 shrink-0 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => { setInput(action); inputRef.current?.focus(); }}
              disabled={sending}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-black/60 active:border-santi-primary active:text-black transition-all disabled:opacity-40"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div
        className="px-4 pt-2 bg-white border-t border-slate-100 shrink-0"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-1.5 border border-slate-200">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Santi what to change..."
            disabled={sending}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-2 text-black placeholder:text-santi-muted"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-full bg-santi-primary flex items-center justify-center shrink-0 active:brightness-95 transition-all disabled:opacity-40"
          >
            <SendIcon className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
