"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import jaLocale from "@fullcalendar/react/locales/ja";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatYmd, type DateRange, type JstDate } from "@/lib/calendar/jst";
import { pickUrlDate, toCalendarView } from "@/lib/calendar/fullcalendar";
import { buildCalendarHref } from "@/lib/calendar/navigation";
import { toFullCalendarEvent } from "@/lib/events/fullcalendar";
import { fetchEventsInRange } from "@/lib/events/queries";
import type { CalendarEvent } from "@/lib/events/schema";
import { getAnonClient } from "@/utils/supabase/anon";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

type EventCalendarProps = {
  // 最初に表示する日（この日を含む月を表示する）
  date: JstDate;
  // 表示範囲の予定を取得する。省略するとブラウザから Supabase（anon）で読む
  loadEvents?: (range: DateRange) => Promise<CalendarEvent[]>;
};

// 配列やオブジェクトをコンポーネントの中で書くと、再描画のたびに「変更された」と扱われるので外に置く
const PLUGINS = [dayGridPlugin, classicThemePlugin];
const HEADER_TOOLBAR = { left: "prev,next today", center: "title", right: "" };

// 1 日のセルに出す予定の最大件数。超過分は「+N 件」にまとめる
const MAX_EVENTS_PER_DAY = 3;

function loadFromSupabase(range: DateRange) {
  return fetchEventsInRange(getAnonClient(), range);
}

export function EventCalendar({
  date,
  loadEvents = loadFromSupabase,
}: EventCalendarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  // URL に書いている date。範囲の中を動いている間は維持し、範囲の外へ移動したら更新する
  const urlDate = useRef(date);

  // FullCalendar は描画の途中で予定の取得を始めるため、結果が返る時点でまだマウントされて
  // いないことがある。マウント前の setState はエラーになるので、ref に溜めてマウント後に反映する
  const mounted = useRef(false);
  const failed = useRef(false);
  useEffect(() => {
    mounted.current = true;
    setLoadFailed(failed.current);
    return () => {
      mounted.current = false;
    };
  }, []);
  const reportLoadResult = useCallback((isFailed: boolean) => {
    failed.current = isFailed;
    if (mounted.current) setLoadFailed(isFailed);
  }, []);

  // 表示範囲が変わるたびに FullCalendar が呼ぶ。失敗は例外のまま投げ、eventSourceFailure で扱う
  const fetchEvents = useCallback(
    async (info: { start: Date; end: Date }) => {
      const events = await loadEvents({ start: info.start, end: info.end });
      return events.map(toFullCalendarEvent);
    },
    [loadEvents],
  );
  const onEventsLoaded = useCallback(
    () => reportLoadResult(false),
    [reportLoadResult],
  );
  const onEventsFailed = useCallback(
    (error: unknown) => {
      console.error(error);
      reportLoadResult(true);
    },
    [reportLoadResult],
  );

  // 表示中のビューと日付を URL に反映する。reload や共有でも同じ表示になる。
  // history を直接書き換えるので、サーバーでのページの再描画は起きない
  const syncUrl = useCallback(
    (info: {
      view: { type: string; currentStart: Date; currentEnd: Date };
    }) => {
      const view = toCalendarView(info.view.type);
      if (!view) return;

      urlDate.current = pickUrlDate(
        urlDate.current,
        info.view.currentStart,
        info.view.currentEnd,
      );
      window.history.replaceState(
        null,
        "",
        buildCalendarHref(view, urlDate.current),
      );
    },
    [],
  );

  return (
    <div className="px-4">
      {loadFailed && (
        <p role="alert" className="pb-2 text-sm text-red-600">
          予定を取得できませんでした。時間をおいて再読み込みしてください。
        </p>
      )}
      <FullCalendar
        plugins={PLUGINS}
        locale={jaLocale}
        // DB は UTC で持ち、表示と日付の区切りは常に JST
        timeZone="Asia/Tokyo"
        // 日曜始まり
        firstDay={0}
        initialView="dayGridMonth"
        initialDate={formatYmd(date)}
        headerToolbar={HEADER_TOOLBAR}
        height="auto"
        dayMaxEvents={MAX_EVENTS_PER_DAY}
        moreLinkContent={({ num }) => `+${num} 件`}
        events={fetchEvents}
        eventSourceSuccess={onEventsLoaded}
        eventSourceFailure={onEventsFailed}
        datesSet={syncUrl}
      />
    </div>
  );
}
