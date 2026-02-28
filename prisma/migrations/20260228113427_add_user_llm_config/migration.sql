-- CreateEnum
CREATE TYPE "LlmProviderStatus" AS ENUM ('unknown', 'valid', 'invalid');

-- CreateTable
CREATE TABLE "UserLlmConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openrouter',
    "encryptedApiKey" TEXT,
    "apiKeyMask" TEXT,
    "model" TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
    "status" "LlmProviderStatus" NOT NULL DEFAULT 'unknown',
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLlmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLlmConfig_userId_key" ON "UserLlmConfig"("userId");

-- CreateIndex
CREATE INDEX "UserLlmConfig_userId_provider_idx" ON "UserLlmConfig"("userId", "provider");

-- AddForeignKey
ALTER TABLE "UserLlmConfig" ADD CONSTRAINT "UserLlmConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
