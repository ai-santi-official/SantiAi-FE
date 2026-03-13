"use client";

import { useState } from "react";
import type { PlanMeeting, PlanMember } from "@/utils/getPlanProposal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Props = {
  meeting: PlanMeeting;
  members: PlanMember[];
  onSave: (updated: PlanMeeting) => void;
  onClose: () => void;
};

const RECURRENCE_OPTIONS = ["none", "weekly", "biweekly"] as const;
type Recurrence = typeof RECURRENCE_OPTIONS[number];

export default function EditMeetingSheet({ meeting, members, onSave, onClose }: Props) {
  const [title, setTitle]                   = useState(meeting.title);
  const [datetime, setDatetime]             = useState(meeting.datetime.slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(meeting.duration_minutes ?? 30);
  const [recurrence, setRecurrence]         = useState<Recurrence>(meeting.recurrence ?? "none");
  const [participants, setParticipants]     = useState<string[]>(meeting.participants);

  const [confirm, setConfirm] = useState<"discard" | "save" | null>(null);

  const isDirty =
    title !== meeting.title ||
    datetime !== meeting.datetime.slice(0, 16) ||
    durationMinutes !== (meeting.duration_minutes ?? 30) ||
    recurrence !== (meeting.recurrence ?? "none") ||
    JSON.stringify([...participants].sort()) !== JSON.stringify([...meeting.participants].sort());

  const toggleMember = (id: string) => {
    setParticipants((prev) =>
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
      onSave({ ...meeting, title, datetime, duration_minutes: durationMinutes, recurrence, participants });
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
          <h2 className="text-base font-bold text-black">Edit Meeting</h2>

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
              <label className="text-xs font-semibold text-black/60 mb-1 block">Date &amp; Time</label>
              <input
                type="datetime-local"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-black/60 mb-1 block">Duration (min)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-black/60 mb-1 block">Recurrence</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-santi-primary bg-white"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                >
                  {RECURRENCE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-black/60 mb-2 block">Attendees</label>
              <div className="space-y-2">
                {members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={participants.includes(m.user_id)}
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
          message="Are you sure you want to save the changes to this meeting?"
          confirmLabel="Save"
          cancelLabel="Keep editing"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
