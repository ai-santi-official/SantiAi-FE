"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimeRangePicker, type TimeRange } from "@/components/meeting/TimeRangePicker";
import { ChevronRightIcon } from "@/components/icons";
import mockMeetings from "@/utils/mock/meetings.json";
import mockMembers from "@/utils/mock/group-members.json";

type Meeting = {
  meeting_id: string;
  meeting_name: string;
  project_id: string;
  date: string;
  start_time: string;
  end_time: string;
  repeat: string;
  attendees: string[];
};

type Member = { line_user_id: string; display_name: string; picture_url: string };

const REPEAT_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
] as const;

function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(":").map(Number);
  return { hour: h, minute: m };
}

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

  const meetings: Meeting[] = mockMeetings as Meeting[];
  const meeting = meetings.find((m) => m.meeting_id === id);

  const members: Member[] = mockMembers.members as Member[];

  const startParsed = parseTime(meeting?.start_time ?? "09:00");
  const endParsed = parseTime(meeting?.end_time ?? "10:00");

  const [meetingName, setMeetingName] = useState(meeting?.meeting_name ?? "");
  const [date, setDate] = useState(meeting?.date ?? "");
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startHour: startParsed.hour,
    startMinute: startParsed.minute,
    endHour: endParsed.hour,
    endMinute: endParsed.minute,
  });
  const [repeat, setRepeat] = useState<"none" | "weekly" | "biweekly">(
    (meeting?.repeat as "none" | "weekly" | "biweekly") ?? "none"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(meeting?.attendees ?? [])
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!meeting) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center gap-4 px-6">
        <p className="text-santi-muted font-medium">Meeting not found.</p>
        <button onClick={() => router.back()} className="text-santi-primary font-semibold underline">
          Go back
        </button>
      </div>
    );
  }

  const allSelected = members.length > 0 && selectedIds.size === members.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(members.map((m) => m.line_user_id)));
  };

  const toggleMember = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const canSave = meetingName.trim() !== "" && date !== "" && selectedIds.size > 0;

  const handleSave = () => {
    console.log("Save meeting", { id, meetingName, date, timeRange, repeat, attendees: [...selectedIds] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-16 px-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} aria-label="Go back" className="p-1 text-black">
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
            <p className="font-bold text-black">{meeting.meeting_name}</p>
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

      {/* Spacer for fixed footer */}
      <div className="h-28" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full footer-safe bg-white/80 backdrop-blur-sm border-t border-santi-muted/10">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full bg-santi-primary py-4 rounded-santi font-bold text-lg text-black active:scale-[0.98] transition-transform btn-elevation disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <SaveIcon />
            {saved ? "Saved!" : "Save Changes"}
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
    </div>
  );
}
