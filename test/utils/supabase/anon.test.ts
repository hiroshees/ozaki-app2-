import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnonClient } from "@/utils/supabase/anon";

describe("createAnonClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("URL と anon キーがあればクライアントを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");

    expect(typeof createAnonClient().from).toBe("function");
  });

  it("anon キーが無ければ例外を投げる", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(() => createAnonClient()).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

describe("getAnonClient（使い回す anon クライアント）", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // モジュール内に保持するので、テストごとにモジュールを読み込み直して独立させる
  async function load() {
    vi.resetModules();
    return import("@/utils/supabase/anon");
  }

  it("何度呼んでも同じクライアントを返す（作るたびに GoTrueClient が増えて警告が出るため）", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const { getAnonClient } = await load();

    expect(getAnonClient()).toBe(getAnonClient());
  });

  it("createAnonClient は呼ぶたびに別のクライアントを返す", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const { createAnonClient: create } = await load();

    expect(create()).not.toBe(create());
  });

  it("環境変数が無いと例外を投げ、失敗した結果は保持しない（設定後に使える）", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { getAnonClient } = await load();

    expect(() => getAnonClient()).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(typeof getAnonClient().from).toBe("function");
  });
});
