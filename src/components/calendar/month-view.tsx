"use client";

import { useRouter } from "next/navigation";
import Calendar from "react-calendar";
import { formatYmd, type JstDate } from "@/lib/calendar/jst";
import {
  formatHiddenCount,
  fromLocalDate,
  summarizeDay,
  toLocalDate,
} from "@/lib/calendar/month";
import { buildCalendarHref } from "@/lib/calendar/navigation";
import type { DayEvent } from "@/lib/events/group";
import "./month-view.css";

type MonthViewProps = {
  // 表示する月（この日を含む月）
  date: JstDate;
  // 今日（JST）。react-calendar 標準の「今日」はブラウザのタイムゾーンなので自前で渡す
  today: JstDate;
  // 日付（YYYY-MM-DD）→ その日の予定
  eventsByDay: Record<string, DayEvent[]>;
};

export function MonthView({ date, today, eventsByDay }: MonthViewProps) {
  const router = useRouter();
  const todayKey = formatYmd(today);

  return (
    <div className="month-view px-4">
      <Calendar
        locale="ja-JP"
        // 日曜始まり
        calendarType="gregory"
        view="month"
        minDetail="month"
        maxDetail="month"
        // 月の移動は CalendarNav が URL で行うので、react-calendar 側のナビは使わない
        activeStartDate={toLocalDate({ ...date, day: 1 })}
        showNavigation={false}
        showNeighboringMonth
        value={null}
        formatDay={(_locale, tile) => String(tile.getDate())}
        onClickDay={(tile) =>
          router.push(buildCalendarHref("day", fromLocalDate(tile)))
        }
        tileClassName={({ date: tile, view }) => {
          if (view !== "month") return null;
          const classes = [];
          if (tile.getDay() === 0) classes.push("month-day--sunday");
          if (tile.getDay() === 6) classes.push("month-day--saturday");
          if (formatYmd(fromLocalDate(tile)) === todayKey) {
            classes.push("month-day--today");
          }
          return classes;
        }}
        tileContent={({ date: tile, view }) => {
          if (view !== "month") return null;

          const events = eventsByDay[formatYmd(fromLocalDate(tile))] ?? [];
          if (events.length === 0) return null;

          const { visible, hiddenCount } = summarizeDay(events);
          return (
            // button の中なので、span だけで組む
            <span className="month-events">
              {visible.map((event) => (
                <span
                  key={event.id}
                  className={
                    event.allDay
                      ? "month-event month-event--all-day"
                      : "month-event"
                  }
                >
                  {event.title}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className="month-more">
                  {formatHiddenCount(hiddenCount)}
                </span>
              )}
            </span>
          );
        }}
      />
    </div>
  );
}
