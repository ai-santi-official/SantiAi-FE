"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MeetingHeader } from "@/components/meeting/MeetingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimeRangePicker, type TimeRange } from "@/components/meeting/TimeRangePicker";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { useLiff } from "@/provider/LiffProvider";
import { getGroupMembers } from "@/utils/getGroupMembers";
import { apiFetch } from "@/utils/api";

const DEV_GROUP_ID = "Cgroup_shared_001";

type Member = { line_user_id: string; display_name: string; picture_url: string | null };

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
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-santi-primary shrink-0">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function MeetingDetailsPage() {
  return <Suspense><MeetingDetailsContent /></Suspense>;
}

function MeetingDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { groupId } = useLiff();
  const projectId = searchParams.get("projectId") ?? "";
  const projectName = searchParams.get("projectName") ?? "";
  const lineGroupId = groupId ?? DEV_GROUP_ID;

  const [meetingName, setMeetingName] = useState("");
  const [date, setDate] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>({ startHour: 9, startMinute: 0, endHour: 10, endMinute: 0 });
  const [repeat, setRepeat] = useState<"none" | "weekly" | "biweekly">("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    getGroupMembers(lineGroupId)
      .then((res) =>
        setMembers(
          res.members.map((m) => ({
            line_user_id: m.line_user_id,
            display_name: m.display_name ?? "Unknown",
            picture_url: m.picture_url,
          }))
        )
      )
      .catch((err) => console.error("Failed to load members:", err));
  }, [lineGroupId]);
  const allSelected = members.length > 0 && selectedIds.size === members.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(members.map((m) => m.line_user_id)));
  };
  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canSubmit = meetingName.trim() !== "" && date !== "" && selectedIds.size > 0;
  const selectedMembers = members.filter((m) => selectedIds.has(m.line_user_id));
  const extraCount = Math.max(0, selectedIds.size - 3);

  return (
    <>
      <MeetingHeader
        title="Create Meeting"
        step={2}
        totalSteps={2}
        onBack={() => router.back()}
      />

      <main className="relative -mt-12 bg-white rounded-t-[48px] pt-8 px-6 pb-6 space-y-6">

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

            {/* Date card — reuses existing DatePicker */}
            <div className="flex flex-col gap-1">
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Select date"
                dateOnly
              />
            </div>

            {/* Time range card */}
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
          <label className="santi-label">Add Attendees</label>

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
            const selected = selectedIds.has(member.line_user_id);
            return (
              <button
                key={member.line_user_id}
                onClick={() => toggleMember(member.line_user_id)}
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
        </div>
      </main>

      <OnboardingFooter
        onContinue={() => setShowConfirm(true)}
        disabled={!canSubmit}
        label="Create Meeting"
      />

      {/* Time Range Picker */}
      {showTimePicker && (
        <TimeRangePicker
          value={timeRange}
          onChange={setTimeRange}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col gap-6">

            {/* Header */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-black">Meeting Summary</h3>
              <p className="text-santi-muted text-sm mt-1">Please review the details below</p>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex flex-col border-b border-santi-secondary/50 pb-3">
                <span className="text-xs uppercase tracking-wider text-santi-muted font-bold">Meeting Name</span>
                <span className="text-black font-semibold">{meetingName}</span>
              </div>

              <div className="flex flex-col border-b border-santi-secondary/50 pb-3">
                <span className="text-xs uppercase tracking-wider text-santi-muted font-bold">Project</span>
                <span className="text-black font-semibold">{projectName || "—"}</span>
              </div>

              <div className="flex justify-between border-b border-santi-secondary/50 pb-3">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-santi-muted font-bold">Date</span>
                  <span className="text-black font-semibold">{date ? formatDate(date) : "—"}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs uppercase tracking-wider text-santi-muted font-bold">Time</span>
                  <span className="text-black font-semibold">
                    {formatTime(timeRange.startHour, timeRange.startMinute)} – {formatTime(timeRange.endHour, timeRange.endMinute)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-santi-muted font-bold">Attendees</span>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-3">
                    {selectedMembers.slice(0, 3).map((m) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.line_user_id}
                        src={m.picture_url ?? "/default-avatar.png"}
                        alt={m.display_name}
                        className="w-8 h-8 rounded-full ring-2 ring-white object-cover"
                      />
                    ))}
                    {extraCount > 0 && (
                      <div className="w-8 h-8 rounded-full ring-2 ring-white bg-santi-secondary flex items-center justify-center text-[10px] font-bold text-black">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-black/60">{selectedIds.size} people</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const res = await apiFetch(`/api/v1/meetings/${projectId}`, {
                      method: "POST",
                      body: JSON.stringify({
                        meeting_name: meetingName,
                        date,
                        start_time: formatTime(timeRange.startHour, timeRange.startMinute),
                        end_time: formatTime(timeRange.endHour, timeRange.endMinute),
                        repeat,
                        attendee_line_user_ids: [...selectedIds],
                      }),
                    });
                    if (!res.ok) throw new Error(`API error: ${res.status}`);
                    setShowConfirm(false);
                    router.push("/info-edit");
                  } catch (err) {
                    console.error("Failed to create meeting:", err);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full h-14 bg-santi-primary text-black font-bold rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Create Meeting</span>
                <CalendarIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full h-14 border-2 border-santi-secondary text-black/60 font-semibold rounded-2xl"
              >
                Back to edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
