"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { toEventInput, type EventFormValues } from "@/lib/events/form";
import type { FieldErrors, SaveEventResult } from "@/lib/events/create-event";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "@/lib/events/schema";

type EventFormModalProps = {
  title: string;
  initialValues: EventFormValues;
  // 保存する（Server Action）。成功したら onSaved が呼ばれる
  onSubmit: (
    input: ReturnType<typeof toEventInput>,
  ) => Promise<SaveEventResult>;
  onSaved: () => void;
  onClose: () => void;
  // 編集のときだけ渡す。削除ボタンを出し、押すと呼ばれる（確認ダイアログは呼び出し側）
  onDelete?: () => void;
  // 確認ダイアログが上に出ているときは、Escape をそちらに任せる
  closeOnEscape?: boolean;
};

const INPUT_CLASS =
  "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-blue-500";
const ERROR_CLASS = "mt-1 text-sm text-red-600";

// 予定の入力モーダル。入力の検証はサーバー（zod）で行い、エラーを項目ごとに表示する
export function EventFormModal({
  title,
  initialValues,
  onSubmit,
  onSaved,
  onClose,
  onDelete,
  closeOnEscape = true,
}: EventFormModalProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const headingId = useId();

  // Escape で閉じる
  useEffect(() => {
    if (!closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, closeOnEscape]);

  const update = <K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  // 終日のときは日付だけ入力する。時刻の部分は保持して、チェックを外したときに戻せるようにする
  const setDatePart = (key: "start" | "end", date: string) =>
    update(key, `${date}${values[key].slice(10)}`);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setErrors({});
    setMessage(null);
    try {
      const result = await onSubmit(toEventInput(values));
      if (result.ok) {
        onSaved();
        return;
      }
      setErrors(result.fieldErrors);
      setMessage(result.message ?? null);
    } catch (error) {
      console.error(error);
      setMessage(
        "予定を保存できませんでした。時間をおいて再度お試しください。",
      );
    } finally {
      setPending(false);
    }
  };

  const dateTimeType = values.allDay ? "date" : "datetime-local";
  const dateTimeValue = (value: string) =>
    values.allDay ? value.slice(0, 10) : value;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-800/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={headingId} className="mb-4 text-lg font-medium text-gray-900">
          {title}
        </h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {message && (
            <p role="alert" className="text-sm text-red-600">
              {message}
            </p>
          )}

          <div>
            <label htmlFor="event-title" className="mb-1 block text-sm">
              タイトル
            </label>
            <input
              id="event-title"
              type="text"
              autoFocus
              maxLength={TITLE_MAX_LENGTH * 2}
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={errors.title !== undefined}
              className={INPUT_CLASS}
            />
            {errors.title && <p className={ERROR_CLASS}>{errors.title}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.allDay}
              onChange={(e) => update("allDay", e.target.checked)}
            />
            終日
          </label>

          <div>
            <label htmlFor="event-start" className="mb-1 block text-sm">
              {values.allDay ? "開始日" : "開始日時"}
            </label>
            <input
              id="event-start"
              type={dateTimeType}
              value={dateTimeValue(values.start)}
              onChange={(e) =>
                values.allDay
                  ? setDatePart("start", e.target.value)
                  : update("start", e.target.value)
              }
              aria-invalid={errors.startAt !== undefined}
              className={INPUT_CLASS}
            />
            {errors.startAt && <p className={ERROR_CLASS}>{errors.startAt}</p>}
          </div>

          <div>
            <label htmlFor="event-end" className="mb-1 block text-sm">
              {values.allDay ? "終了日（含む）" : "終了日時"}
            </label>
            <input
              id="event-end"
              type={dateTimeType}
              value={dateTimeValue(values.end)}
              onChange={(e) =>
                values.allDay
                  ? setDatePart("end", e.target.value)
                  : update("end", e.target.value)
              }
              aria-invalid={errors.endAt !== undefined}
              className={INPUT_CLASS}
            />
            {errors.endAt && <p className={ERROR_CLASS}>{errors.endAt}</p>}
          </div>

          <div>
            <label htmlFor="event-description" className="mb-1 block text-sm">
              説明（任意）
            </label>
            <textarea
              id="event-description"
              rows={3}
              maxLength={DESCRIPTION_MAX_LENGTH * 2}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              aria-invalid={errors.description !== undefined}
              className={INPUT_CLASS}
            />
            {errors.description && (
              <p className={ERROR_CLASS}>{errors.description}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="mr-auto rounded-lg border border-red-300 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                削除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
