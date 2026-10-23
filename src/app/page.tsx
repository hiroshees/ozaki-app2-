import type { Metadata } from "next";
import { APPNAME } from "@/config/data";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { MonthView } from "@/components/calendar/month-view";
import {
  getJstMonthGridRange,
  toJstYmd,
  type JstDate,
} from "@/lib/calendar/jst";
import { resolveCalendarState, VIEW_LABELS } from "@/lib/calendar/navigation";
import { groupEventsByDay, type DayEvent } from "@/lib/events/group";
import { fetchEventsInRange } from "@/lib/events/queries";
import { createAnonClient } from "@/utils/supabase/anon";

export const metadata: Metadata = {
  title: `Home | ${APPNAME}`,
};

type HomeProps = {
  searchParams: Promise<{
    view?: string | string[];
    date?: string | string[];
  }>;
};

// 月ビューに見える範囲（前後の月の日付を含む）の予定を、日ごとに振り分けて取得する。
// 取得に失敗してもカレンダー自体は表示できるよう、エラーは画面に出して空にする
async function loadMonthEvents(date: JstDate) {
  const range = getJstMonthGridRange(date);
  try {
    const events = await fetchEventsInRange(createAnonClient(), range);
    return { eventsByDay: groupEventsByDay(events, range), failed: false };
  } catch (error) {
    console.error(error);
    return { eventsByDay: {} as Record<string, DayEvent[]>, failed: true };
  }
}

export default async function Home({ searchParams }: HomeProps) {
  // 表示状態は URL の searchParams が唯一の情報源。不正な値は月ビュー・今日にそろえる
  const now = new Date();
  const { view, date } = resolveCalendarState(await searchParams, now);
  const month = view === "month" ? await loadMonthEvents(date) : null;

  return (
    <>
      <Header />
      <div className="mt-16 mb-16">
        <CalendarNav view={view} date={date} />
        {month ? (
          <>
            {month.failed && (
              <p role="alert" className="px-4 pb-2 text-sm text-red-600">
                予定を取得できませんでした。時間をおいて再読み込みしてください。
              </p>
            )}
            <MonthView
              date={date}
              today={toJstYmd(now)}
              eventsByDay={month.eventsByDay}
            />
          </>
        ) : (
          <p className="p-8 text-center text-gray-500">
            {VIEW_LABELS[view]}ビューの表示は今後実装します。
          </p>
        )}
      </div>
      <Footer />
    </>
  );
}
