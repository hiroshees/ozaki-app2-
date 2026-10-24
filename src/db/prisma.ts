import "server-only";
import { PrismaClient } from "@prisma/client";

// 開発時はホットリロードでモジュールが再評価されるため、globalThis に保持して
// PrismaClient（= DB 接続）が増え続けないようにする
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
