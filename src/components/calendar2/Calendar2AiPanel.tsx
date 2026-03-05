"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import { readAiTheme, subscribeAiTheme, type AiTheme } from "@/components/ai-theme";

const THEME_LABEL: Record<AiTheme, string> = {
  cyber: "Cyber Pulse",
  ambient: "Ambient Flow",
  terminal: "Terminal AI",
};

const THEME_STYLES: Record<
  AiTheme,
  {
    panel: string;
    muted: string;
    accent: string;
    button: string;
    soft: string;
  }
> = {
  cyber: {
    panel: "border-[rgba(56,189,248,0.26)] bg-[rgba(11,18,33,0.92)]",
    muted: "text-[#9cb0d3]",
    accent: "text-[#d7e5ff]",
    button: "border-[rgba(56,189,248,0.44)] bg-[rgba(56,189,248,0.16)] hover:bg-[rgba(56,189,248,0.24)]",
    soft: "bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.3)]",
  },
  ambient: {
    panel: "border-[rgba(245,158,11,0.3)] bg-[rgba(24,17,10,0.92)]",
    muted: "text-[#ccb38f]",
    accent: "text-[#f5e7d0]",
    button: "border-[rgba(245,158,11,0.44)] bg-[rgba(245,158,11,0.16)] hover:bg-[rgba(245,158,11,0.24)]",
    soft: "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.28)]",
  },
  terminal: {
    panel: "border-[rgba(34,197,94,0.3)] bg-[rgba(4,14,6,0.94)]",
    muted: "text-[#7ac887]",
    accent: "text-[#caf6d2]",
    button: "border-[rgba(34,197,94,0.44)] bg-[rgba(34,197,94,0.14)] hover:bg-[rgba(34,197,94,0.22)]",
    soft: "bg-[rgba(34,197,94,0.12)] border-[rgba(34,197,94,0.28)]",
  },
};

const PROMPT_SUGGESTIONS = [
  "Покажи задачи на сегодня",
  "Какие дедлайны у меня завтра?",
  "Сгруппируй задачи по приоритету на неделю",
];

export default function Calendar2AiPanel() {
  const router = useRouter();
  const agentMemory = useAgentMemory();
  const agent = useAgent({
    onNavigate: (path) => {
      router.push(path);
    },
  });

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AiTheme>(() => readAiTheme());

  const isBusy = agent.isStreaming;
  const canSubmit = input.trim().length > 0 && !isBusy;
  const themeUi = THEME_STYLES[theme];

  useEffect(() => subscribeAiTheme(setTheme), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const message = input.trim();
    setInput("");
    setError(null);

    try {
      await agent.sendMessage(message, agentMemory.items);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Не удалось отправить запрос к AI");
    }
  };

  return (
    <section
      data-aip-theme={theme}
      className={`flex min-h-0 flex-1 flex-col gap-3 rounded-[8px] border p-3 transition-colors sm:p-4 ${themeUi.panel}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-[14px] font-semibold ${themeUi.accent}`}>AI-помощник</h2>
          <p className={`mt-1 text-[12px] ${themeUi.muted}`}>
            Работает с календарём, канбаном и заметками. Деструктивные действия требуют подтверждения.
          </p>
        </div>
        <div className={`text-right text-[11px] ${themeUi.muted}`}>
          <div>Тема: {THEME_LABEL[theme]}</div>
          <div>Память: {agentMemory.items.length}</div>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className={`rounded-[6px] border px-2.5 py-1 text-[11px] transition-colors ${themeUi.button} ${themeUi.accent}`}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto rounded-[8px] border p-3 ${themeUi.soft}`}>
        {agent.messages.length === 0 ? (
          <p className={`text-[12px] ${themeUi.muted}`}>
            Пока нет сообщений. Сформулируйте задачу на естественном языке.
          </p>
        ) : (
          <div className="space-y-2.5">
            {agent.messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-[6px] border px-2.5 py-2 ${themeUi.soft}`}
              >
                <p className={`mb-1 text-[10px] uppercase tracking-[0.1em] ${themeUi.muted}`}>
                  {message.role === "user" ? "Вы" : "AI"}
                </p>
                <p className={`whitespace-pre-wrap break-words text-[12px] ${themeUi.accent}`}>
                  {message.text || (message.streaming ? "..." : "")}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {agent.pendingAction ? (
        <div className={`rounded-[8px] border p-3 ${themeUi.soft}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${themeUi.accent}`}>
            Требуется подтверждение
          </p>
          <p className={`mt-1 text-[12px] ${themeUi.accent}`}>{agent.pendingAction.summary}</p>
          <p className={`mt-1 text-[11px] ${themeUi.muted}`}>
            Истекает: {new Date(agent.pendingAction.expiresAt).toLocaleString()}
          </p>
          <pre className={`mt-2 max-h-24 overflow-auto rounded-[6px] border p-2 text-[10px] ${themeUi.soft} ${themeUi.muted}`}>
            {JSON.stringify(agent.pendingAction.arguments, null, 2)}
          </pre>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                void agent.resolveAction(true, agentMemory.items);
              }}
              className={`rounded-[6px] border px-2.5 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${themeUi.button} ${themeUi.accent}`}
            >
              Подтвердить
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                void agent.resolveAction(false, agentMemory.items);
              }}
              className={`rounded-[6px] border px-2.5 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${themeUi.soft} ${themeUi.muted}`}
            >
              Отклонить
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className={`rounded-[6px] border px-3 py-2 text-[11px] ${themeUi.soft} ${themeUi.accent}`}>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Например: перенеси встречу на завтра в 10:30"
          className={`h-10 w-full rounded-[8px] border px-3 text-[12px] outline-none placeholder:text-[var(--cal2-text-disabled)] ${themeUi.soft} ${themeUi.accent}`}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className={`h-10 rounded-[8px] border px-4 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${themeUi.button} ${themeUi.accent}`}
        >
          {isBusy ? "Обработка..." : "Отправить"}
        </button>
      </form>
    </section>
  );
}
