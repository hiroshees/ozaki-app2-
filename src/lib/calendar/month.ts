import type { JstDate } from "@/lib/calendar/jst";

// 月ビューの純粋関数。ブラウザ側のコンポーネントからも読み込むので、
// zod や Supabase など重い依存は持たない

// 日付セルに出す予定の最大件数。超過分は「+N 件」にまとめる
export const MAX_VISIBLE_EVENTS = 3;

export function summarizeDay<T>(
  events: T[],
  max: number = MAX_VISIBLE_EVENTS,
): { visible: T[]; hiddenCount: number } {
  return {
    visible: events.slice(0, max),
    hiddenCount: Math.max(events.length - max, 0),
  };
}

export function formatHiddenCount(count: number): string {
  return `+${count} 件`;
}

// react-calendar はタイルの日付を「ブラウザのローカル 0:00 の Date」で渡す。
// その年月日がそのまま見えているカレンダー上の日付なので、ローカルの値を読む。
// （toJstYmd で UTC に直してから +9 時間すると、UTC+14 などで日付がずれる）
export function fromLocalDate(date: Date): JstDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

// react-calendar に渡すための、ローカル 0:00 の Date
export function toLocalDate({ year, month, day }: JstDate): Date {
  return new Date(year, month - 1, day);
}
