interface ErrorPayload {
  message?: string;
}

interface ResponseLike {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<ResponseLike>;

export interface PushSubscriptionLike {
  endpoint: string;
  toJSON: () => unknown;
  unsubscribe: () => Promise<boolean>;
}

export interface PushManagerLike {
  getSubscription: () => Promise<PushSubscriptionLike | null>;
  subscribe: (options?: PushSubscriptionOptionsInit) => Promise<PushSubscriptionLike>;
}

async function readResponseMessage(response: ResponseLike, fallbackMessage: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  return `${fallbackMessage} (HTTP ${response.status})`;
}

export async function postPushSubscription(
  fetchImpl: FetchLike,
  subscription: unknown,
): Promise<void> {
  const response = await fetchImpl("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription,
    }),
  });

  if (!response.ok) {
    throw new Error(await readResponseMessage(response, "Failed to sync push subscription"));
  }
}

export async function ensurePushSubscriptionRegistered(input: {
  pushManager: PushManagerLike;
  applicationServerKey: PushSubscriptionOptionsInit["applicationServerKey"];
  syncSubscription: (subscription: unknown) => Promise<void>;
}): Promise<PushSubscriptionLike> {
  const existingSubscription = await input.pushManager.getSubscription();
  if (existingSubscription) {
    await input.syncSubscription(existingSubscription.toJSON());
    return existingSubscription;
  }

  const createdSubscription = await input.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: input.applicationServerKey,
  });

  try {
    await input.syncSubscription(createdSubscription.toJSON());
    return createdSubscription;
  } catch (error) {
    try {
      await createdSubscription.unsubscribe();
    } catch {
      // Keep the original sync error.
    }
    throw error;
  }
}
