# 仕様書: 共有カレンダー（学習用）

## 目的
FullCalendar（https://fullcalendar.io/）で実現できることをローカル環境で検証する。公開はしない。
（当初は `react-calendar` で検証していたが、月ビューしかないため FullCalendar に転換した。経緯は `docs/PLAN.md`）

## スコープ
### やること
- 月・週・日ビューの表示
- 予定の新規登録・編集・削除
- 日本語表示、`Asia/Tokyo` 基準
- Supabase（PostgreSQL）への保存、Realtime による他タブ反映
- （検証）ドラッグ＆ドロップによる日時変更

### やらないこと
- ユーザー認証・権限管理（全員が同じカレンダーを共有する）
- 本番公開、繰り返し予定、通知、外部カレンダー連携

## 用語
| 用語 | 意味 |
|---|---|
| 予定 (Event) | カレンダーに登録する 1 件のデータ |
| ビュー (view) | `month` / `week` / `day` |
| 基準日 (date) | 表示中のビューが対象とする日（`YYYY-MM-DD`、JST） |

## データモデル
`Event`（テーブル名 `events`）

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK、`gen_random_uuid()` |
| title | text | 必須、1〜100 文字 |
| description | text | 任意、最大 1000 文字 |
| startAt | timestamptz | 必須（UTC で保存） |
| endAt | timestamptz | 必須、`startAt` 以降 |
| allDay | boolean | 既定 `false` |
| createdAt | timestamptz | 既定 `now()` |
| updatedAt | timestamptz | 更新時に自動更新 |

- 終日予定は JST の 00:00 〜 翌 00:00（排他的）で保存する
- 複数日にまたがる予定を許可する

## 画面仕様
### 共通
- URL: `/?view=month&date=2026-10-23`（searchParams が表示状態の唯一の情報源）
- `view` 未指定は `month`、`date` 未指定は今日（JST）
- FullCalendar のツールバーに「前へ / 今日 / 次へ」、見出し、ビュー切替（月 / 週 / 日）を置く
- 週の開始は日曜（FullCalendar の `firstDay: 0`）
- `timeZone: 'Asia/Tokyo'`、日本語ロケール

### 月ビュー
- FullCalendar の `dayGridMonth`。日付セルに予定タイトルを最大 3 件表示し、超過分は「+N 件」
- 日付クリックで日ビューへ遷移

### 週ビュー
- FullCalendar の `timeGridWeek`（7 日 × 時間軸）
- 重なる予定は横に並べて表示する（FullCalendar の標準のレイアウト）

### 日ビュー
- FullCalendar の `timeGridDay`（1 日の時間軸）。終日予定は上部の終日枠に表示

### 予定の登録・編集・削除
- 空きセルのクリックで新規作成モーダル、予定のクリックで編集モーダル
- 削除は確認ダイアログを挟む
- 入力は zod で検証し、エラーは項目ごとに日本語で表示する

### ドラッグ＆ドロップ（検証）
- FullCalendar の `interaction` プラグイン（`editable` / `eventDrop`）で、予定を別の日時へドラッグして `startAt` / `endAt` を移動する（長さは維持）
- 失敗した場合は元の位置に戻し、エラーを表示する

## 非機能要件
- 書き込みはすべて Server Actions 経由（`SUPABASE_SECRET_KEY` を使用）
- ブラウザからは SELECT と Realtime 購読のみ（anon に書き込み権限を与えない）
- 予定の取得は**表示範囲（ビューの開始〜終了）に重なるものだけ**を対象とする
- DB 変更は Prisma マイグレーションで管理する

## 受け入れ条件（機能単位）
1. `?view=week&date=2026-10-23` を開くと、10/18（日）〜10/24（土）の週が日本語で表示される
2. JST 23:30 に登録した予定が、DB では UTC 14:30 で保存され、画面では 23:30 と表示される
3. 月をまたぐ予定が、両方の月ビューに表示される
4. 予定を作成・編集・削除すると、再読み込みなしで別タブにも反映される
5. `endAt < startAt` の登録はエラーになり、DB は変更されない
6. ブラウザの anon キーでは INSERT / UPDATE / DELETE が拒否される

## 未決事項
- 予定の取得を、ブラウザから anon クライアントで読むか、Route Handler 経由にするか（#39 で決める）
- 表示範囲取得のとき、前後を先読みするか（体感速度の検証）
- 週・日ビューの時間軸の刻み（30 分 / 15 分）と表示する時間帯（#40 で決める）
