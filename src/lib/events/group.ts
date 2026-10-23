import {
  addDays,
  formatYmd,
  getJstDayRange,
  toJstYmd,
  type DateRange,
} from "@/lib/calendar/jst";
import { overlapsRange } from "@/lib/events/queries";
import type { CalendarEvent } from "@/lib/events/schema";

// 日付セルに出す予定。画面に必要な項目だけ（Server から Client に渡せる値のみ）
export type DayEvent = {
  id: string;
  title: string;
  allDay: boolean;
};

// 終日 → 開始が早い順 → 終了が早い順。同じなら入力順（sort は安定）
function compareForDay(a: CalendarEvent, b: CalendarEvent) {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (
    a.startAt.getTime() - b.startAt.getTime() ||
    a.endAt.getTime() - b.endAt.getTime()
  );
}

// 範囲の各日（JST）について、その日と重なる予定を振り分ける。
// 複数日・月またぎの予定は、かかる日すべてに入る。予定のない日は空配列
export function groupEventsByDay(
  events: CalendarEvent[],
  range: DateRange,
): Record<string, DayEvent[]> {
  const sorted = [...events].sort(compareForDay);
  const grouped: Record<string, DayEvent[]> = {};

  // range.start は JST の 0:00 なので、その日から 1 日ずつ進める
  for (
    let day = toJstYmd(range.start);
    getJstDayRange(day).start.getTime() < range.end.getTime();
    day = addDays(day, 1)
  ) {
    const dayRange = getJstDayRange(day);
    grouped[formatYmd(day)] = sorted
      .filter((event) => overlapsRange(event, dayRange))
      .map(({ id, title, allDay }) => ({ id, title, allDay }));
  }

  return grouped;
}
