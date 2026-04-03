"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlanTask, PlanMember } from "@/utils/getPlanProposal";
import { DatePicker } from "@/components/ui/DatePicker";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Props = {
  task: PlanTask;
  members: PlanMember[];
  showStatus?: boolean;
  /** Earliest selectable date (ISO, e.g. project start). Defaults to today. */
  minDate?: string;
  /** Latest selectable date (ISO, e.g. project deadline). */
  maxDate?: string;
  onSave: (updated: PlanTask) => void;
  onClose: () => void;
};

const STATUS_KEYS: { key: "todo" | "doing" | "done"; value: PlanTask["status"] }[] = [
  { key: "todo",  value: "todo"  },
  { key: "doing", value: "doing" },
  { key: "done",  value: "done"  },
];

// Convert date string to ISO string for DatePicker, or return ""
function dateToIso(d: string): string {
  if (!d) return "";
  // If already ISO-ish, return as-is
  if (d.includes("T")) return d;
  return new Date(d + "T00:00:00").toISOString();
}

const isCreate = (task: PlanTask) => !task.title && !task.start_date && !task.end_date;

export default function EditTaskSheet({ task, members, showStatus = false, minDate, maxDate, onSave, onClose }: Props) {
  const t = useTranslations("editTask");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const td = useTranslations("confirmDialog");
  const [title, setTitle]           = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [startDate, setStartDate]   = useState(task.start_date);
  const [endDate, setEndDate]       = useState(task.end_date);
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assigned_to);
  const [status, setStatus]         = useState<PlanTask["status"]>(task.status);

  const [confirm, setConfirm] = useState<"discard" | "save" | null>(null);

  const creating = isCreate(task);

  const isDirty =
    title !== task.title ||
    description !== task.description ||
    startDate !== task.start_date ||
    endDate !== task.end_date ||
    status !== task.status ||
    JSON.stringify([...assignedTo].sort()) !== JSON.stringify([...task.assigned_to].sort());

  const toggleMember = (id: string) => {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCancelClick = () => {
    if (isDirty) setConfirm("discard");
    else onClose();
  };

  const handleSaveClick = () => setConfirm("save");

  const handleConfirm = () => {
    if (confirm === "save") {
      onSave({ ...task, title, description, start_date: startDate, end_date: endDate, assigned_to: assignedTo, status });
    } else {
      onClose();
    }
    setConfirm(null);
  };

  const canSave = title.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={handleCancelClick} />
        <div className="relative bg-white rounded-t-3xl px-6 pt-5 pb-10 space-y-4 max-h-[85dvh] overflow-y-auto">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
          <h2 className="text-base font-bold text-black">{creating ? t("createTask") : t("editTask")}</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-black/60 mb-1 block">{t("title")}</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary"
                placeholder={t("titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-black/60 mb-1 block">{t("description")}</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary resize-none"
                rows={3}
                placeholder={t("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-black/60 mb-1 block">{t("startDate")}</label>
                <DatePicker
                  value={dateToIso(startDate)}
                  onChange={(iso) => setStartDate(iso)}
                  placeholder={t("selectStart")}
                  dateOnly
                  minDate={minDate}
                  maxDate={maxDate}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-black/60 mb-1 block">{t("endDate")}</label>
                <DatePicker
                  value={dateToIso(endDate)}
                  onChange={(iso) => setEndDate(iso)}
                  placeholder={t("selectEnd")}
                  dateOnly
                  minDate={minDate}
                  maxDate={maxDate}
                />
              </div>
            </div>

            {showStatus && (
              <div>
                <label className="text-xs font-semibold text-black/60 mb-2 block">{t("status")}</label>
                <div className="flex gap-2">
                  {STATUS_KEYS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                        status === opt.value
                          ? "bg-santi-primary text-black"
                          : "border border-slate-200 text-black/60"
                      }`}
                    >
                      {ts(opt.key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-black/60 mb-2 block">{t("assignees")}</label>
              <div className="space-y-2">
                {members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignedTo.includes(m.user_id)}
                      onChange={() => toggleMember(m.user_id)}
                      className="w-4 h-4 accent-santi-primary"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.picture_url ?? "/default-avatar.png"}
                      alt={m.display_name ?? "Member"}
                      className="w-6 h-6 rounded-full object-cover bg-slate-100"
                    />
                    <span className="text-sm text-black/80">{m.display_name ?? tc("unknown")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancelClick}
              className="flex-1 py-3 rounded-santi border-2 border-slate-200 text-sm font-bold text-black/60"
            >
              {tc("cancel")}
            </button>
            <button
              onClick={handleSaveClick}
              disabled={!canSave}
              className="flex-1 py-3 rounded-santi bg-santi-primary text-sm font-bold text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? tc("create") : tc("save")}
            </button>
          </div>
        </div>
      </div>

      {confirm === "discard" && (
        <ConfirmDialog
          title={td("discardChanges")}
          message={td("unsavedDiscard")}
          confirmLabel={tc("discard")}
          cancelLabel={tc("keepEditing")}
          confirmClassName="bg-red-500 text-white"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "save" && (
        <ConfirmDialog
          title={creating ? td("createTaskTitle") : td("saveChanges")}
          message={creating ? td("createTaskMessage") : td("saveTaskConfirm")}
          confirmLabel={creating ? tc("create") : tc("save")}
          cancelLabel={tc("keepEditing")}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
