"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgent } from "@/hooks/useAgent";
import { useAgentMemory } from "@/hooks/useAgentMemory";

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

  const isBusy = agent.isStreaming;
  const canSubmit = input.trim().length > 0 && !isBusy;

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
    <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-3 sm:p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--cal2-text-primary)]">AI-помощник</h2>
          <p className="mt-1 text-[12px] text-[var(--cal2-text-secondary)]">
            Работает с календарём, ежедневником, канбаном и заметками. Деструктивные действия требуют подтверждения.
          </p>
        </div>
        <div className="text-[11px] text-[var(--cal2-text-secondary)]">
          Память: {agentMemory.items.length}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className="rounded-[6px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-[var(--cal2-text-secondary)] transition-colors hover:text-[var(--cal2-text-primary)]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] p-3">
        {agent.messages.length === 0 ? (
          <p className="text-[12px] text-[var(--cal2-text-secondary)]">
            Пока нет сообщений. Сформулируйте задачу на естественном языке.
          </p>
        ) : (
          <div className="space-y-2.5">
            {agent.messages.map((message) => (
              <article
                key={message.id}
                className="rounded-[6px] border border-[var(--cal2-border)] bg-[rgba(255,255,255,0.02)] px-2.5 py-2"
              >
                <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[var(--cal2-text-secondary)]">
                  {message.role === "user" ? "Вы" : "AI"}
                </p>
                <p className="whitespace-pre-wrap break-words text-[12px] text-[var(--cal2-text-primary)]">
                  {message.text || (message.streaming ? "..." : "")}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {agent.pendingAction ? (
        <div className="rounded-[8px] border border-[rgba(94,106,210,0.42)] bg-[var(--cal2-accent-soft)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cal2-text-primary)]">
            Требуется подтверждение
          </p>
          <p className="mt-1 text-[12px] text-[var(--cal2-text-primary)]">{agent.pendingAction.summary}</p>
          <p className="mt-1 text-[11px] text-[var(--cal2-text-secondary)]">
            Истекает: {new Date(agent.pendingAction.expiresAt).toLocaleString()}
          </p>
          <pre className="mt-2 max-h-24 overflow-auto rounded-[6px] border border-[var(--cal2-border)] bg-[rgba(0,0,0,0.22)] p-2 text-[10px] text-[var(--cal2-text-secondary)]">
            {JSON.stringify(agent.pendingAction.arguments, null, 2)}
          </pre>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                void agent.resolveAction(true, agentMemory.items);
              }}
              className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Подтвердить
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                void agent.resolveAction(false, agentMemory.items);
              }}
              className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--cal2-text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Отклонить
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 py-2 text-[11px] text-[var(--cal2-text-primary)]">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Например: перенеси встречу на завтра в 10:30"
          className="h-10 w-full rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)]"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-10 rounded-[8px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent)] px-4 text-[12px] font-semibold text-[var(--cal2-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Обработка..." : "Отправить"}
        </button>
      </form>
    </section>
  );
}
