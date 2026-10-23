import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange } from "@/lib/calendar/jst";
import { CalendarEventSchema, type CalendarEvent } from "@/lib/events/schema";

const TABLE = "events";

// 予定が範囲 [start, end) と重なるか。範囲の外から始まって範囲の中へ続く予定も含む。
// 予定の終了は含まない（22:00〜24:00 の予定は、翌日 0:00 から始まる範囲とは重ならない）。
// 長さ 0 の予定は、その瞬間が範囲内にあるかで判定する
export function overlapsRange(
  event: Pick<CalendarEvent, "startAt" | "endAt">,
  range: DateRange,
): boolean {
  const start = event.startAt.getTime();
  const end = event.endAt.getTime();
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();

  // 範囲の終了より前に始まり、かつ（範囲の中で始まる か 範囲の開始より後に終わる）
  return start < rangeEnd && (start >= rangeStart || end > rangeStart);
}

// 表示範囲と重なる予定を取得する。overlapsRange と同じ条件を DB 側で絞り込むので、
// 月をまたぐ予定は前後どちらの月でも取得できる。
// anon クライアント（ブラウザ）と admin クライアントのどちらでも使える
export async function fetchEventsInRange(
  client: SupabaseClient,
  range: DateRange,
): Promise<CalendarEvent[]> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .lt("startAt", end)
    .or(`endAt.gt.${start},startAt.gte.${start}`)
    .order("startAt", { ascending: true })
    .order("endAt", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`予定の取得に失敗しました: ${error.message}`);
  }

  return CalendarEventSchema.array().parse(data);
}
