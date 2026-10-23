import {
  addDays,
  addMonths,
  formatYmd,
  getWeekday,
  parseYmd,
  toJstYmd,
  type JstDate,
} from "@/lib/calendar/jst";

// 表示状態（view, date）は URL の searchParams に持つ。ここはその解釈と移動の計算（純粋関数）

export const CALENDAR_VIEWS = ["month", "week", "day"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const DEFAULT_VIEW: CalendarView = "month";

// 画面に出すビューの名前
export const VIEW_LABELS: Record<CalendarView, string> = {
  month: "月",
  week: "週",
  day: "日",
};

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

// 前へ(-1) / 次へ(1) の移動先。ビューの単位（月・週・日）で動く
export function shiftCalendarDate(
  view: CalendarView,
  date: JstDate,
  direction: -1 | 1,
): JstDate {
  switch (view) {
    case "month":
      return addMonths(date, direction);
    case "week":
      return addDays(date, 7 * direction);
    case "day":
      return addDays(date, direction);
  }
}

// ナビゲーションのリンク先。date を省略すると view だけにする（開くたびに今日になる）
export function buildCalendarHref(view: CalendarView, date?: JstDate): string {
  const params = new URLSearchParams({ view });
  if (date) params.set("date", formatYmd(date));
  return `/?${params.toString()}`;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// 見出し。月: 2026年10月 / 週: 2026年10月18日〜10月24日 / 日: 2026年10月23日（金）
export function formatCalendarTitle(view: CalendarView, date: JstDate): string {
  switch (view) {
    case "month":
      return `${date.year}年${date.month}月`;
    case "day":
      return `${date.year}年${date.month}月${date.day}日（${WEEKDAY_LABELS[getWeekday(date)]}）`;
    case "week": {
      const start = addDays(date, -getWeekday(date));
      const end = addDays(start, 6);
      // 終了側は、年が変わるときだけ年を付ける
      const endYear = end.year === start.year ? "" : `${end.year}年`;
      return `${start.year}年${start.month}月${start.day}日〜${endYear}${end.month}月${end.day}日`;
    }
  }
}
