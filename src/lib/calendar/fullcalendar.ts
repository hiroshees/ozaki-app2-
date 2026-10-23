import { formatYmd, toJstYmd, type JstDate } from "@/lib/calendar/jst";
import { CALENDAR_VIEWS, type CalendarView } from "@/lib/calendar/navigation";

// FullCalendar と URL（view, date）をつなぐ純粋関数

// URL の view → FullCalendar のビュー名
export const FULLCALENDAR_VIEW_NAMES: Record<CalendarView, string> = {
  month: "dayGridMonth",
  week: "timeGridWeek",
  day: "timeGridDay",
};

// FullCalendar のビュー名 → URL の view。対応しないものは null
export function toCalendarView(name: string): CalendarView | null {
  return (
    CALENDAR_VIEWS.find((view) => FULLCALENDAR_VIEW_NAMES[view] === name) ??
    null
  );
}

// URL に書く date を決める。今の date が表示中の範囲 [rangeStart, rangeEnd) に入っていれば維持し
// （月→週に切り替えても、見ていた日を保てる）、外へ移動したなら範囲の最初の日（JST）にする。
// FullCalendar が返す Date は瞬間なので、JST の日付に直して比べる
export function pickUrlDate(
  current: JstDate,
  rangeStart: Date,
  rangeEnd: Date,
): JstDate {
  const start = toJstYmd(rangeStart);
  const end = toJstYmd(rangeEnd);
  const key = formatYmd(current);

  // YYYY-MM-DD はゼロ埋めなので、文字列の比較が日付の順になる
  return key >= formatYmd(start) && key < formatYmd(end) ? current : start;
}
