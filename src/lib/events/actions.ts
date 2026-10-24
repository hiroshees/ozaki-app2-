"use server";

import { prisma } from "@/db/prisma";
import { createEvent, type SaveEventResult } from "@/lib/events/create-event";
import { deleteEvent } from "@/lib/events/delete-event";
import { updateEvent } from "@/lib/events/update-event";

// 予定の作成（Server Action）。ブラウザからは DB に書かず、サーバーで Prisma を使う。
// 入力は信用せず、createEvent の中で zod で検証する
export async function createEventAction(
  raw: unknown,
): Promise<SaveEventResult> {
  return createEvent(prisma, raw);
}

// 予定の更新（Server Action）。id と入力は updateEvent の中で zod で検証する
export async function updateEventAction(
  id: unknown,
  raw: unknown,
): Promise<SaveEventResult> {
  return updateEvent(prisma, id, raw);
}

// 予定の削除（Server Action）。id は deleteEvent の中で zod で検証する
export async function deleteEventAction(id: unknown): Promise<SaveEventResult> {
  return deleteEvent(prisma, id);
}
