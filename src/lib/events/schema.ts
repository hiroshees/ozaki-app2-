import { z } from "zod";
import { getJstDayRange, parseJstDateTime, toJstYmd } from "@/lib/calendar/jst";

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;

// Supabase（PostgREST）が返す timestamptz の文字列（"...+00:00" や "Z"）を Date にする
const timestamptz = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

// DB の 1 行（events テーブル）。Prisma のスキーマと対応させて手で書いている
export const CalendarEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  startAt: timestamptz,
  endAt: timestamptz,
  allDay: z.boolean(),
  createdAt: timestamptz,
  updatedAt: timestamptz,
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// フォームの日時（"YYYY-MM-DDTHH:mm"）は JST の壁時計。サーバーのタイムゾーンに
// 依存しないよう、z.coerce.date() ではなく JST として明示的に解釈する
function jstDateTime(label: string) {
  return z
    .string({
      required_error: `${label}を入力してください`,
      invalid_type_error: `${label}の形式が正しくありません`,
    })
    .transform((value, ctx) => {
      const date = parseJstDateTime(value);
      if (!date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            value === ""
              ? `${label}を入力してください`
              : `${label}の形式が正しくありません`,
        });
        return z.NEVER;
      }
      return date;
    });
}

// 終日の予定は JST 00:00 区切りで保存する（SPEC: JST 00:00〜翌 00:00）
function isJstMidnight(date: Date) {
  return getJstDayRange(toJstYmd(date)).start.getTime() === date.getTime();
}

// 予定の作成・編集の入力。DB の CHECK 制約（title 1〜100 文字、description 1000 文字以内、
// endAt >= startAt）と同じ内容を、画面に出せる日本語のメッセージ付きで先に検証する
export const EventInputSchema = z
  .object({
    title: z
      .string({
        required_error: "タイトルを入力してください",
        invalid_type_error: "タイトルを入力してください",
      })
      .trim()
      .min(1, "タイトルを入力してください")
      .max(
        TITLE_MAX_LENGTH,
        `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`,
      ),
    description: z
      .string()
      .max(
        DESCRIPTION_MAX_LENGTH,
        `説明は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`,
      )
      .nullish()
      // 未入力は null にそろえる
      .transform((value) => value?.trim() || null),
    startAt: jstDateTime("開始日時"),
    endAt: jstDateTime("終了日時"),
    allDay: z.boolean().default(false),
  })
  .superRefine(({ startAt, endAt, allDay }, ctx) => {
    // 日時の変換に失敗した項目は個別にエラーが出ているので、ここでは見ない
    if (!(startAt instanceof Date) || !(endAt instanceof Date)) return;

    if (endAt.getTime() < startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "終了日時は開始日時以降にしてください",
      });
      return;
    }

    if (!allDay) return;

    const startOk = isJstMidnight(startAt);
    const endOk = isJstMidnight(endAt);
    if (!startOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAt"],
        message: "終日の予定は 0:00 を指定してください",
      });
    }
    if (!endOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "終日の予定は 0:00 を指定してください",
      });
    }
    if (startOk && endOk && endAt.getTime() === startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "終日の予定は 1 日以上の期間にしてください",
      });
    }
  });

// 検証後の値（日時は UTC の Date）と、検証前の値（日時は文字列）
export type EventInput = z.infer<typeof EventInputSchema>;
export type EventInputRaw = z.input<typeof EventInputSchema>;
