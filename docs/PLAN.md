# 実装計画

仕様は `docs/SPEC.md`。作業単位は GitHub Issue（1 Issue = 1 ブランチ = 1 PR）。
Issue 作成後、`#?` を番号に置き換える。進捗は `[ ]` → `[x]` で更新する。

## Phase 1: 基盤整備
- [x] #3 テンプレ由来の認証コードを撤去する（`utils/supabase/*`、`middleware.ts`、signin/signup、`actions/auth.ts`、`User`/`Sample` モデルなど）
- [x] #4 CI と package manager を yarn に統一する（`ci.yml` が pnpm のまま。`vercel-build` の `prisma migrate deploy` の扱いも見直す）
- [x] #5 Vitest を導入する（`test` / `test:coverage` スクリプト追加。※新規依存のため事前確認）
- [x] #6 `Event` モデルと初回マイグレーションを追加する（RLS: anon は SELECT のみ）
- [x] #7 サーバー専用 Supabase クライアントを追加する（`src/utils/supabase/admin.ts`、`server-only`、`SUPABASE_SECRET_KEY`、`.env.sample` 追記。※`server-only` は新規依存のため事前確認）
- ~~#27 不要になった依存パッケージを整理する（`@supabase/ssr`、`tsx`、`entities`。#3 で見送った分）~~ **実施せずに終了**
- [ ] #30 Prisma の生成まわりを整理する（`prisma generate` の失敗、生成物の `.gitignore`、`@prisma/client` の扱い）

## Phase 2: 表示
- [x] #8 日付ユーティリティを実装する（`src/lib/calendar/`: JST 変換、週・月の範囲計算。テスト先行）
- [ ] #9 予定の型・zod スキーマ・範囲取得関数を実装する（`src/lib/events/`）
- [ ] #10 searchParams（view, date）の解釈とヘッダーナビを実装する
- [ ] #11 月ビューを実装する（`react-calendar` 導入。※新規依存のため事前確認）
- [ ] #12 予定の重なりレイアウト計算を実装する（純粋関数、テスト先行）
- [ ] #13 週ビュー・日ビューを実装する

## Phase 3: 予定の CRUD
- [ ] #14 予定の作成 Server Action とモーダルを実装する
- [ ] #15 予定の編集 Server Action とモーダルを実装する
- [ ] #16 予定の削除 Server Action と確認ダイアログを実装する

## Phase 4: 検証・仕上げ
- [ ] #17 Realtime 購読で他タブへ反映する
- [ ] #18 ドラッグ＆ドロップで日時を変更する（検証。結果を `docs/` に記録）
- [ ] #19 README を更新する

## 依存関係
```
認証撤去 ─┬─ Event モデル ─ admin クライアント ─ Phase 3
          └─ CI 統一 / Vitest ─ 日付ユーティリティ ─ Phase 2 ─ Phase 3 ─ Phase 4
```

## 方針メモ
- 新規依存は追加前に確認する（Vitest、`react-calendar`、`server-only`）
- 本番 DB に影響するコマンド（`prisma migrate deploy` など）は提示のみで実行しない
  - `vercel-build` から `prisma generate` と `prisma migrate deploy` を外し、`next build` のみにした。マイグレーションは手動で提示されたコマンドを実行する。`prisma generate` は、実行時に Prisma Client を使わない方針のため戻していない（モデル 0 件だと `zod-prisma-types` が失敗していたが、#6 でモデルが入り zod の生成自体は動く。Prisma Client の生成は `@prisma/client`(6.3.1) と CLI(6.19.3) のバージョン差で失敗する）
- CI は yarn で `install --frozen-lockfile` / lint / prettier:check / typecheck / build を実行する。`yarn test:coverage` もここで実行する（カバレッジは出力のみで、最低ラインでの失敗判定はしない）
- Issue 作成時は `phase-N` ラベルを付ける
