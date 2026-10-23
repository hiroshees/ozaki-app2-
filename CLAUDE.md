# 共有カレンダー（学習用）

Next.js（App Router）+ TypeScript + Supabase + Prisma + FullCalendar で作るカレンダー。
仕様は `docs/SPEC.md`、実装計画と進捗は `docs/PLAN.md`。作業前に両方を読むこと。

## コマンド
- パッケージマネージャー: `yarn`（このプロジェクトのみ。グローバルの pnpm 方針より優先）
- 開発サーバー: `yarn run dev`
- テスト: `yarn test`（Vitest）。カバレッジ付きは `yarn test:coverage`（CI で実行）
- 型チェック: `yarn typecheck`
- lint: `yarn lint`（`src/` と `test/` が対象）
- 整形: `yarn prettier`（`src/` と `test/` を書き換える）。チェックのみは `yarn prettier:check`（CI で実行）

## 概要
- Next.js（App Router）+ TypeScript + Supabase + Prisma + FullCalendar で作るカレンダーを作る。
- Supabaseを利用するが、ユーザ認証は行わない。postgreSQLをデータベースとして利用するだけにする。
- SupabaseのDBと連動したカレンダーアプリになります。
- 実際に公開しない。`FullCalendar` で実現可能なことをローカル環境で確認するために構築するサービスになる。
- 当初は `react-calendar` を使っていたが、月ビューしかない（週・日ビューがない）ため FullCalendar に転換した（経緯は `docs/PLAN.md`）。
- `FullCalendar`（v7、標準の MIT プラグインのみ。Premium は使わない）を利用して、月ビュー、週ビュー、日ビューを実現する。
- カレンダーにイベントを新規登録、編集、削除を行う。
- カレンダーは日本語で表示する。
- カレンダーの日時は`Asia/Tokyo`にする。タイムゾーンに注意する。
- 可能であれば、ドラッグ＆ドロップで日時を変更可能かを検証する。

## アーキテクチャの決まりごと
- 既存の `src/` 構造（actions, components, config, db, hooks, lib, types, utils）に従う
- テンプレ由来の認証コード（`src/utils/supabase/*` の ssr クライアント、`middleware.ts`、signin/signup 画面、`User`/`Sample` モデル）は Issue #3 で撤去済み。再導入しない

### データアクセス
- **予定の読み取り・書き込みは、すべてサーバー側で Prisma を使う**。読み取りは Route Handler（`GET /api/events`）、書き込み（作成・更新・削除）は Server Actions。ブラウザ（クライアントコンポーネント）は DB に直接アクセスしない
- Prisma クライアントは `src/db/prisma.ts` に置く（`server-only` で保護。クライアントコンポーネントから import しない）
- 環境変数は `DATABASE_URL`（Supabase のプーラー。実行時のクエリ用。`pgbouncer=true`）と `DIRECT_URL`（セッションモード。マイグレーション用）。ブラウザの Realtime 購読用に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ブラウザが DB へ直接アクセスするのは **Realtime の購読だけ**（anon キー。SELECT のみ。anon には INSERT/UPDATE/DELETE を許可しない）。Supabase 管理画面は使わない
- Route Handler と Server Actions の入力は必ず zod で検証する
- Prisma のスキーマファイルは `src/db/prisma/schema.prisma`
- 予定の取得は、表示範囲に重なるものだけを対象とする
- DB の変更はマイグレーションファイルとして追加する。ダッシュボードで直接変更しない
- ログインがないので `@supabase/ssr` は新規コードで使わない（既存の利用箇所は #3 で撤去済み。依存パッケージだけが残っている）
- 【移行中】Prisma に統一する前の経緯で、supabase-js の admin クライアント（`src/utils/supabase/admin.ts`）、`SUPABASE_SECRET_KEY`、ブラウザから予定を読む処理（`fetchEventsInRange`）が残っている。新規コードでは使わない。順に撤去する（#30 → #43 → #44）。`@prisma/client` と CLI のバージョン差で `prisma generate` が失敗する問題も #30 で直す

### 日付・タイムゾーン
- DB の日時は `timestamptz`（UTC で保存）
- 表示・日付の区切りは常に `Asia/Tokyo` 基準。

### ディレクトリ
- `src/lib/calendar/` JST の日付・範囲の計算（純粋関数）
- `src/lib/events/` 予定の型、zod スキーマ、取得関数、Server Actions
- `src/components/calendar/` カレンダーの UI
- 表示状態（view, date）は URL の searchParams に持つ

## コーディング規約
- named export を使い、default export はページ・レイアウトなど Next.js が要求する所だけ
- `any` は使わない
- `src/lib/` の関数には Vitest のテストを書く。テストは仕様の受け入れ条件から先に作る
- 単体テストは `src` ではなく `test/` に置く（`src/` の構造をミラーする。例: `src/lib/foo.ts` → `test/lib/foo.test.ts`）
- 新しい依存パッケージは、追加前に理由とともに確認を取る

## 作業の進め方
- 作業の単位は GitHub Issue。着手前に `gh issue view <番号>` で内容と受け入れ条件を読む
- 1 Issue = 1 ブランチ（`issue-<番号>-<短い説明>`）= 1 PR。Issue の範囲外の変更はしない
- 範囲外で直すべきものを見つけたら、勝手に直さず新しい Issue の作成を提案する
- PR の前に lint・型チェック・テストを通す。PR 本文には `Closes #<番号>`、変更内容、ブラウザでの確認手順を書く
- PR のマージは前に人間にやっていいかを確認する
- Issue を作るときは `.github/ISSUE_TEMPLATE/task.md` の形式に従い、`phase-N` ラベルを付ける。作ったら `docs/PLAN.md` の `#?` を番号に置き換える
- 本番 DB に影響する操作（`prisma migrate deploy`、`supabase db push` など）は実行せず、コマンドを提示するだけにする
