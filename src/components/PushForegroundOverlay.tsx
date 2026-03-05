"use client";

import { useEffect, useRef, useState } from "react";
import { createRandomId } from "@/lib/random-id";
import { parsePushForegroundMessage, type PushForegroundToast } from "@/lib/push-foreground";

interface PushForegroundToastItem extends PushForegroundToast {
  id: string;
}

export function PushForegroundToastViewport(props: {
  items: PushForegroundToastItem[];
  onClose: (id: string) => void;
  onOpen: (item: PushForegroundToastItem) => void;
}) {
  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="nd-push-toast-viewport" aria-live="polite" aria-atomic="true">
      {props.items.map((item) => (
        <section key={item.id} className="nd-push-toast" role="status">
          <div className="nd-push-toast-meta">Browser notification</div>
          <div className="nd-push-toast-title">{item.title}</div>
          <div className="nd-push-toast-body">{item.body}</div>
          <div className="nd-push-toast-actions">
            {item.navigateTo ? (
              <button
                type="button"
                className="nd-push-toast-open"
                onClick={() => props.onOpen(item)}
              >
                Открыть
              </button>
            ) : null}
            <button
              type="button"
              className="nd-push-toast-close"
              onClick={() => props.onClose(item.id)}
            >
              Закрыть
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function PushForegroundOverlay() {
  const [items, setItems] = useState<PushForegroundToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return undefined;
    }

    const closeToast = (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
      const timerId = timersRef.current.get(id);
      if (typeof timerId === "number") {
        window.clearTimeout(timerId);
        timersRef.current.delete(id);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const toast = parsePushForegroundMessage(event.data);
      if (!toast) {
        return;
      }

      const nextId = createRandomId();
      setItems((current) => {
        const deduped = toast.tag
          ? current.filter((item) => item.tag !== toast.tag)
          : current;
        return [{ id: nextId, ...toast }, ...deduped].slice(0, 3);
      });

      const timerId = window.setTimeout(() => {
        closeToast(nextId);
      }, 8000);
      timersRef.current.set(nextId, timerId);
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      for (const timerId of timersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      timersRef.current.clear();
    };
  }, []);

  return (
    <PushForegroundToastViewport
      items={items}
      onClose={(id) => {
        setItems((current) => current.filter((item) => item.id !== id));
        const timerId = timersRef.current.get(id);
        if (typeof timerId === "number") {
          window.clearTimeout(timerId);
          timersRef.current.delete(id);
        }
      }}
      onOpen={(item) => {
        if (item.navigateTo) {
          window.location.assign(item.navigateTo);
        }
      }}
    />
  );
}
