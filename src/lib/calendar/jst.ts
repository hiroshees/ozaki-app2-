// JST（Asia/Tokyo）基準の日付計算。純粋関数のみで、実行環境のタイムゾーンには依存しない。
// JST は UTC+9 で夏時間がないため、固定オフセットで計算できる。
// 範囲は [start, end)（end は含まない）。SPEC の「終日予定は JST 00:00〜翌 00:00（排他的）」と同じ

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// JST のカレンダー上の日付（month は 1〜12）
export type JstDate = {
  year: number;
  month: number;
  day: number;
};

// UTC の瞬間で表した範囲。end は含まない
export type DateRange = {
  start: Date;
  end: Date;
};

// 実在する日付だけを受け付ける。Date.UTC は 0〜99 年を 1900 年代として扱うため、
// 4 桁の年は 1000 年以降に限る
const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1000;

// "YYYY-MM-DD" を分解する。形式が違う・存在しない日付は null
export function parseYmd(value: string | null | undefined): JstDate | null {
  if (!value) return null;

  const match = YMD_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_YEAR) return null;

  // 一度 Date にして分解し直し、2/30 のような繰り上がる日付を弾く
  const check = new Date(Date.UTC(year, month - 1, day));
  const valid =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;

  return valid ? { year, month, day } : null;
}

// ゼロ埋めした "YYYY-MM-DD" にする
export function formatYmd({ year, month, day }: JstDate): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// ある瞬間が JST で何年何月何日にあたるか
export function toJstYmd(instant: Date): JstDate {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError("不正な Date です");
  }

  // JST の壁時計を UTC の値として読み取る
  const shifted = new Date(instant.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

// カレンダー上の日付だけで計算する（時刻・タイムゾーンは関係しない）ので、UTC の Date.UTC を使う

// 日を足し引きする。月末・年末・うるう日をまたいでもよい
export function addDays({ year, month, day }: JstDate, days: number): JstDate {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

// 月を足し引きする。移動先の月に同じ日がなければ月末に丸める（1/31 の次の月は 2/28 or 2/29）
export function addMonths(
  { year, month, day }: JstDate,
  months: number,
): JstDate {
  // 年をまたぐ計算を「0 始まりの通算月」でそろえる
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = total - targetYear * 12 + 1;

  // 翌月の 0 日目 = 当月の末日
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return { year: targetYear, month: targetMonth, day: Math.min(day, lastDay) };
}

// 曜日（0 = 日曜 〜 6 = 土曜）
export function getWeekday({ year, month, day }: JstDate): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// <input type="datetime-local"> の値（"YYYY-MM-DDTHH:mm"）を JST として解釈し、UTC の Date にする。
// タイムゾーン付き・秒付き・存在しない日時は null。24:00 は不正（翌日 00:00 と書く）
const DATETIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

export function parseJstDateTime(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;

  const match = DATETIME_PATTERN.exec(value);
  if (!match) return null;

  const date = parseYmd(match[1]);
  if (!date) return null;

  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;

  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, hour, minute) - JST_OFFSET_MS,
  );
}

// JST の 0:00 を表す UTC の瞬間。day が月の範囲を超えても Date.UTC が繰り上げて扱う
function jstMidnight(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day) - JST_OFFSET_MS);
}

// その日の JST 00:00 〜 翌日 00:00
export function getJstDayRange({ year, month, day }: JstDate): DateRange {
  return {
    start: jstMidnight(year, month - 1, day),
    end: jstMidnight(year, month - 1, day + 1),
  };
}

// その日を含む週（日曜始まり）の JST 日曜 00:00 〜 翌週日曜 00:00
export function getJstWeekRange({ year, month, day }: JstDate): DateRange {
  // 曜日はカレンダー上の日付だけで決まる（0 = 日曜）
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    start: jstMidnight(year, month - 1, day - weekday),
    end: jstMidnight(year, month - 1, day - weekday + 7),
  };
}

// その日を含む月の JST 月初 00:00 〜 翌月初 00:00
export function getJstMonthRange({ year, month }: JstDate): DateRange {
  return {
    start: jstMidnight(year, month - 1, 1),
    end: jstMidnight(year, month, 1),
  };
}
