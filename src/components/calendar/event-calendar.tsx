"use client";

import FullCalendar, { type CalendarRef } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import jaLocale from "@fullcalendar/react/locales/ja";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatYmd, type DateRange, type JstDate } from "@/lib/calendar/jst";
import {
  FULLCALENDAR_VIEW_NAMES,
  pickUrlDate,
  toCalendarView,
} from "@/lib/calendar/fullcalendar";
import {
  buildCalendarHref,
  type CalendarView,
} from "@/lib/calendar/navigation";
import { DeleteConfirmDialog } from "@/components/calendar/delete-confirm-dialog";
import { EventFormModal } from "@/components/calendar/event-form-modal";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/lib/events/actions";
import {
  defaultFormValues,
  eventToFormValues,
  type EventFormValues,
} from "@/lib/events/form";
import { fetchEventsFromApi } from "@/lib/events/client";
import type { FullCalendarEvent } from "@/lib/events/fullcalendar";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

type EventCalendarProps = {
  // 最初に表示するビュー
  view: CalendarView;
  // 最初に表示する日（この日を含む月・週・日を表示する）
  date: JstDate;
  // 表示範囲の予定を取得する。省略すると Route Handler（GET /api/events）から取得する
  loadEvents?: (range: DateRange) => Promise<FullCalendarEvent[]>;
};

// 配列やオブジェクトをコンポーネントの中で書くと、再描画のたびに「変更された」と扱われるので外に置く
const PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  classicThemePlugin,
];
const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "dayGridMonth,timeGridWeek,timeGridDay",
};

// カレンダーの高さ（px）。週・日ビューの時間軸は、この中でスクロールする
const CALENDAR_HEIGHT = 500;

// 1 日のセルに出す予定の最大件数。超過分は「+N 件」にまとめる
const MAX_EVENTS_PER_DAY = 3;

export function EventCalendar({
  view,
  date,
  loadEvents = fetchEventsFromApi,
}: EventCalendarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  // 開いているモーダル。null のときは閉じている。編集のときは対象の予定の id を持つ
  const [modal, setModal] = useState<{
    id: string | null;
    values: EventFormValues;
  } | null>(null);
  // 削除の確認ダイアログを出しているか（編集モーダルの上に重ねる）
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const calendarRef = useRef<CalendarRef>(null);
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
      // サーバーでの事前描画（SSR）でも呼ばれるが、相対 URL の fetch はサーバーでは失敗する。
      // 予定はブラウザで取得するので、サーバーでは空にする
      if (typeof window === "undefined") return [];
      return loadEvents({ start: info.start, end: info.end });
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

  // 空きセル（日付・時間枠）のクリックで作成モーダルを開く
  const openCreateModal = useCallback(
    (info: { date: Date; allDay: boolean }) =>
      setModal({ id: null, values: defaultFormValues(info.date, info.allDay) }),
    [],
  );
  // 予定のクリックで、既存の値が入った編集モーダルを開く
  const openEditModal = useCallback(
    (info: {
      event: {
        id: string;
        title: string;
        allDay: boolean;
        start: Date | null;
        end: Date | null;
        extendedProps: Record<string, unknown>;
      };
    }) => {
      const { event } = info;
      if (!event.start) return;
      const description = event.extendedProps.description;
      setModal({
        id: event.id,
        values: eventToFormValues({
          title: event.title,
          description: typeof description === "string" ? description : null,
          allDay: event.allDay,
          start: event.start,
          end: event.end,
        }),
      });
    },
    [],
  );
  const closeModal = useCallback(() => {
    setModal(null);
    setConfirmingDelete(false);
  }, []);
  const openDeleteConfirm = useCallback(() => setConfirmingDelete(true), []);
  const closeDeleteConfirm = useCallback(() => setConfirmingDelete(false), []);
  // 保存・削除できたら閉じて、表示範囲の予定を取得し直す
  const handleSaved = useCallback(() => {
    setModal(null);
    setConfirmingDelete(false);
    calendarRef.current?.getApi().refetchEvents();
  }, []);

  return (
    // 高さを固定すると横長になるので、12 列のグリッドの中央に置き、両脇に空きを作る
    <div className="grid grid-cols-12 px-4">
      <div className="col-span-12 md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3">
        {loadFailed && (
          <p role="alert" className="pb-2 text-sm text-red-600">
            予定を取得できませんでした。時間をおいて再読み込みしてください。
          </p>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={PLUGINS}
          locale={jaLocale}
          // DB は UTC で持ち、表示と日付の区切りは常に JST
          timeZone="Asia/Tokyo"
          // 日曜始まり
          firstDay={0}
          initialView={FULLCALENDAR_VIEW_NAMES[view]}
          initialDate={formatYmd(date)}
          headerToolbar={HEADER_TOOLBAR}
          height={CALENDAR_HEIGHT}
          dayMaxEvents={MAX_EVENTS_PER_DAY}
          // 時間軸は 30 分刻みで、0:00〜24:00 をすべて表示する（23:30 の予定も見える）。
          // 高さが固定なので、週・日ビューの 24 時間分は中でスクロールする。開いたときは 8:00 付近を見せる
          scrollTime="08:00:00"
          slotDuration="00:30:00"
          // 日付（見出し）のクリックで、その日の日ビューへ移動する
          navLinks
          moreLinkContent={({ num }) => `+${num} 件`}
          events={fetchEvents}
          eventSourceSuccess={onEventsLoaded}
          eventSourceFailure={onEventsFailed}
          datesSet={syncUrl}
          dateClick={openCreateModal}
          eventClick={openEditModal}
        />
        {modal && (
          <EventFormModal
            // 別の予定・作成に切り替わったとき、入力中の値を持ち越さない
            key={modal.id ?? "new"}
            title={modal.id ? "予定を編集" : "予定を作成"}
            initialValues={modal.values}
            onSubmit={
              modal.id
                ? (input) => updateEventAction(modal.id, input)
                : createEventAction
            }
            onSaved={handleSaved}
            onClose={closeModal}
            onDelete={modal.id ? openDeleteConfirm : undefined}
            closeOnEscape={!confirmingDelete}
          />
        )}
        {modal?.id && confirmingDelete && (
          <DeleteConfirmDialog
            eventTitle={modal.values.title}
            onConfirm={() => deleteEventAction(modal.id)}
            onDeleted={handleSaved}
            onCancel={closeDeleteConfirm}
          />
        )}
      </div>
    </div>
  );
}
