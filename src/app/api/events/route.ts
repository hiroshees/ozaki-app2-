import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { toFullCalendarEvent } from "@/lib/events/fullcalendar";
import { EventsQuerySchema, findEventsInRange } from "@/lib/events/find-events";

// 常に最新の予定を返す（キャッシュしない）
export const dynamic = "force-dynamic";

// 認証なし（公開しない学習用）。FullCalendar の表示範囲に重なる予定を返す
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = EventsQuerySchema.safeParse({
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(" / ") },
      { status: 400 },
    );
  }

  try {
    const events = await findEventsInRange(prisma, parsed.data);
    return NextResponse.json(events.map(toFullCalendarEvent));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "予定の取得に失敗しました" },
      { status: 500 },
    );
  }
}
