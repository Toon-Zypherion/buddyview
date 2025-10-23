'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  p: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <p className="whitespace-pre-wrap leading-6 text-zinc-200" {...rest} />
    );
  },
  ul: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-200" {...rest} />
    );
  },
  ol: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-200" {...rest} />
    );
  },
  li: (props) => {
    const { node, ...rest } = props;
    void node;
    return <li className="text-zinc-200" {...rest} />;
  },
  table: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <div className="mt-2 overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm text-zinc-200"
          {...rest}
        />
      </div>
    );
  },
  thead: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <thead className="bg-white/10 text-xs uppercase tracking-[0.2em]" {...rest} />
    );
  },
  th: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <th
        className="border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-100"
        {...rest}
      />
    );
  },
  tbody: (props) => {
    const { node, ...rest } = props;
    void node;
    return <tbody {...rest} />;
  },
  tr: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <tr className="border border-white/10 [&:nth-child(even)]:bg-white/5" {...rest} />
    );
  },
  td: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <td className="border border-white/10 px-3 py-2 align-top text-zinc-200" {...rest} />
    );
  },
  code: (props) => {
    const { node, inline, className, ...rest } = props;
    void node;
    if (inline) {
      return (
        <code
          className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-emerald-200"
          {...rest}
        />
      );
    }
    return <code className={className} {...rest} />;
  },
  pre: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <pre
        className="mt-2 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-3 text-xs text-emerald-200"
        {...rest}
      />
    );
  },
  strong: (props) => {
    const { node, ...rest } = props;
    void node;
    return <strong className="font-semibold text-zinc-100" {...rest} />;
  },
  em: (props) => {
    const { node, ...rest } = props;
    void node;
    return <em className="italic text-zinc-200" {...rest} />;
  },
  a: (props) => {
    const { node, ...rest } = props;
    void node;
    return (
      <a className="text-emerald-300 underline underline-offset-2" {...rest} />
    );
  },
};

