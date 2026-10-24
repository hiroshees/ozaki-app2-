"use server";

import { prisma } from "@/db/prisma";
import { createEvent, type SaveEventResult } from "@/lib/events/create-event";

// 予定の作成（Server Action）。ブラウザからは DB に書かず、サーバーで Prisma を使う。
// 入力は信用せず、createEvent の中で zod で検証する
export async function createEventAction(
  raw: unknown,
): Promise<SaveEventResult> {
  return createEvent(prisma, raw);
}
