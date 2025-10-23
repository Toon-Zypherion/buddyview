'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const shimmer =
  "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:content-['']";

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
    return <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-200" {...rest} />;
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
    return <a className="text-emerald-300 underline underline-offset-2" {...rest} />;
  },
};

export default function ChatModal({ buddy, isOpen, onClose }) {
  const buddyId = buddy?.id ?? null;
  const [buddyDetail, setBuddyDetail] = useState(null);
  const [isLoadingBuddy, setIsLoadingBuddy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const chatEndRef = useRef(null);

  const containerState = useMemo(
    () =>
      isOpen
        ? "opacity-100 scale-100 blur-0 pointer-events-auto"
        : "opacity-0 scale-[0.98] blur-[3px] pointer-events-none",
    [isOpen],
  );

  const buddyFirstName = useMemo(
    () => (buddy?.name ? buddy.name.split(" ")[0] : "Buddy"),
    [buddy?.name],
  );

  useEffect(() => {
    setBuddyDetail(null);
    setMessages([]);
    setInputValue("");
    setLoadError(null);

    if (!buddyId) {
      setIsLoadingBuddy(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setIsLoadingBuddy(true);

    (async () => {
      try {
        const response = await fetch(`/api/buddies/${buddyId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load buddy data.");
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        setBuddyDetail(data);
        setMessages([
          {
            id: createMessageId(),
            role: "assistant",
            content: `Channel open. ${data.name.split(" ")[0]} on deck — ${data.role.toLowerCase()}.`,
          },
        ]);
      } catch (caughtError) {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : "Transmission glitch. Try again in a moment.";

        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingBuddy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [buddyId]);

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

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!buddyDetail || isSending) {
        return;
      }

      const trimmed = inputValue.trim();

      if (!trimmed) {
        return;
      }

      const userMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      };

      const historyForServer = [...messages, userMessage].map(
        ({ role, content }) => ({
          role,
          content,
        }),
      );

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsSending(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            buddyId: buddyDetail.id,
            message: trimmed,
            history: historyForServer,
          }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: data.reply ?? "Signal received.",
          },
        ]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : null;

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content:
              message ??
              "Static on the line. Give it another go when the signal clears.",
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [buddyDetail, inputValue, isSending, messages],
  );

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-l-[32px] border-l border-white/10 bg-[#0b0d11]/90 text-zinc-100 shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${containerState}`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.2),transparent_55%)]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_right,rgba(94,234,212,0.15),transparent_60%)]" />

      <header className="flex items-center justify-between px-6 py-5">
        {buddy ? (
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-800 via-slate-600 to-slate-500">
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                {initialsFor(buddy.name)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Linked Session
              </span>
              <h2 className="text-xl font-semibold text-zinc-50">
                {buddy.name}
              </h2>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Awaiting Link
            </span>
            <h2 className="text-xl font-semibold text-zinc-200">
              Select a buddy
            </h2>
          </div>
        )}
        {onClose ? (
          <button
            onClick={onClose}
            className="hidden rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
          >
            Close
          </button>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden px-6 pb-6">
        <section className="relative flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/10 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
            System Pulse
          </h3>
          <p className="text-sm leading-6 text-zinc-300">
            {buddy
              ? `Tuning to ${buddy.name.split(" ")[0]}'s synthesis channel.`
              : "Signal dormant. Pick a buddy to amplify their frequencies."}
          </p>
          <span className="text-xs text-zinc-500">
            Live scene: Antwerp orbital mesh.
          </span>
        </section>

        <section className="flex flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-5 shadow-inner shadow-black/40 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-200">
            Chat Stream
          </h3>
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 text-sm leading-6 text-zinc-300">
              {buddy ? (
                loadError ? (
                  <p className="text-rose-300">{loadError}</p>
                ) : !messages.length && isLoadingBuddy ? (
                  <p className="text-zinc-400">Calibrating channel…</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message) => (
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
                            {message.role === "user" ? "You" : buddyFirstName}
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
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )
              ) : (
                <p className="text-zinc-500">
                  Whisper a buddy&apos;s name to bring their channel into focus.
                </p>
              )}
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200"
            >
              
              <input
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={
                  buddy
                    ? "Type your signal..."
                    : "Select a buddy to enable input."
                }
                disabled={!buddy || !buddyDetail || Boolean(loadError)}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:text-zinc-600"
              />
              <button
                type="submit"
                disabled={
                  !buddy ||
                  !buddyDetail ||
                  Boolean(loadError) ||
                  isSending ||
                  !inputValue.trim()
                }
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

function initialsFor(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function labelFor(section) {
  switch (section) {
    case "systemInstructions":
      return "System";
    case "customInstructions":
      return "Custom";
    case "userInstructions":
      return "User";
    case "context":
      return "Context";
    default:
      return section;
  }
}

function renderInstruction({
  buddy,
  buddyDetail,
  isLoadingBuddy,
  loadError,
  section,
}) {
  if (!buddy) {
    return "—";
  }

  if (loadError) {
    return loadError;
  }

  if (isLoadingBuddy && !buddyDetail) {
    return "Calibrating…";
  }

  if (section === "context") {
    if (isLoadingBuddy && !buddyDetail) {
      return "Calibrating…";
    }

    const context = buddyDetail?.context;

    if (context) {
      return context;
    }

    if (buddy?.contextFile) {
      return `Context file missing or unreadable (${buddy.contextFile}).`;
    }

    return "No context bound.";
  }

  const value =
    buddyDetail?.[section] ??
    (buddy && typeof buddy[section] === "string" ? buddy[section] : null);

  return value || "No data bound.";
}

function createMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
