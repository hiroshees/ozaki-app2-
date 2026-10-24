import { describe, expect, it } from "vitest";
import { parseJstDateTime } from "@/lib/calendar/jst";
import {
  defaultFormValues,
  nextDay,
  toEventInput,
  type EventFormValues,
} from "@/lib/events/form";
import { EventInputSchema } from "@/lib/events/schema";

function values(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return {
    title: "会議",
    description: "",
    allDay: false,
    start: "2026-10-23T23:30",
    end: "2026-10-24T00:30",
    ...overrides,
  };
}

describe("nextDay", () => {
  it("翌日の日付を返す（月末・年末・うるう日）", () => {
    expect(nextDay("2026-10-23")).toBe("2026-10-24");
    expect(nextDay("2026-10-31")).toBe("2026-11-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2024-02-28")).toBe("2024-02-29");
    expect(nextDay("2024-02-29")).toBe("2024-03-01");
  });

  it("不正な日付は空文字にする", () => {
    expect(nextDay("")).toBe("");
    expect(nextDay("2026-02-30")).toBe("");
    expect(nextDay("abc")).toBe("");
  });
});

describe("defaultFormValues（クリックした日時から初期値を作る）", () => {
  it("時刻つきのクリックは、その時刻から 1 時間の予定にする（JST）", () => {
    expect(defaultFormValues(new Date("2026-10-23T05:30:00Z"), false)).toEqual({
      title: "",
      description: "",
      allDay: false,
      start: "2026-10-23T14:30",
      end: "2026-10-23T15:30",
    });
  });

  it("1 時間後が翌日になっても日付が正しい", () => {
    const result = defaultFormValues(new Date("2026-10-23T14:30:00Z"), false);
    expect(result.start).toBe("2026-10-23T23:30");
    expect(result.end).toBe("2026-10-24T00:30");
  });

  it("日付だけのクリック（月ビュー・終日枠）は、その日の 9:00〜10:00 にする", () => {
    // 月ビューは JST 0:00 の瞬間が渡される
    const result = defaultFormValues(new Date("2026-10-22T15:00:00Z"), true);
    expect(result.start).toBe("2026-10-23T09:00");
    expect(result.end).toBe("2026-10-23T10:00");
    expect(result.allDay).toBe(false);
  });
});

describe("toEventInput（フォームの値を保存用の入力にする）", () => {
  it("時刻つきの予定は、入力した日時をそのまま使う", () => {
    expect(toEventInput(values())).toEqual({
      title: "会議",
      description: "",
      allDay: false,
      startAt: "2026-10-23T23:30",
      endAt: "2026-10-24T00:30",
    });
  });

  it("終日の予定は、開始日の 0:00 〜 終了日の翌日 0:00 にする（終了日を含む）", () => {
    const input = toEventInput(
      values({
        allDay: true,
        start: "2026-10-23T09:00",
        end: "2026-10-25T10:00",
      }),
    );
    expect(input.startAt).toBe("2026-10-23T00:00");
    expect(input.endAt).toBe("2026-10-26T00:00");
    // 終日の検証（0:00 区切り・1 日以上）を通る
    expect(EventInputSchema.safeParse(input).success).toBe(true);
  });

  it("終日で 1 日だけの予定は、翌日 0:00 まで（JST 0:00〜翌 0:00）", () => {
    const input = toEventInput(
      values({
        allDay: true,
        start: "2026-10-23T09:00",
        end: "2026-10-23T10:00",
      }),
    );
    const parsed = EventInputSchema.parse(input);
    expect(parsed.startAt).toEqual(parseJstDateTime("2026-10-23T00:00"));
    expect(parsed.endAt).toEqual(parseJstDateTime("2026-10-24T00:00"));
  });

  it("終日で日付が空なら空文字のままにする（サーバーが入力不足のエラーにする）", () => {
    const input = toEventInput(values({ allDay: true, start: "", end: "" }));
    expect(input.startAt).toBe("");
    expect(input.endAt).toBe("");
  });
});
