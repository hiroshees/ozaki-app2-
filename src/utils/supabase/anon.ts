import { createClient } from "@supabase/supabase-js";

// 読み取り（SELECT）と Realtime 購読用の anon クライアント。ブラウザからも使える。
// anon には書き込み権限がない（RLS で SELECT のみ許可）ため、書き込みは admin.ts 経由で行う
export function createAnonClient() {
  // NEXT_PUBLIC_ の変数はビルド時に埋め込まれるため、process.env.XXX と直接書く
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください",
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
