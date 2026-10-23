-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    -- 終了は開始以降
    CONSTRAINT "events_endAt_gte_startAt" CHECK ("endAt" >= "startAt"),
    -- 入力検証（zod）の最後の砦。title は 1〜100 文字、description は 1000 文字以内
    CONSTRAINT "events_title_length" CHECK (char_length("title") BETWEEN 1 AND 100),
    CONSTRAINT "events_description_length" CHECK ("description" IS NULL OR char_length("description") <= 1000)
);

-- 表示範囲に重なる予定を取得するためのインデックス
CREATE INDEX "events_startAt_endAt_idx" ON "events"("startAt", "endAt");

-- updatedAt を更新時に自動で書き換える（書き込みは supabase-js 経由で Prisma の @updatedAt が効かないため）
CREATE FUNCTION "events_set_updated_at"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "events_set_updated_at"
BEFORE UPDATE ON "events"
FOR EACH ROW EXECUTE FUNCTION "events_set_updated_at"();

-- RLS: ブラウザ（anon / authenticated）は SELECT のみ。書き込みは service role（Server Actions）だけが行う
-- service role は RLS をバイパスするため、書き込み用のポリシーは作らない
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_all" ON "events"
FOR SELECT TO anon, authenticated
USING (true);

-- ポリシーに加えて、テーブル権限でも書き込みを塞ぐ（二重の防御）
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "events" FROM anon, authenticated;

-- Realtime: events の変更をブラウザへ配信する
-- prisma migrate dev のシャドウ DB には publication が無いため、存在するときだけ追加する
-- （Supabase 本体には必ず存在する）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "events";
  END IF;
END
$$;
