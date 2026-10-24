import type { DateRange } from "@/lib/calendar/jst";
import type { FullCalendarEvent } from "@/lib/events/fullcalendar";

// ブラウザから Route Handler（GET /api/events）で表示範囲の予定を取得する。
// 失敗は例外にして、呼び出し側（FullCalendar の eventSourceFailure）で扱う
export async function fetchEventsFromApi(
  range: DateRange,
  fetchFn: typeof fetch = fetch,
): Promise<FullCalendarEvent[]> {
  const params = new URLSearchParams({
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  const response = await fetchFn(`/api/events?${params}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`予定の取得に失敗しました（HTTP ${response.status}）`);
  }
  return (await response.json()) as FullCalendarEvent[];
}
