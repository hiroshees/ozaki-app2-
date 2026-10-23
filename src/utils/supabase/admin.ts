import "server-only";
import { createClient } from "@supabase/supabase-js";

// 書き込み用（service role）のクライアント。
// RLS をバイパスするため、Server Actions などサーバー側でのみ使う。
// server-only により、クライアントコンポーネントから import するとビルドエラーになる
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SECRET_KEY を設定してください",
    );
  }

  return createClient(url, secretKey, {
    // ログインを使わないため、セッションの保存・更新は行わない
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
