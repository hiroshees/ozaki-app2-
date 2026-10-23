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

let sharedClient: ReturnType<typeof createAnonClient> | undefined;

// アプリ全体で使い回す anon クライアント。予定の取得のたびに createAnonClient すると、
// GoTrueClient が増えて「Multiple GoTrueClient instances」の警告が出る。Realtime の購読（#17）も同じものを使う。
// 作成に失敗（環境変数が未設定など）したときは保持しない
export function getAnonClient() {
  sharedClient ??= createAnonClient();
  return sharedClient;
}
