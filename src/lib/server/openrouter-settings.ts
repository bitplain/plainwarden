import { LlmProviderStatus } from "@prisma/client";
import prisma from "@/lib/server/prisma";
import {
  OpenRouterApiError,
  listOpenRouterModels,
  type OpenRouterModelOption,
  validateOpenRouterKey,
} from "@/lib/server/openrouter-client";
import { decryptSecret, encryptSecret, getOpenRouterEncryptionSecret, maskOpenRouterKey } from "@/lib/server/openrouter-secret";

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

export interface OpenRouterUserConfigView {
  hasKey: boolean;
  keyMask: string | null;
  status: LlmProviderStatus;
  model: string;
  lastValidatedAt: string | null;
}

interface RuntimeConfig {
  apiKey: string | null;
  model: string;
}

function toView(input: {
  encryptedApiKey: string | null;
  apiKeyMask: string | null;
  status: LlmProviderStatus;
  model: string;
  lastValidatedAt: Date | null;
}): OpenRouterUserConfigView {
  return {
    hasKey: Boolean(input.encryptedApiKey),
    keyMask: input.apiKeyMask,
    status: input.status,
    model: input.model || DEFAULT_OPENROUTER_MODEL,
    lastValidatedAt: input.lastValidatedAt ? input.lastValidatedAt.toISOString() : null,
  };
}

async function ensureConfig(userId: string) {
  return prisma.userLlmConfig.upsert({
    where: { userId },
    create: {
      userId,
      provider: "openrouter",
      model: DEFAULT_OPENROUTER_MODEL,
      status: LlmProviderStatus.unknown,
    },
    update: {},
  });
}

export async function getOpenRouterUserConfig(userId: string): Promise<OpenRouterUserConfigView> {
  const config = await ensureConfig(userId);
  return toView(config);
}

export async function saveOpenRouterKey(userId: string, apiKey: string): Promise<{ valid: boolean; config: OpenRouterUserConfigView }> {
  const normalized = apiKey.trim();
  if (!normalized) {
    throw new Error("OpenRouter key is required");
  }

  const validation = await validateOpenRouterKey(normalized);
  const status = validation.valid ? LlmProviderStatus.valid : LlmProviderStatus.invalid;

  const encryptedApiKey = encryptSecret(normalized, getOpenRouterEncryptionSecret());
  const updated = await prisma.userLlmConfig.upsert({
    where: { userId },
    create: {
      userId,
      provider: "openrouter",
      encryptedApiKey,
      apiKeyMask: maskOpenRouterKey(normalized),
      model: DEFAULT_OPENROUTER_MODEL,
      status,
      lastValidatedAt: new Date(),
    },
    update: {
      encryptedApiKey,
      apiKeyMask: maskOpenRouterKey(normalized),
      status,
      lastValidatedAt: new Date(),
    },
  });

  return {
    valid: validation.valid,
    config: toView(updated),
  };
}

export async function clearOpenRouterKey(userId: string): Promise<OpenRouterUserConfigView> {
  const updated = await prisma.userLlmConfig.upsert({
    where: { userId },
    create: {
      userId,
      provider: "openrouter",
      encryptedApiKey: null,
      apiKeyMask: null,
      model: DEFAULT_OPENROUTER_MODEL,
      status: LlmProviderStatus.unknown,
      lastValidatedAt: null,
    },
    update: {
      encryptedApiKey: null,
      apiKeyMask: null,
      status: LlmProviderStatus.unknown,
      lastValidatedAt: null,
    },
  });

  return toView(updated);
}

export async function setOpenRouterModel(userId: string, model: string): Promise<OpenRouterUserConfigView> {
  const normalized = model.trim();
  if (!normalized) {
    throw new Error("Model is required");
  }

  const updated = await prisma.userLlmConfig.upsert({
    where: { userId },
    create: {
      userId,
      provider: "openrouter",
      model: normalized,
      status: LlmProviderStatus.unknown,
    },
    update: {
      model: normalized,
    },
  });

  return toView(updated);
}

export async function getOpenRouterRuntimeConfig(userId: string): Promise<RuntimeConfig> {
  const config = await ensureConfig(userId);

  if (!config.encryptedApiKey || config.status === LlmProviderStatus.invalid) {
    return {
      apiKey: null,
      model: config.model || DEFAULT_OPENROUTER_MODEL,
    };
  }

  try {
    const apiKey = decryptSecret(config.encryptedApiKey, getOpenRouterEncryptionSecret());
    return {
      apiKey,
      model: config.model || DEFAULT_OPENROUTER_MODEL,
    };
  } catch {
    await prisma.userLlmConfig.update({
      where: { id: config.id },
      data: {
        status: LlmProviderStatus.invalid,
      },
    });
    return {
      apiKey: null,
      model: config.model || DEFAULT_OPENROUTER_MODEL,
    };
  }
}

export async function listOpenRouterModelsForUser(userId: string): Promise<OpenRouterModelOption[]> {
  const config = await ensureConfig(userId);
  if (!config.encryptedApiKey) {
    return [];
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(config.encryptedApiKey, getOpenRouterEncryptionSecret());
  } catch {
    await prisma.userLlmConfig.update({
      where: { id: config.id },
      data: {
        status: LlmProviderStatus.invalid,
      },
    });
    return [];
  }

  let models: OpenRouterModelOption[];
  try {
    models = await listOpenRouterModels(apiKey);
  } catch (error) {
    if (error instanceof OpenRouterApiError && error.status === 401) {
      await prisma.userLlmConfig.update({
        where: { id: config.id },
        data: {
          status: LlmProviderStatus.invalid,
          lastValidatedAt: new Date(),
        },
      });
    }
    throw error;
  }

  await prisma.userLlmConfig.update({
    where: { userId },
    data: {
      status: LlmProviderStatus.valid,
      lastValidatedAt: new Date(),
    },
  });

  return models;
}
