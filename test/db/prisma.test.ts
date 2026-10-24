import { afterEach, describe, expect, it, vi } from "vitest";

// server-only は Server Component 以外から import すると例外になるため、テストでは空にする
vi.mock("server-only", () => ({}));

const globalForPrisma = globalThis as unknown as { prisma?: unknown };

async function load() {
  vi.resetModules();
  return import("@/db/prisma");
}

describe("prisma（PrismaClient のシングルトン）", () => {
  afterEach(() => {
    delete globalForPrisma.prisma;
    vi.unstubAllEnvs();
  });

  it("モジュールが再評価されても同じインスタンスを使う（ホットリロード対策）", async () => {
    const first = await load();
    const second = await load();

    expect(second.prisma).toBe(first.prisma);
  });

  it("本番では globalThis に保持しない", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { prisma } = await load();

    expect(prisma).toBeDefined();
    expect(globalForPrisma.prisma).toBeUndefined();
  });
});
