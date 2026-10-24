"use client";

import { useEffect, useId, useState } from "react";
import type { SaveEventResult } from "@/lib/events/create-event";

type DeleteConfirmDialogProps = {
  eventTitle: string;
  // 削除する（Server Action）。成功したら onDeleted が呼ばれる
  onConfirm: () => Promise<SaveEventResult>;
  onDeleted: () => void;
  onCancel: () => void;
};

// 削除前の確認ダイアログ。キャンセルでは何も変えない
export function DeleteConfirmDialog({
  eventTitle,
  onConfirm,
  onDeleted,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const headingId = useId();

  // Escape でキャンセル
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const handleConfirm = async () => {
    if (pending) return;

    setPending(true);
    setMessage(null);
    try {
      const result = await onConfirm();
      if (result.ok) {
        onDeleted();
        return;
      }
      setMessage(result.message ?? "予定を削除できませんでした。");
    } catch (error) {
      console.error(error);
      setMessage(
        "予定を削除できませんでした。時間をおいて再度お試しください。",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-800/30 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={headingId} className="mb-2 text-lg font-medium text-gray-900">
          予定を削除しますか？
        </h2>
        <p className="mb-4 break-words text-sm text-gray-600">
          「{eventTitle}」を削除します。この操作は取り消せません。
        </p>
        {message && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {pending ? "削除中…" : "削除"}
          </button>
        </div>
      </div>
    </div>
  );
}
