"use client";

import { useEffect, useRef, useState } from "react";
import type { InboxTypeHint } from "@/lib/types";

interface QuickCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (content: string, typeHint?: InboxTypeHint) => Promise<void> | void;
}

export default function QuickCaptureDialog({
  open,
  onClose,
  onSave,
}: QuickCaptureDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [typeHint, setTypeHint] = useState<InboxTypeHint>("task");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue("");
      setTypeHint("task");
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cal2-overlay)] px-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[8px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-2)] p-4 shadow-[0_24px_48px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--cal2-text-primary)]">Quick Capture</h3>
            <p className="mt-1 text-[11px] text-[var(--cal2-text-secondary)]">
              Глобальный захват для моментов вне вкладки Inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-2 py-1 text-[11px] text-[var(--cal2-text-secondary)] hover:text-[var(--cal2-text-primary)]"
          >
            Esc
          </button>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!value.trim() || isSaving) {
              return;
            }
            setIsSaving(true);
            try {
              await onSave(value.trim(), typeHint);
              onClose();
            } finally {
              setIsSaving(false);
            }
          }}
          className="space-y-3"
        >
          <input
            ref={inputRef}
            type="text"
            autoFocus
            autoComplete="off"
            value={value}
            maxLength={2000}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Запиши мысль, задачу или заметку"
            className="h-10 w-full rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none placeholder:text-[var(--cal2-text-disabled)] focus:border-[rgba(94,106,210,0.42)]"
          />

          <div className="flex items-center justify-between gap-2">
            <select
              value={typeHint}
              onChange={(event) => setTypeHint(event.target.value as InboxTypeHint)}
              className="h-9 rounded-[6px] border border-[var(--cal2-border)] bg-[var(--cal2-surface-1)] px-3 text-[12px] text-[var(--cal2-text-primary)] outline-none focus:border-[rgba(94,106,210,0.42)]"
            >
              <option value="task">Task</option>
              <option value="idea">Idea</option>
              <option value="note">Note</option>
              <option value="link">Link</option>
            </select>

            <button
              type="submit"
              disabled={isSaving || !value.trim()}
              className="h-9 rounded-[6px] border border-[rgba(94,106,210,0.45)] bg-[var(--cal2-accent-soft)] px-3 text-[12px] font-semibold text-[var(--cal2-text-primary)] hover:bg-[var(--cal2-accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
