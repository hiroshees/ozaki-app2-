import type { Prisma } from "@prisma/client";
import { EventInputSchema } from "@/lib/events/schema";

// 入力欄の名前ごとのエラー（日本語のメッセージ）
export type FieldErrors = Partial<
  Record<"title" | "description" | "startAt" | "endAt" | "allDay", string>
>;

export type SaveEventResult =
  { ok: true } | { ok: false; fieldErrors: FieldErrors; message?: string };

// create だけを要求する。テストでは Prisma のかわりに差し替える
export type EventWriter = {
  event: {
    create(args: Prisma.EventCreateArgs): Promise<unknown>;
  };
};

const FIELD_NAMES = ["title", "description", "startAt", "endAt", "allDay"];

// 予定を作成する。入力は zod で検証し、問題があれば DB には書かない。
// 日時は JST として解釈され、UTC の瞬間として保存される
export async function createEvent(
  db: EventWriter,
  raw: unknown,
): Promise<SaveEventResult> {
  const parsed = EventInputSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const name = String(issue.path[0] ?? "");
      // 項目ごとに最初のメッセージだけを出す
      if (FIELD_NAMES.includes(name) && !(name in fieldErrors)) {
        fieldErrors[name as keyof FieldErrors] = issue.message;
      }
    }
    return {
      ok: false,
      fieldErrors,
      ...(Object.keys(fieldErrors).length === 0 && {
        message: "入力内容が正しくありません。",
      }),
    };
  }

  try {
    await db.event.create({ data: parsed.data });
    return { ok: true };
  } catch (error) {
    // 接続情報などが画面に出ないよう、詳細はサーバーのログにだけ残す
    console.error(error);
    return {
      ok: false,
      fieldErrors: {},
      message: "予定を保存できませんでした。時間をおいて再度お試しください。",
    };
  }
}
