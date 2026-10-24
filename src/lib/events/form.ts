import {
  formatJstDateTime,
  formatYmd,
  getJstDayRange,
  parseYmd,
  toJstYmd,
} from "@/lib/calendar/jst";
import type { EventInputRaw } from "@/lib/events/schema";

// 予定フォームの値。start / end は JST の "YYYY-MM-DDTHH:mm"。
// 終日のときは、日付の部分だけを使う（終了日を含む）
export type EventFormValues = {
  title: string;
  description: string;
  allDay: boolean;
  start: string;
  end: string;
};

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_HOUR = 9;

// "YYYY-MM-DD" の翌日。不正な日付は空文字
export function nextDay(ymd: string): string {
  const date = parseYmd(ymd);
  if (!date) return "";
  return formatYmd(toJstYmd(getJstDayRange(date).end));
}

// カレンダーをクリックした位置から、フォームの初期値を作る。
// 時刻つき（週・日ビューの時間枠）: その時刻から 1 時間。
// 日付だけ（月ビュー・終日枠）: その日の 9:00〜10:00
export function defaultFormValues(
  clicked: Date,
  dateOnly: boolean,
): EventFormValues {
  const start = dateOnly
    ? new Date(clicked.getTime() + DEFAULT_HOUR * HOUR_MS)
    : clicked;
  const end = new Date(start.getTime() + HOUR_MS);

  return {
    title: "",
    description: "",
    allDay: false,
    start: formatJstDateTime(start),
    end: formatJstDateTime(end),
  };
}

// フォームの値を、Server Action に渡す入力にする。
// 終日は「開始日の 0:00 〜 終了日の翌日 0:00」（SPEC: JST 00:00〜翌 00:00）
export function toEventInput(values: EventFormValues): EventInputRaw {
  const { title, description, allDay, start, end } = values;

  if (!allDay) {
    return { title, description, allDay, startAt: start, endAt: end };
  }

  const startDate = start.slice(0, 10);
  const endDate = nextDay(end.slice(0, 10));
  return {
    title,
    description,
    allDay,
    startAt: parseYmd(startDate) ? `${startDate}T00:00` : "",
    endAt: endDate ? `${endDate}T00:00` : "",
  };
}

// 既存の予定（FullCalendar の予定の値）から、編集フォームの初期値を作る。
// 終日の予定の end は「含まない翌日 0:00」なので、フォームの「終了日（含む）」には 1 日戻す
export function eventToFormValues(event: {
  title: string;
  description: string | null;
  allDay: boolean;
  start: Date;
  end: Date | null;
}): EventFormValues {
  const { title, allDay, start } = event;
  const description = event.description ?? "";

  if (allDay) {
    // 終了が 0:00 ちょうどなので、1 ミリ秒戻すと前日になる
    const lastDay = event.end ? new Date(event.end.getTime() - 1) : start;
    return {
      title,
      description,
      allDay,
      start: formatJstDateTime(start),
      end: formatJstDateTime(lastDay),
    };
  }

  return {
    title,
    description,
    allDay,
    start: formatJstDateTime(start),
    end: formatJstDateTime(event.end ?? new Date(start.getTime() + HOUR_MS)),
  };
}
