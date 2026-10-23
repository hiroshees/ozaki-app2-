import {
  formatYmd,
  parseYmd,
  toJstYmd,
  type JstDate,
} from "@/lib/calendar/jst";

// 表示状態（view, date）は URL の searchParams に持つ。ここはその解釈とリンクの生成（純粋関数）

export const CALENDAR_VIEWS = ["month", "week", "day"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const DEFAULT_VIEW: CalendarView = "month";

export type CalendarState = {
  view: CalendarView;
  date: JstDate;
};

// Next.js の searchParams の値。同じキーが複数あると配列になる
type SearchParamValue = string | string[] | undefined;

function firstValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isCalendarView(value: string | undefined): value is CalendarView {
  return CALENDAR_VIEWS.some((view) => view === value);
}

// searchParams から表示状態を決める。view が未指定・不正なら month、
// date が未指定・不正なら今日（JST）にする。不正な値でエラーにはしない
export function resolveCalendarState(
  params: { view?: SearchParamValue; date?: SearchParamValue },
  now: Date,
): CalendarState {
  const view = firstValue(params.view);
  return {
    view: isCalendarView(view) ? view : DEFAULT_VIEW,
    date: parseYmd(firstValue(params.date)) ?? toJstYmd(now),
  };
}

// ナビゲーションのリンク先。date を省略すると view だけにする（開くたびに今日になる）
export function buildCalendarHref(view: CalendarView, date?: JstDate): string {
  const params = new URLSearchParams({ view });
  if (date) params.set("date", formatYmd(date));
  return `/?${params.toString()}`;
}
