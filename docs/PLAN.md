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
- [x] #9 予定の型・zod スキーマ・範囲取得関数を実装する（`src/lib/events/`）
- [x] #10 searchParams（view, date）の解釈とヘッダーナビを実装する（FullCalendar への転換で #39 が置き換える）
- [x] #11 月ビューを実装する（`react-calendar`。FullCalendar への転換で #39 が置き換える）
- ~~#12 予定の重なりレイアウト計算を実装する~~ **実施せずに終了**（FullCalendar が標準で行う）
- ~~#13 週ビュー・日ビューを実装する~~ **実施せずに終了**（react-calendar に無い。FullCalendar が提供する）
- [x] #39 FullCalendar を導入し、月ビューを置き換える（`@fullcalendar/react` v7 と `temporal-polyfill`。承認済み）
- [ ] #40 FullCalendar で週ビュー・日ビューを追加する

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
          └─ CI 統一 / Vitest ─ 日付ユーティリティ ─ FullCalendar 導入(#39) ─ 週・日ビュー(#40) ─ Phase 3 ─ Phase 4
```

## 方針転換: react-calendar → FullCalendar（2026-10-23）
#11 で react-calendar の月ビューを実装し、ナビゲーションを検証した結果、方針を FullCalendar（https://fullcalendar.io/、v7）へ転換した。

### 理由
- react-calendar のビューは **月・年・十年・世紀の 4 つだけ**で、**週ビュー・日ビューがない**（型定義・実装・README で確認。`view="week"` を渡しても月ビューにフォールバックする）
- 標準のナビは月・年の移動のみで、「今日」ボタンもビュー切替もない。表示状態を URL に持つ方針とも合わず、自作のナビ（`CalendarNav`）が必要だった
- 重なる予定のレイアウト計算、ドラッグ＆ドロップなど、カレンダーアプリに必要な機能がほぼ自前になる
- FullCalendar は月・週・日ビュー、ツールバー、日本語、重なりのレイアウト、「+N more」、ドラッグ＆ドロップ、範囲選択を標準で持つ。v7 は名前付きタイムゾーン（`Asia/Tokyo`）をプラグインなしで指定できる

### 使うもの（すべて標準の MIT ライセンス。Premium は使わない）
`@fullcalendar/react` v7 のサブパス: `daygrid`（月）、`timegrid`（週・日）、`interaction`（ドラッグ＆ドロップ・クリック）、`locales/ja`。peer 依存の `temporal-polyfill` が必要

### 引き続き使うもの
DB・マイグレーション、`jst.ts`（JST の日付計算）、`schema.ts`（入力検証）、`queries.ts`（範囲取得・重なり判定）、anon / admin クライアント

### FullCalendar 導入（#39）で撤去したもの
- 依存: `react-calendar`
- UI: `month-view.tsx` / `month-view.css`、`calendar-nav.tsx`
- `lib/calendar/month.ts`（「+N 件」の計算、react-calendar の日付変換）、`lib/events/group.ts`（日ごとの予定の振り分け）
- `navigation.ts` の `VIEW_LABELS` / `shiftCalendarDate` / `formatCalendarTitle`（FullCalendar のツールバーが担う）
- `jst.ts` の `getJstMonthGridRange` / `getJstWeekRange` / `getJstMonthRange` / `addDays` / `addMonths` / `getWeekday`（FullCalendar が表示範囲を決める）
- それぞれのテスト

残したもの: `parseYmd` / `formatYmd` / `toJstYmd` / `parseJstDateTime` / `getJstDayRange`（使用中）、`overlapsRange`（#17 の Realtime で、範囲外の変更を無視するために使う予定）

### 注意（#39 で確認した内容）
- v7 は 2026-06 公開の新しい版で、パッチが頻繁に出ている
- `timeZone: 'Asia/Tokyo'` を指定すると、FullCalendar が返す `Date`（表示範囲、`datesSet` など）は**本当の瞬間**。JST の年月日への変換は `jst.ts` の `toJstYmd` で行う（実ブラウザで確認済み）
- v7 は CSS のクラス名が難読化されている。ブラウザでの動作確認（自動操作）では、`aria-label`（「前」「次」「今日」）や `role="heading"` を使う
- 予定の取得結果が**描画の完了より先に返る**と、FullCalendar 内部が「マウント前の状態更新」の警告を出す（実際のネットワーク取得では起きない）
- 予定はブラウザから anon クライアントで直接読む（RLS で SELECT のみ許可）。クライアントは `getAnonClient()` で使い回す（作るたびに GoTrueClient の警告が出るため）
- 予定の表示範囲は URL の searchParams と `history.replaceState` で同期する（サーバーの再描画は起きない）

## 方針メモ
- 新規依存は追加前に確認する（Vitest、`react-calendar`、`server-only`、FullCalendar など）
- 本番 DB に影響するコマンド（`prisma migrate deploy` など）は提示のみで実行しない
  - `vercel-build` から `prisma generate` と `prisma migrate deploy` を外し、`next build` のみにした。マイグレーションは手動で提示されたコマンドを実行する。`prisma generate` は、実行時に Prisma Client を使わない方針のため戻していない（モデル 0 件だと `zod-prisma-types` が失敗していたが、#6 でモデルが入り zod の生成自体は動く。Prisma Client の生成は `@prisma/client`(6.3.1) と CLI(6.19.3) のバージョン差で失敗する）
- CI は yarn で `install --frozen-lockfile` / lint / prettier:check / typecheck / build を実行する。`yarn test:coverage` もここで実行する（カバレッジは出力のみで、最低ラインでの失敗判定はしない）
- Issue 作成時は `phase-N` ラベルを付ける
