import type { DateRange } from "@/lib/calendar/jst";
import type { CalendarEvent } from "@/lib/events/schema";

// 予定が範囲 [start, end) と重なるか。範囲の外から始まって範囲の中へ続く予定も含む。
// 予定の終了は含まない（22:00〜24:00 の予定は、翌日 0:00 から始まる範囲とは重ならない）。
// 長さ 0 の予定は、その瞬間が範囲内にあるかで判定する
export function overlapsRange(
  event: Pick<CalendarEvent, "startAt" | "endAt">,
  range: DateRange,
): boolean {
  const start = event.startAt.getTime();
  const end = event.endAt.getTime();
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();

  // 範囲の終了より前に始まり、かつ（範囲の中で始まる か 範囲の開始より後に終わる）
  return start < rangeEnd && (start >= rangeStart || end > rangeStart);
}
