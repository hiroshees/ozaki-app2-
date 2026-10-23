import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/utils/supabase/admin";

// server-only は react-server 条件以外で import すると例外を投げるため、テストでは無効化する
vi.mock("server-only", () => ({}));

describe("createAdminClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("URL とシークレットキーがあればクライアントを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");

    expect(typeof createAdminClient().from).toBe("function");
  });

  it("シークレットキーが無ければ例外を投げる", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    expect(() => createAdminClient()).toThrow("SUPABASE_SECRET_KEY");
  });

  it("URL が無ければ例外を投げる", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");

    expect(() => createAdminClient()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });
});
