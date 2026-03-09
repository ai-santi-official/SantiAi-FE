"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  HomeIcon,
  TasksIcon,
  CalendarIcon,
  ProfileIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  MeetingIcon,
} from "@/components/icons";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo:  { label: "To Do",  className: "bg-slate-100 text-slate-500" },
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

// ─── Color Palette ────────────────────────────────────────────────────────────
// Colors are assigned by task order (index % palette length) — no DB storage needed.
// 16 distinct colors so cycling is less visible even with many tasks.
const TASK_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#DDA0DD", "#87CEEB", "#F4A460", "#90EE90", "#FFB6C1",
  "#6BCB77", "#FF9F1C", "#7B68EE", "#FF6EB4", "#20B2AA", "#CD853F",
];

const CARD_LIMIT = 20;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatShortDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    const key = `${task.start_date}~${task.end_date}`;
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
  const offset = (firstDayJS + 6) % 7; // Monday-first
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
      if (dateStr >= t.start_date && dateStr <= t.end_date && !colors.includes(t.color)) {
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
function AssigneeAvatars({ ids, members }: { ids: string[]; members: PlanMember[] }) {
  const memberMap = new Map(members.map((m) => [m.line_user_id, m]));
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

// ─── Page ─────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PlanProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewMode = searchParams.get("mode") === "view";
  const [data, setData] = useState<PlanProposalResponse | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  // Calendar display month — initialised to the earliest task month when data loads
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
    getPlanProposal().then((d) => {
      setData(d);
      // Jump calendar to the month of the first task, not the deadline month
      const earliest = [...d.plan_version.tasks]
        .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
      if (earliest) {
        const date = new Date(earliest.start_date + "T00:00:00");
        setCalDisplayYear(date.getFullYear());
        setCalDisplayMonth(date.getMonth());
      }
    });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-santi-secondary">
        <p className="text-sm text-black/60">Loading plan...</p>
      </div>
    );
  }

  const { project, plan_version } = data;

  const coloredTasks: ColoredTask[] = plan_version.tasks.map((task, i) => ({
    ...task,
    status: "todo" as const,
    color: getTaskColor(i),
  }));

  const timelineGroups = buildTimelineGroups(coloredTasks, plan_version.meetings);

  const totalCards = timelineGroups.reduce((sum, g) => sum + g.tasks.length + g.meetings.length, 0);
  const hiddenCount = Math.max(0, totalCards - CARD_LIMIT);

  // Slice to CARD_LIMIT cards across groups when not expanded
  const displayGroups: TimelineGroup[] = (() => {
    if (showAll || totalCards <= CARD_LIMIT) return timelineGroups;
    const result: TimelineGroup[] = [];
    let count = 0;
    for (const group of timelineGroups) {
      if (count >= CARD_LIMIT) break;
      const tasks = group.tasks.slice(0, CARD_LIMIT - count);
      count += tasks.length;
      const meetings = group.meetings.slice(0, CARD_LIMIT - count);
      count += meetings.length;
      if (tasks.length > 0 || meetings.length > 0)
        result.push({ ...group, tasks, meetings });
    }
    return result;
  })();

  const deadlineDate = new Date(project.deadline);

  // Calendar navigation bounds: earliest task month ↔ deadline month
  const earliestTaskDate = new Date(
    [...plan_version.tasks].sort((a, b) => a.start_date.localeCompare(b.start_date))[0].start_date + "T00:00:00"
  );
  const minCalYear = earliestTaskDate.getFullYear();
  const minCalMonth = earliestTaskDate.getMonth();
  const maxCalYear = deadlineDate.getFullYear();
  const maxCalMonth = deadlineDate.getMonth();

  const canGoPrev =
    calDisplayYear > minCalYear ||
    (calDisplayYear === minCalYear && calDisplayMonth > minCalMonth);
  const canGoNext =
    calDisplayYear < maxCalYear ||
    (calDisplayYear === maxCalYear && calDisplayMonth < maxCalMonth);

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

  const calCells = buildCalendarCells(
    calDisplayYear,
    calDisplayMonth,
    coloredTasks,
    plan_version.meetings,
    project.deadline
  );

  const scrollToGroup = (dateStr: string) => {
    for (const group of timelineGroups) {
      const [start, end] = group.dateKey.split("~");
      if (dateStr >= start && dateStr <= end) {
        sectionRefs.current.get(group.dateKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-20 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Santi</h1>
            <p className="text-sm text-black/60 mt-0.5">Project Plan</p>
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full">
            <BellIcon className="w-6 h-6 text-black" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="relative -mt-12 bg-white rounded-t-[48px] pt-6 px-6 pb-52 space-y-6">
        {/* Project Summary Card */}
        <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-black truncate">{project.name}</h2>
              <p className="text-sm text-santi-muted mt-0.5">
                Deadline: {formatShortDate(project.deadline)}
              </p>
            </div>
            <span className="text-xs font-semibold bg-santi-primary/20 text-black/60 px-2.5 py-1 rounded-full shrink-0">
              v{plan_version.version} · AI Draft
            </span>
          </div>
          <div className="flex gap-2 items-start bg-santi-secondary/50 rounded-xl p-3">
            <SparklesIcon className="w-4 h-4 text-black/60 shrink-0 mt-0.5" />
            <p className="text-xs text-black/70 leading-relaxed">{plan_version.ai_reasoning}</p>
          </div>
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

          {/* Day-of-week headers: Mon–Sun */}
          <div className="grid grid-cols-7 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-santi-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
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
                    <span
                      className={`text-sm font-semibold leading-none ${
                        cell.isDeadline ? "text-black" : "text-black/80"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Task color dots */}
                    {cell.colors.length > 0 && !cell.isDeadline && (
                      <div className="flex gap-0.5 mt-1.5">
                        {cell.colors.map((c, ci) => (
                          <span
                            key={ci}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Deadline label */}
                    {cell.isDeadline && (
                      <span className="text-[9px] font-bold text-black/70 mt-1 leading-none">
                        DL
                      </span>
                    )}

                    {/* Meeting dot (only when no task colors, so it's visible) */}
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

          {displayGroups.map((group) => (
            <div
              key={group.dateKey}
              ref={(el: HTMLDivElement | null) => {
                if (el) sectionRefs.current.set(group.dateKey, el);
                else sectionRefs.current.delete(group.dateKey);
              }}
              className="space-y-3 scroll-mt-4"
            >
              {/* Date range label */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-santi-primary shrink-0" />
                <span className="text-sm font-semibold text-black">
                  {group.startLabel} – {group.endLabel}
                </span>
              </div>

              {/* Task cards */}
              {group.tasks.map((task) => {
                const expanded = expandedIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleExpanded(task.id)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex gap-3 cursor-pointer active:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-1 rounded-full shrink-0 self-stretch"
                      style={{ backgroundColor: task.color }}
                    />
                    <div className="flex-1 min-w-0">
                      {/* Always-visible header row */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-black leading-snug">{task.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={task.status} />
                          <button
                            onClick={(e) => { e.stopPropagation(); console.log("edit task", task.id); }}
                            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <PencilIcon className="w-3.5 h-3.5 text-santi-muted" />
                          </button>
                          <ChevronDownIcon
                            className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${
                              expanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded details */}
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

              {/* Meeting cards */}
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
                      {/* Always-visible header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MeetingIcon className="w-4 h-4 text-santi-primary shrink-0" />
                          <p className="font-semibold text-sm text-black leading-snug">{meeting.title}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); console.log("edit meeting", meeting.id); }}
                            className="p-1 rounded-lg hover:bg-santi-secondary/60 transition-colors"
                          >
                            <PencilIcon className="w-3.5 h-3.5 text-santi-muted" />
                          </button>
                          <ChevronDownIcon
                            className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${
                              expanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded details */}
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

          {/* View more / collapse */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-black/60 hover:border-santi-primary hover:text-black transition-colors"
            >
              {showAll ? "Show less" : `View ${hiddenCount} more card${hiddenCount > 1 ? "s" : ""}`}
            </button>
          )}
        </section>
      </main>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 z-40">
        {/* Action Buttons */}
        <div className="flex gap-3 px-6 pt-3 pb-2">
          <button className="flex-1 py-3.5 rounded-santi border-2 border-santi-primary font-bold text-sm text-black bg-white active:bg-santi-secondary/30 transition-colors">
            Edit with AI
          </button>
          <button
            onClick={() => isViewMode ? router.back() : console.log("publish")}
            className="flex-1 py-3.5 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all"
          >
            {isViewMode ? "Close" : "Publish"}
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="flex items-center justify-around px-6"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <button className="flex flex-col items-center gap-0.5 text-santi-primary py-1 min-w-[48px]">
            <HomeIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-santi-muted py-1 min-w-[48px]">
            <TasksIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Tasks</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-santi-muted py-1 min-w-[48px]">
            <CalendarIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Calendar</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-santi-muted py-1 min-w-[48px]">
            <ProfileIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </>
  );
}
