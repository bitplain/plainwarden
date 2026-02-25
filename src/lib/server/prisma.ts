import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaConnectionString(): string {
  return (
    process.env.DATABASE_URL?.trim() ??
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
  );
}

const prisma =
  globalForPrisma.prisma ??
  (() => {
    const adapter = new PrismaPg({
      connectionString: getPrismaConnectionString(),
    });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
