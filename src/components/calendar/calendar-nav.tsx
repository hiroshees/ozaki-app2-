import Link from "next/link";
import type { JstDate } from "@/lib/calendar/jst";
import {
  buildCalendarHref,
  CALENDAR_VIEWS,
  formatCalendarTitle,
  shiftCalendarDate,
  VIEW_LABELS,
  type CalendarView,
} from "@/lib/calendar/navigation";

type CalendarNavProps = {
  view: CalendarView;
  date: JstDate;
};

const buttonClass =
  "inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300";

// 前へ / 今日 / 次へ とビュー切替。リンクだけなので Server Component のまま使える
export function CalendarNav({ view, date }: CalendarNavProps) {
  const unit = VIEW_LABELS[view];

  return (
    <nav
      aria-label="カレンダーの操作"
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildCalendarHref(view, shiftCalendarDate(view, date, -1))}
          aria-label={`前の${unit}`}
          className={buttonClass}
        >
          前へ
        </Link>
        {/* date を付けないので、開くたびにその時点の今日（JST）になる */}
        <Link href={buildCalendarHref(view)} className={buttonClass}>
          今日
        </Link>
        <Link
          href={buildCalendarHref(view, shiftCalendarDate(view, date, 1))}
          aria-label={`次の${unit}`}
          className={buttonClass}
        >
          次へ
        </Link>
        <h1 className="ml-2 text-xl font-semibold">
          {formatCalendarTitle(view, date)}
        </h1>
      </div>

      <div role="group" aria-label="表示の切り替え" className="flex gap-1">
        {CALENDAR_VIEWS.map((v) => (
          <Link
            key={v}
            // 切り替えても、表示している日付は維持する
            href={buildCalendarHref(v, date)}
            aria-current={v === view ? "page" : undefined}
            className={
              v === view
                ? "inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
                : buttonClass
            }
          >
            {VIEW_LABELS[v]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
