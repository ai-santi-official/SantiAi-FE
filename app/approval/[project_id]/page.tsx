"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPlanProposal,
  type PlanProposalResponse,
  type PlanTask,
  type PlanMeeting,
  type PlanMember,
} from "@/utils/getPlanProposal";
import {
  BellIcon,
  SparklesIcon,
  CalendarDotIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MeetingIcon,
} from "@/components/icons";
import { useLiff } from "@/provider/LiffProvider";
import { apiFetch } from "@/utils/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// ─── Color Palette ────────────────────────────────────────────────────────────
const TASK_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#DDA0DD", "#87CEEB", "#F4A460", "#90EE90", "#FFB6C1",
  "#6BCB77", "#FF9F1C", "#7B68EE", "#FF6EB4", "#20B2AA", "#CD853F",
];

function getTaskColor(index: number) {
  return TASK_COLORS[index % TASK_COLORS.length];
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ColoredTask = PlanTask & { color: string };

type TimelineGroup = {
  dateKey: string;
  startLabel: string;
  endLabel: string;
  tasks: ColoredTask[];
  meetings: PlanMeeting[];
};

type ApprovalMember = {
  user_id: string;
  line_user_id: string;
  line_display_name: string | null;
  picture_url: string | null;
  approval_status: "pending" | "approved" | "rejected";
  responded_at: string | null;
};

type ApprovalSummary = {
  total_members: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function formatShortDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (iso.length > 10) {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    if (h !== "00" || m !== "00") return `${datePart} · ${h}:${m}`;
  }
  return datePart;
}

function formatMeetingTime(iso: string) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${datePart} · ${h}:${m}`;
}

function buildTimelineGroups(tasks: ColoredTask[], meetings: PlanMeeting[]): TimelineGroup[] {
  const map = new Map<string, TimelineGroup>();

  tasks.forEach((task) => {
    const key = `${toDateOnly(task.start_date)}~${toDateOnly(task.end_date)}`;
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        startLabel: formatShortDate(task.start_date),
        endLabel: formatShortDate(task.end_date),
        tasks: [],
        meetings: [],
      });
    }
    map.get(key)!.tasks.push(task);
  });

  meetings.forEach((meeting) => {
    const meetDate = meeting.datetime.slice(0, 10);
    for (const group of map.values()) {
      const [start, end] = group.dateKey.split("~");
      if (meetDate >= start && meetDate <= end) {
        group.meetings.push(meeting);
        break;
      }
    }
  });

  return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

type CalCell = {
  day: number | null;
  dateStr: string;
  colors: string[];
  isDeadline: boolean;
  hasMeeting: boolean;
};

function buildCalendarCells(
  year: number,
  month: number,
  tasks: ColoredTask[],
  meetings: PlanMeeting[],
  deadline: string
): CalCell[] {
  const firstDayJS = new Date(year, month, 1).getDay();
  const offset = (firstDayJS + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const deadlineDay = deadline.slice(0, 10);
  const meetingDates = new Set(meetings.map((m) => m.datetime.slice(0, 10)));

  const cells: CalCell[] = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ day: null, dateStr: "", colors: [], isDeadline: false, hasMeeting: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const colors: string[] = [];
    tasks.forEach((t) => {
      if (dateStr >= toDateOnly(t.start_date) && dateStr <= toDateOnly(t.end_date) && !colors.includes(t.color)) {
        colors.push(t.color);
      }
    });
    cells.push({
      day: d,
      dateStr,
      colors: colors.slice(0, 3),
      isDeadline: dateStr === deadlineDay,
      hasMeeting: meetingDates.has(dateStr),
    });
  }
  return cells;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo:  { label: "To Do",  className: "bg-blue-100 text-blue-600" },
  doing: { label: "Doing",  className: "bg-santi-primary/20 text-black/70" },
  done:  { label: "Done",   className: "bg-green-100 text-green-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function AssigneeAvatars({ ids, members }: { ids: string[]; members: PlanMember[] }) {
  const memberMap = new Map(members.map((m) => [m.user_id, m]));
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {ids.map((id) => {
        const m = memberMap.get(id);
        return (
          <div key={id} className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m?.picture_url ?? "/default-avatar.png"}
              alt={m?.display_name ?? "Member"}
              className="w-5 h-5 rounded-full object-cover bg-slate-100 shrink-0"
            />
            <span className="text-xs text-black/70 font-medium">
              {m?.display_name ?? "Unknown"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-santi-primary">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PendingDot() {
  return <div className="w-5 h-5 rounded-full border-2 border-santi-muted" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.project_id as string;
  const { profile, isReady } = useLiff();

  const [data, setData] = useState<PlanProposalResponse | null>(null);
  const [tasks, setTasks] = useState<ColoredTask[]>([]);
  const [meetings, setMeetings] = useState<PlanMeeting[]>([]);
  const [approvals, setApprovals] = useState<ApprovalMember[]>([]);
  const [approvalSummary, setApprovalSummary] = useState<ApprovalSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [calDisplayYear, setCalDisplayYear] = useState(new Date().getFullYear());
  const [calDisplayMonth, setCalDisplayMonth] = useState(new Date().getMonth());
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!projectId || !isReady) return;

    getPlanProposal(projectId).then((d) => {
      setData(d);
      setTasks(d.plan_version.tasks.map((t, i) => ({ ...t, color: getTaskColor(i) })));
      setMeetings(d.plan_version.meetings);
      const earliest = [...d.plan_version.tasks]
        .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
      if (earliest) {
        const date = new Date(earliest.start_date + "T00:00:00");
        setCalDisplayYear(date.getFullYear());
        setCalDisplayMonth(date.getMonth());
      }
    }).catch((err) => {
      console.error("Failed to load plan:", err);
      setLoadError("Failed to load plan. Please try again.");
    });

    // Fetch approval statuses
    apiFetch(`/api/v1/projects/${projectId}/approvals`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((body) => {
        setApprovals(body.approvals ?? []);
        if (body.approval_summary) setApprovalSummary(body.approval_summary);
      })
      .catch((err) => console.error("Failed to load approvals:", err));
  }, [projectId, isReady]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/approvals/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`${res.status}`);

      // Refresh approvals
      const updated = await apiFetch(`/api/v1/projects/${projectId}/approvals`);
      if (updated.ok) {
        const body = await updated.json();
        setApprovals(body.approvals ?? []);
        if (body.approval_summary) {
          setApprovalSummary(body.approval_summary);
          // Show success modal when all members have approved
          if (body.approval_summary.approved_count === body.approval_summary.total_members && body.approval_summary.total_members > 0) {
            setShowApprovedModal(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-dvh bg-santi-secondary gap-3">
          <p className="text-sm text-black/60">{loadError}</p>
          <button
            onClick={() => { setLoadError(null); window.location.reload(); }}
            className="px-4 py-2 bg-santi-primary rounded-xl text-sm font-bold"
          >
            Retry
          </button>
        </div>
      );
    }
    return <LoadingSpinner message="Loading plan..." />;
  }

  const { project, plan_version } = data;
  const timelineGroups = buildTimelineGroups(tasks, meetings);

  // Calendar
  const deadlineDate = new Date(project.deadline);
  const earliestTaskDate = tasks.length > 0
    ? new Date([...tasks].sort((a, b) => a.start_date.localeCompare(b.start_date))[0].start_date + "T00:00:00")
    : new Date();

  const minCalYear = earliestTaskDate.getFullYear();
  const minCalMonth = earliestTaskDate.getMonth();
  const maxCalYear = deadlineDate.getFullYear();
  const maxCalMonth = deadlineDate.getMonth();

  const canGoPrev = calDisplayYear > minCalYear || (calDisplayYear === minCalYear && calDisplayMonth > minCalMonth);
  const canGoNext = calDisplayYear < maxCalYear || (calDisplayYear === maxCalYear && calDisplayMonth < maxCalMonth);

  const prevCal = () => {
    if (!canGoPrev) return;
    if (calDisplayMonth === 0) { setCalDisplayYear((y) => y - 1); setCalDisplayMonth(11); }
    else setCalDisplayMonth((m) => m - 1);
  };
  const nextCal = () => {
    if (!canGoNext) return;
    if (calDisplayMonth === 11) { setCalDisplayYear((y) => y + 1); setCalDisplayMonth(0); }
    else setCalDisplayMonth((m) => m + 1);
  };

  const calCells = buildCalendarCells(calDisplayYear, calDisplayMonth, tasks, meetings, project.deadline);

  const scrollToGroup = (dateStr: string) => {
    for (const group of timelineGroups) {
      const [start, end] = group.dateKey.split("~");
      if (dateStr >= start && dateStr <= end) {
        sectionRefs.current.get(group.dateKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  };

  // Approval state
  const approvedCount = approvalSummary?.approved_count ?? approvals.filter((a) => a.approval_status === "approved").length;
  const totalMembers = approvalSummary?.total_members ?? approvals.length;
  const currentUserApproval = approvals.find((a) => a.line_user_id === profile?.userId);
  const hasApproved = currentUserApproval?.approval_status === "approved";
  const allApproved = approvedCount === totalMembers && totalMembers > 0;

  return (
    <>
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-20 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Santi</h1>
            <p className="text-sm text-black/60 mt-0.5">Project Approval</p>
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full">
            <BellIcon className="w-6 h-6 text-black" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative -mt-12 bg-white rounded-t-[48px] pt-6 px-6 pb-72 space-y-6">
        {/* Project Summary Card */}
        <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="min-w-0 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-santi-muted">Project Summary</span>
            <h2 className="text-lg font-bold text-black mt-1">{project.name || "Untitled Project"}</h2>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-santi-primary/10 text-sm font-semibold">
              Due: {formatShortDate(project.deadline)}
            </div>
          </div>
          {plan_version.ai_reasoning && (
            <div className="flex gap-2 items-start bg-santi-secondary/50 rounded-xl p-3">
              <SparklesIcon className="w-4 h-4 text-black/60 shrink-0 mt-0.5" />
              <p className="text-xs text-black/70 leading-relaxed">{plan_version.ai_reasoning}</p>
            </div>
          )}
        </section>

        {/* Calendar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-black">
              {MONTH_NAMES[calDisplayMonth]} {calDisplayYear}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={prevCal}
                disabled={!canGoPrev}
                className="p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-black/60 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={nextCal}
                disabled={!canGoNext}
                className="p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-black/60 hover:bg-slate-100 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-santi-muted py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calCells.map((cell, idx) => (
              <button
                key={idx}
                disabled={!cell.day}
                onClick={() => cell.dateStr && scrollToGroup(cell.dateStr)}
                className={`flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl min-h-[52px] disabled:cursor-default transition-colors ${
                  cell.isDeadline
                    ? "bg-santi-primary"
                    : cell.colors.length > 0
                    ? "bg-santi-secondary/40 active:bg-santi-secondary"
                    : "active:bg-slate-50"
                }`}
              >
                {cell.day !== null && (
                  <>
                    <span className={`text-sm font-semibold leading-none ${cell.isDeadline ? "text-black" : "text-black/80"}`}>
                      {cell.day}
                    </span>
                    {cell.colors.length > 0 && !cell.isDeadline && (
                      <div className="flex gap-0.5 mt-1.5">
                        {cell.colors.map((c, ci) => (
                          <span key={ci} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                    {cell.isDeadline && (
                      <span className="text-[9px] font-bold text-black/70 mt-1 leading-none">DL</span>
                    )}
                    {cell.hasMeeting && cell.colors.length === 0 && !cell.isDeadline && (
                      <div className="flex justify-center mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-santi-primary" />
                      </div>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-5">
          <h3 className="text-base font-bold text-black">Task Timeline</h3>

          {timelineGroups.map((group) => (
            <div
              key={group.dateKey}
              ref={(el: HTMLDivElement | null) => {
                if (el) sectionRefs.current.set(group.dateKey, el);
                else sectionRefs.current.delete(group.dateKey);
              }}
              className="space-y-3 scroll-mt-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-santi-primary shrink-0" />
                <span className="text-sm font-semibold text-black">
                  {group.startLabel} – {group.endLabel}
                </span>
              </div>

              {/* Task cards (read-only) */}
              {group.tasks.map((task) => {
                const expanded = expandedIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleExpanded(task.id)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex gap-3 cursor-pointer active:bg-slate-50 transition-colors"
                  >
                    <div className="w-1 rounded-full shrink-0 self-stretch" style={{ backgroundColor: task.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-black leading-snug">{task.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={task.status} />
                          <ChevronDownIcon className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                      {expanded && (
                        <>
                          {task.description && (
                            <p className="text-xs text-black/55 mt-2 leading-relaxed">{task.description}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            <CalendarDotIcon className="w-3.5 h-3.5 text-santi-muted" />
                            <span className="text-xs text-santi-muted">
                              {formatShortDate(task.start_date)} – {formatShortDate(task.end_date)}
                            </span>
                          </div>
                          <AssigneeAvatars ids={task.assigned_to} members={project.members} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Meeting cards (read-only) */}
              {group.meetings.map((meeting) => {
                const expanded = expandedIds.has(meeting.id);
                return (
                  <div
                    key={meeting.id}
                    onClick={() => toggleExpanded(meeting.id)}
                    className="bg-santi-secondary/40 border border-santi-primary/20 rounded-2xl p-4 flex gap-3 cursor-pointer active:bg-santi-secondary/60 transition-colors"
                  >
                    <div className="w-1 rounded-full shrink-0 self-stretch bg-santi-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MeetingIcon className="w-4 h-4 text-santi-primary shrink-0" />
                          <p className="font-semibold text-sm text-black leading-snug">{meeting.title}</p>
                        </div>
                        <ChevronDownIcon className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                      </div>
                      {expanded && (
                        <>
                          <div className="flex items-center gap-1 mt-2">
                            <CalendarDotIcon className="w-3.5 h-3.5 text-santi-muted" />
                            <span className="text-xs text-santi-muted">{formatMeetingTime(meeting.datetime)}</span>
                          </div>
                          <AssigneeAvatars ids={meeting.participants} members={project.members} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      </main>

      {/* Fixed Bottom Approval Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 z-40 px-6 pt-4"
           style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* Approval Progress */}
        <p className="text-sm font-bold text-black mb-3">
          {approvedCount}/{totalMembers} have approved
        </p>

        {/* Member approval list */}
        <div className="flex flex-col gap-2.5 mb-4 max-h-32 overflow-y-auto">
          {approvals.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.picture_url ?? "/default-avatar.png"}
                  alt={member.line_display_name ?? "Member"}
                  className="w-8 h-8 rounded-full object-cover bg-slate-100"
                />
                <span className="text-sm font-medium text-black">{member.line_display_name ?? "Unknown"}</span>
              </div>
              {member.approval_status === "approved" ? <CheckIcon /> : <PendingDot />}
            </div>
          ))}
        </div>

        {/* Approve / View Project Button */}
        {allApproved ? (
          <button
            onClick={() => router.push(`/info-edit/project/${projectId}`)}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-all bg-green-100 text-green-700 active:brightness-95"
          >
            View Active Project
          </button>
        ) : (
          <button
            onClick={handleApprove}
            disabled={hasApproved || submitting}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              hasApproved
                ? "bg-green-100 text-green-700 cursor-default"
                : "bg-santi-primary text-black active:brightness-95 disabled:opacity-50"
            }`}
          >
            {hasApproved ? "You have approved" : submitting ? "Approving..." : "Approve"}
          </button>
        )}
      </div>

      {/* All Approved Modal */}
      {showApprovedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-3xl p-6 mx-6 max-w-sm w-full shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-black">Project Approved!</h3>
            <p className="text-sm text-black/60">All members have approved the plan. The project is now active.</p>
            <button
              onClick={() => { setShowApprovedModal(false); router.push("/info-edit"); }}
              className="w-full py-3 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
