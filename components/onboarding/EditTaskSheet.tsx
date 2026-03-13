"use client";

import { useState } from "react";
import type { PlanTask, PlanMember } from "@/utils/getPlanProposal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Props = {
  task: PlanTask;
  members: PlanMember[];
  showStatus?: boolean;
  onSave: (updated: PlanTask) => void;
  onClose: () => void;
};

const STATUS_OPTIONS: { label: string; value: PlanTask["status"] }[] = [
  { label: "To Do",  value: "todo"  },
  { label: "Doing",  value: "doing" },
  { label: "Done",   value: "done"  },
];

export default function EditTaskSheet({ task, members, showStatus = false, onSave, onClose }: Props) {
  const [title, setTitle]           = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [startDate, setStartDate]   = useState(task.start_date);
  const [endDate, setEndDate]       = useState(task.end_date);
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assigned_to);
  const [status, setStatus]         = useState<PlanTask["status"]>(task.status);

  const [confirm, setConfirm] = useState<"discard" | "save" | null>(null);

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={handleCancelClick} />
        <div className="relative bg-white rounded-t-3xl px-6 pt-5 pb-10 space-y-4 max-h-[85dvh] overflow-y-auto">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
          <h2 className="text-base font-bold text-black">Edit Task</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-black/60 mb-1 block">Title</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-black/60 mb-1 block">Description</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-black/60 mb-1 block">Start Date</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-black/60 mb-1 block">End Date</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {showStatus && (
              <div>
                <label className="text-xs font-semibold text-black/60 mb-2 block">Status</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                        status === opt.value
                          ? "bg-santi-primary text-black"
                          : "border border-slate-200 text-black/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-black/60 mb-2 block">Assignees</label>
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
                    <span className="text-sm text-black/80">{m.display_name ?? "Unknown"}</span>
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
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              className="flex-1 py-3 rounded-santi bg-santi-primary text-sm font-bold text-black"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {confirm === "discard" && (
        <ConfirmDialog
          title="Discard changes?"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          confirmClassName="bg-red-500 text-white"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "save" && (
        <ConfirmDialog
          title="Save changes?"
          message="Are you sure you want to save the changes to this task?"
          confirmLabel="Save"
          cancelLabel="Keep editing"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
