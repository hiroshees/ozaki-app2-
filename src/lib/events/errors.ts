// Prisma は更新・削除の対象がないと P2025 のエラーを投げる
export function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

// id が不正（UUID でない）なとき
export const NOT_FOUND_MESSAGE = "予定が見つかりません。";
// id は正しいが、すでに削除されているとき
export const ALREADY_DELETED_MESSAGE =
  "予定が見つかりません。すでに削除された可能性があります。";
