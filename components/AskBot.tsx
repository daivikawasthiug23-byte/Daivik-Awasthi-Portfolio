"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

const suggestions = [
  "What did he build at Goldman Sachs?",
  "What is his strongest backend project?",
  "What AI work has he done?",
  "How can I contact him?",
];

type Source = { title: string; href: string };
type Message = { role: "user" | "bot"; text: string; sources?: Source[]; error?: boolean };

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

export function AskBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // The header's "Ask" link (#ask) opens the chat.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#ask") setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const patchLast = (fn: (m: Message) => Message) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    setInput("");
    setBusy(true);
    setMessages((all) => [...all, { role: "user", text }, { role: "bot", text: "" }]);
    const fail = (msg: string) => patchLast((m) => ({ ...m, text: msg, error: true }));
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!res.ok || !res.body) {
        fail(res.status === 429 ? "Too many questions. Try again in a minute." : "Something went wrong. Try again.");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "sources") patchLast((m) => ({ ...m, sources: event.sources }));
          else if (event.type === "token") patchLast((m) => ({ ...m, text: m.text + event.value }));
          else if (event.type === "error") fail("Something went wrong. Try again.");
        }
      }
    } catch {
      fail("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <section
          id="ask"
          role="dialog"
          aria-label="Ask about Daivik"
          className="fixed bottom-[4.5rem] right-4 z-50 flex h-[min(37.5rem,calc(100dvh-6rem))] w-[calc(100vw-2rem)] max-w-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-border py-3.5 pl-5 pr-3.5">
            <div>
              <h2 className="text-sm font-semibold text-fg">Ask about Daivik</h2>
              <p className="mt-0.5 text-xs text-subtle">From his resume and project notes</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className={`inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-fg ${focus}`}
            >
              <X size={15} />
            </button>
          </header>

          <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm leading-6">
            {messages.length === 0 && (
              <>
                <p className="text-muted">Hi! Ask me about Daivik&apos;s work, projects or skills.</p>
                <div className="flex flex-col gap-2 pt-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className={`rounded-xl border border-border px-3.5 py-2.5 text-left text-[13px] leading-5 text-muted hover:bg-hover hover:text-fg ${focus}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-fg px-3.5 py-2 text-bg">{m.text}</p>
                </div>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <p className={`whitespace-pre-wrap rounded-2xl rounded-bl-md bg-hover px-3.5 py-2 ${m.error ? "text-fg" : "text-muted"}`}>
                    {m.text || (busy && i === messages.length - 1 ? "Thinking..." : "")}
                  </p>
                  {m.sources && m.sources.length > 0 && !(busy && i === messages.length - 1) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                      <span className="text-xs text-subtle">Sources</span>
                      {m.sources.map((s) => (
                        <a
                          key={s.href + s.title}
                          href={s.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:text-fg"
                        >
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              placeholder="Ask a question..."
              aria-label="Your question"
              className="min-w-0 flex-1 rounded-full border border-border bg-bg px-4 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-fg/40"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length < 3}
              aria-label="Send"
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-fg text-bg hover:opacity-90 disabled:opacity-40 ${focus}`}
            >
              <Send size={14} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Ask about Daivik"}
        aria-expanded={open}
        className={`fixed bottom-4 right-4 z-50 inline-flex h-10 items-center gap-2 rounded-full bg-fg px-3.5 text-[13px] font-medium text-bg shadow-md hover:opacity-90 sm:right-6 ${focus}`}
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask me"}</span>
      </button>
    </>
  );
}
