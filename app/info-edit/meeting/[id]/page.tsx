"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimeRangePicker, type TimeRange } from "@/components/meeting/TimeRangePicker";
import { ChevronRightIcon, TrashIcon } from "@/components/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLiff } from "@/provider/LiffProvider";
import { getMeeting, updateMeeting, type MeetingDetail } from "@/utils/getMeeting";
import { getProjectMembers, deleteMeetingApi } from "@/utils/getProjectTasksAndMeetings";
import { getProject } from "@/utils/getProject";

const REPEAT_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
] as const;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function formatTime(h: number, m: number) {
  return `${pad(h)}:${pad(m)}`;
}

function BackArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-santi-primary shrink-0">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export default function MeetingInfoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { isReady } = useLiff();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [members, setMembers] = useState<{ user_id: string; display_name: string | null; picture_url: string | null }[]>([]);
  const [projectDeadline, setProjectDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [meetingName, setMeetingName] = useState("");
  const [date, setDate] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startHour: 9, startMinute: 0, endHour: 10, endMinute: 0,
  });
  const [repeat, setRepeat] = useState<"none" | "weekly" | "biweekly">("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "save" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<"ask" | "recurring" | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch meeting + project members on mount
  useEffect(() => {
    if (!isReady) return;
    getMeeting(id)
      .then(async (meetingData) => {
        setMeeting(meetingData);
        const [projectMembers, projectData] = await Promise.all([
          getProjectMembers(meetingData.project_id),
          getProject(meetingData.project_id),
        ]);
        if (projectData.final_due_date) setProjectDeadline(projectData.final_due_date.slice(0, 10));
        setMembers(projectMembers.map((m) => ({
          user_id: m.user_id,
          display_name: m.display_name,
          picture_url: m.picture_url,
        })));

        // Initialize form state from API data
        setMeetingName(meetingData.meeting_title);
        const mt = new Date(meetingData.meeting_time);
        // Use local time (browser is in Bangkok) for both date and hours
        const meetingDate = `${mt.getFullYear()}-${pad(mt.getMonth() + 1)}-${pad(mt.getDate())}`;
        setDate(meetingDate);

        const startH = mt.getHours();
        const startM = mt.getMinutes();
        const dur = meetingData.duration_minutes ?? 60;
        const endTotal = startH * 60 + startM + dur;
        setTimeRange({
          startHour: startH,
          startMinute: startM,
          endHour: Math.floor(endTotal / 60),
          endMinute: endTotal % 60,
        });

        setRepeat(meetingData.recurrence);
        setSelectedIds(new Set(meetingData.attendees.map((a) => a.user_id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isReady, id]);

  if (loading) {
    return <LoadingSpinner message="Loading meeting..." />;
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center gap-4 px-6">
        <p className="text-santi-muted font-medium">{error ?? "Meeting not found."}</p>
        <button onClick={() => router.back()} className="text-santi-primary font-semibold underline">
          Go back
        </button>
      </div>
    );
  }

  const origMt = new Date(meeting.meeting_time);
  const origDate = `${origMt.getFullYear()}-${pad(origMt.getMonth() + 1)}-${pad(origMt.getDate())}`;
  const origStartH = origMt.getHours();
  const origStartM = origMt.getMinutes();
  const origDur = meeting.duration_minutes ?? 60;
  const origEndTotal = origStartH * 60 + origStartM + origDur;
  const origAttendeeIds = meeting.attendees.map((a) => a.user_id).sort().join(",");

  const isDirty =
    meetingName !== meeting.meeting_title ||
    date !== origDate ||
    repeat !== meeting.recurrence ||
    timeRange.startHour !== origStartH ||
    timeRange.startMinute !== origStartM ||
    timeRange.endHour !== Math.floor(origEndTotal / 60) ||
    timeRange.endMinute !== origEndTotal % 60 ||
    [...selectedIds].sort().join(",") !== origAttendeeIds;

  const allSelected = members.length > 0 && selectedIds.size === members.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(members.map((m) => m.user_id)));
  };

  const toggleMember = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const canSave = meetingName.trim() !== "" && date !== "" && selectedIds.size > 0 && !saving;

  const handleBackClick = () => {
    if (isDirty) setConfirm("discard");
    else router.back();
  };

  const handleSaveClick = () => setConfirm("save");

  const handleConfirm = async () => {
    if (confirm === "save") {
      setConfirm(null);
      setSaving(true);
      try {
        const startTimeStr = formatTime(timeRange.startHour, timeRange.startMinute);
        const endTimeStr = formatTime(timeRange.endHour, timeRange.endMinute);

        const updated = await updateMeeting(id, {
          meeting_title: meetingName,
          date,
          start_time: startTimeStr,
          end_time: endTimeStr,
          recurrence: repeat,
          attendee_user_ids: [...selectedIds],
        });

        setMeeting(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Failed to save meeting:", err);
        setError("Failed to save meeting. Please try again.");
      } finally {
        setSaving(false);
      }
    } else {
      setConfirm(null);
      router.back();
    }
  };

  const handleDeleteClick = () => {
    if (meeting.recurrence !== "none") {
      setDeleteConfirm("recurring");
    } else {
      setDeleteConfirm("ask");
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteMeetingApi(id);
      router.back();
    } catch (err) {
      console.error("Failed to delete meeting:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-16 px-6">
        <div className="flex items-center justify-between">
          <button onClick={handleBackClick} aria-label="Go back" className="p-1 text-black">
            <BackArrowIcon />
          </button>
          <h1 className="text-lg font-bold text-black">Edit Meeting</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* Form */}
      <main className="relative -mt-8 bg-white rounded-t-[48px] pt-8 px-6 pb-6 space-y-6 flex-1">

        {/* Meeting badge */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex w-12 h-12 items-center justify-center rounded-xl bg-santi-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-santi-muted font-semibold uppercase tracking-wider">Meeting</p>
            <p className="font-bold text-black">{meeting.meeting_title}</p>
          </div>
        </div>

        {/* Meeting Name */}
        <div className="flex flex-col gap-2">
          <label className="santi-label">Meeting Name</label>
          <input
            className="santi-input"
            placeholder="e.g. Weekly Sync"
            value={meetingName}
            onChange={(e) => setMeetingName(e.target.value)}
          />
        </div>

        {/* Date & Time */}
        <div className="flex flex-col gap-2">
          <label className="santi-label">Date &amp; Time</label>
          <div className="space-y-3">
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Select date"
              dateOnly
              maxDate={projectDeadline || undefined}
            />
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="w-full flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left transition-colors focus:outline-none focus:border-santi-primary"
            >
              <ClockIcon className="w-5 h-5 text-santi-primary shrink-0" />
              <span className="flex-1 font-medium text-black">
                {formatTime(timeRange.startHour, timeRange.startMinute)}
                {" → "}
                {formatTime(timeRange.endHour, timeRange.endMinute)}
              </span>
              <ChevronRightIcon className="w-4 h-4 text-santi-muted" />
            </button>
          </div>
        </div>

        {/* Repeat */}
        <div className="flex flex-col gap-2">
          <label className="santi-label">Repeat</label>
          <div className="flex gap-3">
            {REPEAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRepeat(opt.value)}
                className={`py-2 px-5 rounded-full text-sm font-semibold transition-all ${
                  repeat === opt.value
                    ? "bg-santi-primary text-black"
                    : "border border-santi-muted text-black/60 hover:border-santi-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Attendees */}
        <div className="flex flex-col gap-3">
          <label className="santi-label">Attendees</label>

          {/* Select All */}
          <button
            onClick={toggleSelectAll}
            className={`member-card w-full flex items-center gap-3 p-3 rounded-santi border ${
              allSelected
                ? "bg-santi-secondary border-2 border-santi-primary"
                : "bg-white border-santi-muted"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <GroupIcon className="w-5 h-5 text-santi-muted" />
            </div>
            <span className="flex-1 text-sm font-bold text-left">Select All</span>
            {allSelected
              ? <CheckCircleIcon />
              : <div className="w-6 h-6 rounded-full border-2 border-santi-muted shrink-0" />
            }
          </button>

          {/* Member list */}
          {members.map((member) => {
            const selected = selectedIds.has(member.user_id);
            return (
              <button
                key={member.user_id}
                onClick={() => toggleMember(member.user_id)}
                className={`member-card w-full flex items-center gap-3 p-3 rounded-santi border ${
                  selected
                    ? "bg-santi-secondary border-2 border-santi-primary"
                    : "bg-white border-santi-muted"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.picture_url ?? "/default-avatar.png"}
                  alt={member.display_name ?? "Member"}
                  className="w-10 h-10 rounded-full object-cover shrink-0 bg-slate-100"
                />
                <span className="flex-1 text-sm font-bold text-left">{member.display_name}</span>
                {selected
                  ? <CheckCircleIcon />
                  : <div className="w-6 h-6 rounded-full border-2 border-santi-muted shrink-0" />
                }
              </button>
            );
          })}
          {/* Delete Meeting */}
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="w-full py-3 rounded-santi border-2 border-red-200 text-sm font-bold text-red-500 active:bg-red-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete Meeting"}
          </button>
        </div>
      </main>

      {/* Spacer for fixed footer */}
      <div className="h-32" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full footer-safe bg-white/80 backdrop-blur-sm border-t border-santi-muted/10">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-white py-3.5 rounded-santi font-bold text-sm text-black border-2 border-slate-200 active:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSaveClick}
            disabled={!canSave || !isDirty}
            className="flex-1 bg-santi-primary py-3.5 rounded-santi font-bold text-sm text-black active:scale-[0.98] transition-transform btn-elevation disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <SaveIcon />
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </footer>

      {/* Time Range Picker */}
      {showTimePicker && (
        <TimeRangePicker
          value={timeRange}
          onChange={setTimeRange}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      {confirm === "discard" && (
        <ConfirmDialog
          title="Discard changes?"
          message="You have unsaved changes. Are you sure you want to leave without saving?"
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
      {deleteConfirm === "ask" && (
        <ConfirmDialog
          title="Delete meeting?"
          message="This meeting will be permanently removed. This action cannot be undone."
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          cancelLabel="Cancel"
          confirmClassName="bg-red-500 text-white"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      {deleteConfirm === "recurring" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-3xl p-6 mx-6 max-w-sm w-full shadow-xl space-y-3">
            <h3 className="text-base font-bold text-black text-center">Delete recurring meeting?</h3>
            <p className="text-sm text-black/60 text-center">This is a recurring meeting. Would you like to delete only this occurrence or all occurrences?</p>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="w-full py-3 rounded-santi bg-red-500 text-white font-bold text-sm active:bg-red-600 transition-colors disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete this meeting only"}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="w-full py-3 rounded-santi border-2 border-red-200 text-red-500 font-bold text-sm active:bg-red-50 transition-colors disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete all occurrences"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-full py-3 rounded-santi text-black/60 font-bold text-sm active:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-3xl p-6 mx-6 max-w-[200px] w-full shadow-xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-santi-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-black">Saving...</p>
          </div>
        </div>
      )}
    </div>
  );
}
