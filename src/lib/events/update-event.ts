import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  ALREADY_DELETED_MESSAGE,
  isRecordNotFound,
  NOT_FOUND_MESSAGE,
} from "@/lib/events/errors";
import {
  parseEventInput,
  SAVE_FAILED_MESSAGE,
  type SaveEventResult,
} from "@/lib/events/create-event";

// update だけを要求する。テストでは Prisma のかわりに差し替える
export type EventUpdater = {
  event: {
    update(args: Prisma.EventUpdateArgs): Promise<unknown>;
  };
};

// 予定を更新する。id と入力は zod で検証し、問題があれば DB には書かない。
// 存在しない id（削除済みなど）は日本語のエラーにする
export async function updateEvent(
  db: EventUpdater,
  id: unknown,
  raw: unknown,
): Promise<SaveEventResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, fieldErrors: {}, message: NOT_FOUND_MESSAGE };
  }

  const input = parseEventInput(raw);
  if (!input.ok) return input.result;

  try {
    await db.event.update({ where: { id: id as string }, data: input.data });
    return { ok: true };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { ok: false, fieldErrors: {}, message: ALREADY_DELETED_MESSAGE };
    }
    // 接続情報などが画面に出ないよう、詳細はサーバーのログにだけ残す
    console.error(error);
    return { ok: false, fieldErrors: {}, message: SAVE_FAILED_MESSAGE };
  }
}
