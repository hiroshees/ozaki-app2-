import { describe, expect, it } from "vitest";
import { CalendarEventSchema, EventInputSchema } from "@/lib/events/schema";

// 正常な入力（日時は JST の datetime-local 形式）
const valid = {
  title: "打ち合わせ",
  description: "会議室 A",
  startAt: "2026-10-23T10:00",
  endAt: "2026-10-23T11:00",
  allDay: false,
};

// 失敗したときのメッセージを「項目 → メッセージ」で取り出す
function errorsOf(input: unknown) {
  const result = EventInputSchema.safeParse(input);
  if (result.success) return null;
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("EventInputSchema: 正常系", () => {
  it("JST の日時を UTC の Date に変換する", () => {
    const parsed = EventInputSchema.parse({
      ...valid,
      startAt: "2026-10-23T23:30",
      endAt: "2026-10-24T00:30",
    });

    // JST 23:30 は UTC 14:30
    expect(parsed.startAt.toISOString()).toBe("2026-10-23T14:30:00.000Z");
    expect(parsed.endAt.toISOString()).toBe("2026-10-23T15:30:00.000Z");
    expect(parsed.title).toBe("打ち合わせ");
    expect(parsed.allDay).toBe(false);
  });

  it("endAt が startAt と同じ時刻でも許可される（DB の CHECK と同じ）", () => {
    const parsed = EventInputSchema.parse({ ...valid, endAt: valid.startAt });
    expect(parsed.endAt.getTime()).toBe(parsed.startAt.getTime());
  });

  it("allDay を省略すると false になる", () => {
    const { allDay: _omit, ...rest } = valid;
    expect(EventInputSchema.parse(rest).allDay).toBe(false);
  });

  it("日をまたぐ予定・月をまたぐ予定を許可する", () => {
    const parsed = EventInputSchema.parse({
      ...valid,
      startAt: "2026-10-31T23:00",
      endAt: "2026-11-01T01:00",
    });
    expect(parsed.endAt.getTime()).toBeGreaterThan(parsed.startAt.getTime());
  });
});

describe("EventInputSchema: title（1〜100 文字）", () => {
  it("1 文字と 100 文字は許可される", () => {
    expect(EventInputSchema.safeParse({ ...valid, title: "a" }).success).toBe(
      true,
    );
    expect(
      EventInputSchema.safeParse({ ...valid, title: "あ".repeat(100) }).success,
    ).toBe(true);
  });

  it("空文字・空白のみ・未指定はエラー", () => {
    expect(errorsOf({ ...valid, title: "" })).toEqual({
      title: "タイトルを入力してください",
    });
    expect(errorsOf({ ...valid, title: "   " })).toEqual({
      title: "タイトルを入力してください",
    });
    const { title: _omit, ...rest } = valid;
    expect(errorsOf(rest)).toEqual({ title: "タイトルを入力してください" });
  });

  it("101 文字はエラー", () => {
    expect(errorsOf({ ...valid, title: "あ".repeat(101) })).toEqual({
      title: "タイトルは100文字以内で入力してください",
    });
  });

  it("前後の空白は取り除く", () => {
    expect(EventInputSchema.parse({ ...valid, title: "  会議  " }).title).toBe(
      "会議",
    );
  });
});

describe("EventInputSchema: description（1000 文字以内、任意）", () => {
  it("1000 文字は許可、1001 文字はエラー", () => {
    expect(
      EventInputSchema.safeParse({ ...valid, description: "a".repeat(1000) })
        .success,
    ).toBe(true);
    expect(errorsOf({ ...valid, description: "a".repeat(1001) })).toEqual({
      description: "説明は1000文字以内で入力してください",
    });
  });

  it("未指定・null・空文字・空白のみは null にする", () => {
    const { description: _omit, ...rest } = valid;
    expect(EventInputSchema.parse(rest).description).toBeNull();
    expect(
      EventInputSchema.parse({ ...valid, description: null }).description,
    ).toBeNull();
    expect(
      EventInputSchema.parse({ ...valid, description: "" }).description,
    ).toBeNull();
    expect(
      EventInputSchema.parse({ ...valid, description: "  " }).description,
    ).toBeNull();
  });
});

describe("EventInputSchema: 日時", () => {
  it("endAt が startAt より前ならエラー（endAt の項目に出る）", () => {
    expect(
      errorsOf({
        ...valid,
        startAt: "2026-10-23T11:00",
        endAt: "2026-10-23T10:59",
      }),
    ).toEqual({ endAt: "終了日時は開始日時以降にしてください" });
  });

  it("JST で日をまたぐ逆転も検出する（UTC では同じ日でも JST では前後が違う）", () => {
    // JST 0:30 → 前日 23:30 の順は逆転
    expect(
      errorsOf({
        ...valid,
        startAt: "2026-10-24T00:30",
        endAt: "2026-10-23T23:30",
      }),
    ).toEqual({ endAt: "終了日時は開始日時以降にしてください" });
  });

  it("形式が違う・存在しない日時はエラー", () => {
    expect(errorsOf({ ...valid, startAt: "2026-10-23" })).toEqual({
      startAt: "開始日時の形式が正しくありません",
    });
    expect(errorsOf({ ...valid, endAt: "2026-02-30T10:00" })).toEqual({
      endAt: "終了日時の形式が正しくありません",
    });
    expect(errorsOf({ ...valid, startAt: "2026-10-23T10:00:00Z" })).toEqual({
      startAt: "開始日時の形式が正しくありません",
    });
  });

  it("未指定はエラー", () => {
    const { startAt: _s, endAt: _e, ...rest } = valid;
    expect(errorsOf(rest)).toEqual({
      startAt: "開始日時を入力してください",
      endAt: "終了日時を入力してください",
    });
  });

  it("空文字は「入力してください」になる（形式エラーとは区別する）", () => {
    expect(errorsOf({ ...valid, startAt: "", endAt: "" })).toEqual({
      startAt: "開始日時を入力してください",
      endAt: "終了日時を入力してください",
    });
  });

  it("片方の形式が不正でも例外にならず、項目ごとのエラーを返す", () => {
    expect(
      errorsOf({ ...valid, startAt: "bad", endAt: "2026-10-23T10:00" }),
    ).toEqual({ startAt: "開始日時の形式が正しくありません" });
    expect(errorsOf({ ...valid, startAt: "bad", endAt: "bad" })).toEqual({
      startAt: "開始日時の形式が正しくありません",
      endAt: "終了日時の形式が正しくありません",
    });
  });
});

describe("EventInputSchema: 終日（JST 0:00 〜 翌 0:00）", () => {
  const allDay = {
    ...valid,
    allDay: true,
    startAt: "2026-10-23T00:00",
    endAt: "2026-10-24T00:00",
  };

  it("JST 0:00 区切りなら許可される", () => {
    const parsed = EventInputSchema.parse(allDay);
    expect(parsed.allDay).toBe(true);
    expect(parsed.startAt.toISOString()).toBe("2026-10-22T15:00:00.000Z");
    expect(parsed.endAt.toISOString()).toBe("2026-10-23T15:00:00.000Z");
  });

  it("複数日の終日も許可される", () => {
    expect(
      EventInputSchema.safeParse({ ...allDay, endAt: "2026-10-26T00:00" })
        .success,
    ).toBe(true);
  });

  it("0:00 でない時刻はエラー", () => {
    expect(errorsOf({ ...allDay, startAt: "2026-10-23T09:00" })).toEqual({
      startAt: "終日の予定は 0:00 を指定してください",
    });
    expect(errorsOf({ ...allDay, endAt: "2026-10-24T09:00" })).toEqual({
      endAt: "終日の予定は 0:00 を指定してください",
    });
  });

  it("期間が 0（開始と終了が同じ）だとエラー", () => {
    expect(errorsOf({ ...allDay, endAt: allDay.startAt })).toEqual({
      endAt: "終日の予定は 1 日以上の期間にしてください",
    });
  });

  it("allDay=false なら 0:00 でなくてもよい", () => {
    expect(
      EventInputSchema.safeParse({ ...allDay, allDay: false }).success,
    ).toBe(true);
  });
});

describe("CalendarEventSchema（DB の 1 行）", () => {
  const row = {
    id: "3f0c6a64-6f2b-4a54-9d3a-2b8d8f6a1c10",
    title: "打ち合わせ",
    description: null,
    startAt: "2026-10-23T14:30:00+00:00",
    endAt: "2026-10-23T15:30:00.123456+00:00",
    allDay: false,
    createdAt: "2026-10-23T08:06:20.978394+00:00",
    updatedAt: "2026-10-23T08:06:20.978394+00:00",
  };

  it("Supabase が返す timestamptz 文字列を Date にする", () => {
    const parsed = CalendarEventSchema.parse(row);
    expect(parsed.startAt).toBeInstanceOf(Date);
    expect(parsed.startAt.toISOString()).toBe("2026-10-23T14:30:00.000Z");
    expect(parsed.endAt.toISOString()).toBe("2026-10-23T15:30:00.123Z");
    expect(parsed.description).toBeNull();
  });

  it("Z 表記も読める", () => {
    expect(
      CalendarEventSchema.parse({
        ...row,
        startAt: "2026-10-23T14:30:00Z",
      }).startAt.toISOString(),
    ).toBe("2026-10-23T14:30:00.000Z");
  });

  it("日時でない値・uuid でない id は拒否する", () => {
    expect(
      CalendarEventSchema.safeParse({ ...row, startAt: "not-a-date" }).success,
    ).toBe(false);
    expect(
      CalendarEventSchema.safeParse({ ...row, startAt: null }).success,
    ).toBe(false);
    expect(CalendarEventSchema.safeParse({ ...row, id: "1" }).success).toBe(
      false,
    );
  });
});
