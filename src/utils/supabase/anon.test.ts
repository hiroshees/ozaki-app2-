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
