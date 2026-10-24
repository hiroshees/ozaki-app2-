import { formatYmd, toJstYmd } from "@/lib/calendar/jst";
import type { CalendarEvent } from "@/lib/events/schema";

// FullCalendar に渡す予定。画面に必要な項目だけ
export type FullCalendarEvent = {
  id: string;
  title: string;
  // 編集モーダルの初期値に使う
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
};

// DB の予定を FullCalendar の形にする。
// 時刻つき: 瞬間を ISO 8601（UTC）で渡す。FullCalendar が timeZone（Asia/Tokyo）で表示する。
// 終日: JST の日付（YYYY-MM-DD）で渡す。終了は含まない日付（JST 0:00〜翌 0:00 の 1 日なら翌日）。
// UTC の日付で渡すと、JST 0:00 が前日になってしまう
export function toFullCalendarEvent(event: CalendarEvent): FullCalendarEvent {
  const { id, title, description, allDay } = event;

  if (allDay) {
    return {
      id,
      title,
      description,
      allDay,
      start: formatYmd(toJstYmd(event.startAt)),
      end: formatYmd(toJstYmd(event.endAt)),
    };
  }

  return {
    id,
    title,
    description,
    allDay,
    start: event.startAt.toISOString(),
    end: event.endAt.toISOString(),
  };
}
