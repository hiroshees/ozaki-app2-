import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  ALREADY_DELETED_MESSAGE,
  isRecordNotFound,
  NOT_FOUND_MESSAGE,
} from "@/lib/events/errors";
import type { SaveEventResult } from "@/lib/events/create-event";

// delete だけを要求する。テストでは Prisma のかわりに差し替える
export type EventDeleter = {
  event: {
    delete(args: Prisma.EventDeleteArgs): Promise<unknown>;
  };
};

const DELETE_FAILED_MESSAGE =
  "予定を削除できませんでした。時間をおいて再度お試しください。";

// 予定を削除する。id は zod で検証し、問題があれば DB には書かない。
// 存在しない id（削除済みなど）は日本語のエラーにする
export async function deleteEvent(
  db: EventDeleter,
  id: unknown,
): Promise<SaveEventResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, fieldErrors: {}, message: NOT_FOUND_MESSAGE };
  }

  try {
    await db.event.delete({ where: { id: id as string } });
    return { ok: true };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { ok: false, fieldErrors: {}, message: ALREADY_DELETED_MESSAGE };
    }
    // 接続情報などが画面に出ないよう、詳細はサーバーのログにだけ残す
    console.error(error);
    return { ok: false, fieldErrors: {}, message: DELETE_FAILED_MESSAGE };
  }
}
