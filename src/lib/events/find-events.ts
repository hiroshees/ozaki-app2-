import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { DateRange } from "@/lib/calendar/jst";
import type { CalendarEvent } from "@/lib/events/schema";

// 1 回で取得できる範囲の上限。月ビューの表示範囲（最大 6 週間 = 42 日）に余裕を持たせる
export const MAX_RANGE_DAYS = 100;
const MAX_RANGE_MS = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;

const isoDateTime = (label: string) =>
  z
    .string({
      required_error: `${label}を指定してください`,
      invalid_type_error: `${label}の形式が正しくありません`,
    })
    .datetime({
      offset: true,
      message: `${label}は ISO 8601 の日時で指定してください`,
    })
    .transform((value) => new Date(value));

// GET /api/events のクエリ。範囲は [start, end)
export const EventsQuerySchema = z
  .object({
    start: isoDateTime("start"),
    end: isoDateTime("end"),
  })
  .superRefine(({ start, end }, ctx) => {
    // 日時の変換に失敗した項目は個別にエラーが出ているので、ここでは見ない
    if (!(start instanceof Date) || !(end instanceof Date)) return;

    if (start.getTime() >= end.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end"],
        message: "end は start より後にしてください",
      });
      return;
    }
    if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end"],
        message: `範囲は ${MAX_RANGE_DAYS} 日以内にしてください`,
      });
    }
  });

// overlapsRange と同じ条件: 範囲の終了より前に始まり、
// かつ（範囲の中で始まる か 範囲の開始より後に終わる）
export function buildOverlapWhere(range: DateRange): Prisma.EventWhereInput {
  return {
    startAt: { lt: range.end },
    OR: [{ endAt: { gt: range.start } }, { startAt: { gte: range.start } }],
  };
}

// findMany だけを要求する。テストでは Prisma のかわりに差し替える
export type EventReader = {
  event: {
    findMany(args: Prisma.EventFindManyArgs): Promise<CalendarEvent[]>;
  };
};

export function findEventsInRange(
  db: EventReader,
  range: DateRange,
): Promise<CalendarEvent[]> {
  return db.event.findMany({
    where: buildOverlapWhere(range),
    // 同じ開始時刻でも並びが安定するよう endAt、id まで指定する
    orderBy: [{ startAt: "asc" }, { endAt: "asc" }, { id: "asc" }],
  });
}