export default function LobbyModal({ buddies }) {
  const buddyMap = useMemo(() => {
    const map = new Map();
    (buddies ?? []).forEach((buddy) => {
      if (buddy?.id) {
        map.set(buddy.id, buddy);
      }
    });
    return map;
  }, [buddies]);

  const [messages, setMessages] = useState(() => [
    {
      id: createMessageId(),
      role: "assistant",
      content: "Lobby channel live. Tag an agent with @agent-id to start.",
      buddyId: null,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showMentions, setShowMentions] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef(new Map());

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!copiedMessageId) {
      return;
    }

    const timeout = setTimeout(() => setCopiedMessageId(null), 1600);

    return () => clearTimeout(timeout);
  }, [copiedMessageId]);

  const handleCopyMessage = useCallback(async (messageId, content) => {
    if (!navigator?.clipboard?.writeText) {
      console.warn("Clipboard not supported in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  }, []);

  const handleMentionKey = useCallback((event) => {
    if (event.key === "@") {
      setShowMentions(true);
      return;
    }

    if (event.key === "Escape") {
      setShowMentions(false);
    }
  }, []);

  useEffect(() => {
    if (!inputValue.startsWith("@")) {
      setShowMentions(false);
    }
  }, [inputValue]);

  const handleSelectMention = useCallback((buddyId) => {
    const nextValue = `@${buddyId} `;
    setInputValue(nextValue);
    setShowMentions(false);
    if (inputRef.current) {
      inputRef.current.focus();
      const length = nextValue.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isSending) {
        return;
      }

      const trimmed = inputValue.trim();

      if (!trimmed) {
        return;
      }

      const mentionMatch = trimmed.match(/^@([A-Za-z0-9_-]+)/);

      if (!mentionMatch) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: "pls tag someone",
            buddyId: null,
            isError: true,
          },
        ]);
        return;
      }

      const mentionedId = mentionMatch[1];
      const targetBuddy = buddyMap.get(mentionedId);

      if (!targetBuddy) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: "pls tag someone",
            buddyId: null,
            isError: true,
          },
        ]);
        return;
      }

      const userMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
        buddyId: mentionedId,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsSending(true);

      const previousHistory = historyRef.current.get(mentionedId) ?? [];
      const historyForServer = [
        ...previousHistory,
        { role: "user", content: trimmed },
      ];
      historyRef.current.set(mentionedId, historyForServer);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            buddyId: mentionedId,
            message: trimmed,
            history: historyForServer,
          }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const data = await response.json();
        const replyContent = data.reply ?? "Signal received.";

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: replyContent,
            buddyId: mentionedId,
          },
        ]);

        const updatedHistory = [
          ...historyForServer,
          { role: "assistant", content: replyContent },
        ];
        historyRef.current.set(mentionedId, updatedHistory);
      } catch (caughtError) {
        console.error("Lobby chat failed", caughtError);
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: "pls tag someone",
            buddyId: null,
            isError: true,
          },
        ]);
        historyRef.current.set(mentionedId, previousHistory);
      } finally {
        setIsSending(false);
      }
    },
    [buddyMap, inputValue, isSending],
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-l-[32px] border-l border-white/10 bg-[#0b0d11]/90 text-zinc-100 shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.2),transparent_55%)]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_right,rgba(94,234,212,0.15),transparent_60%)]" />

      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-800 via-slate-600 to-slate-500">
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
              LB
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              General Channel
            </span>
            <h2 className="text-xl font-semibold text-zinc-50">Lobby</h2>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden px-6 pb-6">
        <section className="relative flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/10 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
            System Pulse
          </h3>
          <p className="text-sm leading-6 text-zinc-300">
            Broadcast line humming. Tag any agent with @agent-id to ping them
            directly.
          </p>
          <span className="text-xs text-zinc-500">Live scene: Lobby floor.</span>
        </section>

        <section className="flex flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-5 shadow-inner shadow-black/40 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-200">
            Chat Stream
          </h3>
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 text-sm leading-6 text-zinc-300">
              <div className="flex flex-col gap-3">
                {messages.map((message) => {
                  const messageBuddy =
                    message.buddyId && buddyMap.get(message.buddyId);
                  const label =
                    message.role === "user"
                      ? "You"
                      : messageBuddy
                        ? firstNameFor(messageBuddy.name)
                        : "Lobby";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`relative max-w-[85%] rounded-3xl border border-white/10 px-4 py-3 shadow-inner shadow-black/30 backdrop-blur ${
                          message.role === "user"
                            ? "bg-indigo-500/20 text-zinc-100"
                            : message.isError
                              ? "bg-rose-500/20 text-rose-100"
                              : "bg-white/10 text-zinc-200"
                        } ${
                          message.role === "assistant" &&
                          message.content &&
                          message.content.length > 500
                            ? "pr-16"
                            : ""
                        }`}
                      >
                        <span className="text-[0.6rem] uppercase tracking-[0.35em] text-zinc-400">
                          {label}
                        </span>
                        <div className="markdown-body mt-1 text-sm leading-6">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        {message.role === "assistant" &&
                        message.content &&
                        message.content.length > 500 ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyMessage(message.id, message.content)
                            }
                            className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30 hover:text-zinc-100"
                            aria-label="Copy response"
                          >
                            {copiedMessageId === message.id ? "Copied" : "Copy"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200"
            >
              <div className="relative flex-1">
                {showMentions && buddyMap.size ? (
                  <div className="absolute bottom-full left-0 right-0 z-20 mb-2 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d11]/95 shadow-[0_18px_36px_rgba(0,0,0,0.45)]">
                    {[...buddyMap.values()].map((buddy) => (
                      <button
                        key={buddy.id}
                        type="button"
                        onClick={() => handleSelectMention(buddy.id)}
                        className="flex items-center justify-between px-4 py-2 text-left text-xs uppercase tracking-[0.3em] text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
                      >
                        <span>@{buddy.id}</span>
                        <span className="text-[0.55rem] tracking-[0.4em] text-zinc-500">
                          {firstNameFor(buddy.name)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleMentionKey}
                  placeholder="Tag an agent with @agent-id..."
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-400 transition hover:border-white/30 hover:text-zinc-200 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-zinc-600"
              >
                {isSending ? "..." : "Send"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function firstNameFor(name) {
  if (!name) {
    return "Agent";
  }

  return name.split(" ")[0];
}

function createMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
