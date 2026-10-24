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

// ある瞬間を JST の "YYYY-MM-DDTHH:mm"（フォームの日時の形式）にする。秒以下は切り捨てる
export function formatJstDateTime(instant: Date): string {
  const ymd = formatYmd(toJstYmd(instant));
  const shifted = new Date(instant.getTime() + JST_OFFSET_MS);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${ymd}T${hh}:${mm}`;
}

// その日の JST 00:00 〜 翌日 00:00
export function getJstDayRange({ year, month, day }: JstDate): DateRange {
  return {
    start: jstMidnight(year, month - 1, day),
    end: jstMidnight(year, month - 1, day + 1),
  };
}
