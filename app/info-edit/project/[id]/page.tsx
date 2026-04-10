"use client";

import { useState, useEffect, useRef, useMemo, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiff } from "@/provider/LiffProvider";
import { DatePicker } from "@/components/ui/DatePicker";
import { SparklesIcon, CalendarDotIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, MeetingIcon, TrashIcon, PlusIcon } from "@/components/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EditTaskSheet from "@/components/onboarding/EditTaskSheet";
import EditMeetingSheet from "@/components/onboarding/EditMeetingSheet";
import VersionHistorySheet from "@/components/onboarding/VersionHistorySheet";
import type { PlanVersionSummary } from "@/components/onboarding/VersionHistorySheet";
import { getProject, updateProject, type ProjectDetail } from "@/utils/getProject";
import { apiFetch } from "@/utils/api";
import {
  getProjectTasks, getProjectMeetings, getProjectMembers,
  updateTaskStatus, updateTaskFull, updateMeetingFull,
  createTaskApi, deleteTaskApi, deleteMeetingApi,
  type ProjectTask, type ProjectMeeting,
} from "@/utils/getProjectTasksAndMeetings";
import type { PlanTask, PlanMeeting, PlanMember } from "@/utils/getPlanProposal";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// ─── Status Badge ──────────────────────────────────────────
type ProjectStatus = "draft" | "waiting_approval" | "approved" | "done";

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { key: string; className: string }> = {
  draft:            { key: "draft",            className: "bg-slate-100 text-slate-500" },
  waiting_approval: { key: "pendingApproval",  className: "bg-amber-100 text-amber-700" },
  approved:         { key: "approved",         className: "bg-green-100 text-green-700" },
  done:             { key: "done",             className: "bg-blue-100 text-blue-700" },
};

const TASK_STATUS_CONFIG: Record<string, { key: string; className: string }> = {
  todo:  { key: "todo",  className: "bg-blue-100 text-blue-600" },
  doing: { key: "doing",  className: "bg-santi-primary/20 text-black/70" },
  done:  { key: "done",   className: "bg-green-100 text-green-700" },
};

function TaskStatusBadge({ status }: { status: string }) {
  const ts = useTranslations("status");
  const cfg = TASK_STATUS_CONFIG[status] ?? TASK_STATUS_CONFIG.todo;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      {ts(cfg.key)}
    </span>
  );
}

// ─── Color palette ─────────────────────────────────────────
const TASK_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#DDA0DD", "#87CEEB", "#F4A460", "#90EE90", "#FFB6C1",
  "#6BCB77", "#FF9F1C", "#7B68EE", "#FF6EB4", "#20B2AA", "#CD853F",
];

// ─── Helpers ───────────────────────────────────────────────
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

/** Extract YYYY-MM-DD in local time (avoids UTC date mismatch). */
function localDateStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

// ─── Convert BE types → PlanTask/PlanMeeting for EditSheets ──
type ColoredTask = PlanTask & { color: string; _taskId: string };

function beTaskToPlan(t: ProjectTask, idx: number): ColoredTask {
  const dateOnly = t.due_date ? t.due_date.slice(0, 10) : "";
  return {
    id: t.task_id,
    _taskId: t.task_id,
    title: t.task_title,
    description: t.task_description,
    start_date: dateOnly,
    end_date: dateOnly,
    assigned_to: t.assignees.map((a) => a.user_id),
    status: t.task_status,
    color: TASK_COLORS[idx % TASK_COLORS.length],
  };
}

type DisplayMeeting = PlanMeeting & { _meetingId: string };

function beMeetingToPlan(m: ProjectMeeting): DisplayMeeting {
  return {
    id: m.meeting_id,
    _meetingId: m.meeting_id,
    title: m.meeting_title,
    datetime: m.meeting_time,
    duration_minutes: m.duration_minutes ?? 60,
    recurrence: m.recurrence,
    participants: m.attendees.map((a) => a.user_id),
    notes: "",
  };
}

// ─── Calendar cells ────────────────────────────────────────
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
  meetings: DisplayMeeting[],
  deadline: string
): CalCell[] {
  const firstDayJS = new Date(year, month, 1).getDay();
  const offset = (firstDayJS + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const deadlineDay = deadline.slice(0, 10);
  const meetingDates = new Set(meetings.map((m) => localDateStr(m.datetime)));

  const cells: CalCell[] = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ day: null, dateStr: "", colors: [], isDeadline: false, hasMeeting: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const colors: string[] = [];
    tasks.forEach((t) => {
      if (t.start_date && t.end_date && dateStr >= t.start_date && dateStr <= t.end_date && !colors.includes(t.color)) {
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

// ─── Timeline grouping ────────────────────────────────────
type TimelineGroup = {
  dateKey: string;
  label: string;
  tasks: ColoredTask[];
  meetings: DisplayMeeting[];
};

function buildTimelineGroups(tasks: ColoredTask[], meetings: DisplayMeeting[]): TimelineGroup[] {
  const map = new Map<string, TimelineGroup>();

  // Group tasks by due_date (single date, not range for materialized tasks)
  tasks.forEach((task) => {
    const key = task.start_date || "no-date";
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        label: key === "no-date" ? "__NO_DATE__" : formatShortDate(key),
        tasks: [],
        meetings: [],
      });
    }
    map.get(key)!.tasks.push(task);
  });

  // Group meetings by date
  meetings.forEach((meeting) => {
    const key = localDateStr(meeting.datetime);
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        label: formatShortDate(key),
        tasks: [],
        meetings: [],
      });
    }
    map.get(key)!.meetings.push(meeting);
  });

  return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

// ─── Assignee avatars ──────────────────────────────────────
function AssigneeAvatars({ ids, members }: { ids: string[]; members: PlanMember[] }) {
  const tc = useTranslations("common");
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
              alt={m?.display_name ?? tc("member")}
              className="w-5 h-5 rounded-full object-cover bg-slate-100 shrink-0"
            />
            <span className="text-xs text-black/70 font-medium">
              {m?.display_name ?? tc("unknown")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────
function BackArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
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

// ─── Section Toggle ────────────────────────────────────────
function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2">
      <h3 className="text-base font-bold text-black">{label}</h3>
      <ChevronDownIcon className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════
export default function ProjectInfoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Suspense><ProjectInfoEditContent params={params} /></Suspense>;
}

function ProjectInfoEditContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const { isReady, profile } = useLiff();
  const t = useTranslations("infoEdit");
  const tc = useTranslations("common");
  const td = useTranslations("confirmDialog");
  const tl = useTranslations("loading");
  const tb = useTranslations("brand");
  const tp = useTranslations("planProposal");
  const tdp = useTranslations("datePicker");
  const ts = useTranslations("status");
  const te = useTranslations("errors");

  // ── Data state ──
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<ColoredTask[]>([]);
  const [rawTaskData, setRawTaskData] = useState<ProjectTask[]>([]);
  const [meetings, setMeetings] = useState<DisplayMeeting[]>([]);
  const [members, setMembers] = useState<PlanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Form state (project metadata) ──
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [detail, setDetail] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "save" | "delete" | "close" | null>(null);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── UI state ──
  const [showDetails, setShowDetails] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ type: "task" | "meeting"; id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "task" | "meeting"; id: string } | null>(null);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [markDoneTaskId, setMarkDoneTaskId] = useState<string | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(0);
  const [calDisplayYear, setCalDisplayYear] = useState(new Date().getFullYear());
  const [calDisplayMonth, setCalDisplayMonth] = useState(new Date().getMonth());
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Load data ──
  const loadData = () => {
    setLoading(true);
    Promise.all([
      getProject(id),
      getProjectTasks(id),
      getProjectMeetings(id),
      getProjectMembers(id),
      apiFetch(`/api/v1/projects/${id}/plan-versions`).then((r) => r.json()).then((d) => d.versions ?? []).catch(() => []),
    ])
      .then(([proj, rawTasks, rawMeetings, mems, versions]) => {
        setProject(proj);
        setName(proj.project_name ?? "");
        setDeadline(proj.final_due_date ? proj.final_due_date.slice(0, 10) : "");
        setDetail(proj.project_detail ?? "");
        setDeliverables(proj.final_deliverable ?? "");

        const coloredTasks = rawTasks.map((t, i) => beTaskToPlan(t, i));
        setTasks(coloredTasks);
        setRawTaskData(rawTasks);
        setMeetings(rawMeetings.map(beMeetingToPlan));
        setMembers(mems);

        // Current version = highest version number
        if (versions.length > 0) {
          setCurrentVersionNumber(Math.max(...versions.map((v: PlanVersionSummary) => v.version_number)));
        }

        // Init calendar to earliest task/meeting date
        const allDates = [
          ...coloredTasks.map((t) => t.start_date).filter(Boolean),
          ...rawMeetings.map((m) => localDateStr(m.meeting_time)),
        ].sort();
        if (allDates.length > 0) {
          const d = new Date(allDates[0] + "T00:00:00");
          setCalDisplayYear(d.getFullYear());
          setCalDisplayMonth(d.getMonth());
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isReady) loadData(); }, [id, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle markDone query param from LINE reminder button
  const markDoneHandled = useRef(false);
  useEffect(() => {
    if (markDoneHandled.current) return;
    const taskId = searchParams.get("markDone");
    if (taskId && tasks.length > 0) {
      markDoneHandled.current = true;
      setMarkDoneTaskId(taskId);
    }
  }, [searchParams, tasks]);

  const toggleExpanded = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  // BE creates a snapshot after each mutation; bump local version to stay in sync
  const bumpVersion = () => setCurrentVersionNumber((v) => v + 1);

  // ── Task status change ──
  const applyTaskStatus = async (taskId: string, status: "todo" | "doing" | "done") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    setRawTaskData((prev) => prev.map((t) => t.task_id === taskId ? { ...t, task_status: status } : t));
    try {
      await updateTaskStatus(taskId, status);
      bumpVersion();
    } catch (err) {
      console.error("Failed to update task status:", err);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
      setRawTaskData((prev) => prev.map((t) => t.task_id === taskId ? { ...t, task_status: task.status } : t));
    }
  };

  // ── Edit task via sheet ──
  const handleSaveTask = async (updated: PlanTask) => {
    setEditingItem(null);
    setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
    try {
      await updateTaskFull(updated.id, {
        title: updated.title,
        description: updated.description,
        status: updated.status,
        due_date: updated.end_date || null,
        assignee_user_ids: updated.assigned_to,
      });
      bumpVersion();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  // ── Edit meeting via sheet ──
  const handleSaveMeeting = async (updated: PlanMeeting) => {
    setEditingItem(null);
    setMeetings((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
    try {
      const dt = new Date(updated.datetime);
      const date = localDateStr(updated.datetime);
      const startH = dt.getHours().toString().padStart(2, "0");
      const startM = dt.getMinutes().toString().padStart(2, "0");
      const endTotal = dt.getHours() * 60 + dt.getMinutes() + (updated.duration_minutes ?? 60);
      const endH = Math.floor(endTotal / 60).toString().padStart(2, "0");
      const endM = (endTotal % 60).toString().padStart(2, "0");

      await updateMeetingFull(updated.id, {
        meeting_title: updated.title,
        date,
        start_time: `${startH}:${startM}`,
        end_time: `${endH}:${endM}`,
        recurrence: updated.recurrence,
        attendee_user_ids: updated.participants,
      });
      bumpVersion();
    } catch (err) {
      console.error("Failed to update meeting:", err);
    }
  };

  // ── Create task via CRUD API ──
  const handleCreateTask = async (newTask: PlanTask) => {
    setShowCreateTask(false);
    try {
      const created = await createTaskApi(id, {
        title: newTask.title,
        description: newTask.description,
        due_date: newTask.end_date || undefined,
        assignee_user_ids: newTask.assigned_to,
      });
      setTasks((prev) => [...prev, beTaskToPlan(created, prev.length)]);
      bumpVersion();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  // ── Delete task/meeting via CRUD API ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { type, id: targetId } = deleteTarget;
    setDeleteTarget(null);
    setExpandedIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });

    if (type === "task") {
      setTasks((prev) => prev.filter((t) => t.id !== targetId));
      try { await deleteTaskApi(targetId); bumpVersion(); } catch (err) { console.error("Failed to delete task:", err); }
    } else {
      setMeetings((prev) => prev.filter((m) => m.id !== targetId));
      try { await deleteMeetingApi(targetId); bumpVersion(); } catch (err) { console.error("Failed to delete meeting:", err); }
    }
  };

  // ── Version history revert ──
  // VersionHistorySheet already calls the revert API; we just need to close & reload
  const handleVersionRevert = (_versionId: string) => {
    setShowVersionHistory(false);
    loadData();
  };

  // ── Permissions ──
  // Resolve the current user's internal user_id from their LINE profile
  const currentUserId = members.find((m) => m.line_user_id === profile?.userId)?.user_id ?? null;
  const isCreator = !!(currentUserId && project?.created_by_user_id === currentUserId);

  /** True if the current user may edit/delete this task (creator can edit all; assignees can edit their own). */
  const canEditTask = (task: ColoredTask) => {
    if (isCreator) return true;
    return !!(currentUserId && task.assigned_to.includes(currentUserId));
  };

  /** True if the current user may edit/delete this meeting (creator only). */
  const canEditMeeting = () => isCreator;

  /** True if the current user is a member of this project. Non-members can only view. */
  const isMember = !!currentUserId;

  /** Project is complete — read-only mode. */
  const isDone = project?.project_status === "done";

  /** Tasks that are not yet done — shown as warning when closing. */
  const unfinishedTasks = rawTaskData.filter((t) => t.task_status !== "done");

  /** Can edit = is a member and project is not done. */
  const canEdit = isMember && !isDone;

  // ── Awards (only computed for done projects) ──
  type Award = { emoji: string; titleKey: string; userId: string; statKey: string; statValue: string };
  const awards: Award[] = useMemo(() => {
    if (!isDone || rawTaskData.length === 0) return [];

    const memberStats: Record<string, { done: number; total: number; totalDays: number; onTime: number }> = {};
    for (const t of rawTaskData) {
      for (const a of t.assignees) {
        if (!memberStats[a.user_id]) memberStats[a.user_id] = { done: 0, total: 0, totalDays: 0, onTime: 0 };
        memberStats[a.user_id].total++;
        if (t.task_status === "done") {
          memberStats[a.user_id].done++;
          if (t.finished_at && t.created_at) {
            const days = (new Date(t.finished_at).getTime() - new Date(t.created_at).getTime()) / 86400000;
            memberStats[a.user_id].totalDays += Math.max(0, days);
          }
          if (t.finished_at && t.due_date) {
            if (new Date(t.finished_at) <= new Date(t.due_date + "T23:59:59")) {
              memberStats[a.user_id].onTime++;
            }
          }
        }
      }
    }

    const entries = Object.entries(memberStats);
    if (entries.length === 0) return [];

    const result: Award[] = [];

    // ⚡ Speed Star — fastest avg completion
    const withAvg = entries.filter(([, s]) => s.done > 0).map(([id, s]) => ({ id, avg: s.totalDays / s.done }));
    if (withAvg.length > 0) {
      const fastest = withAvg.sort((a, b) => a.avg - b.avg)[0];
      result.push({ emoji: "⚡", titleKey: "speedStar", userId: fastest.id, statKey: "avgDaysPerTask", statValue: fastest.avg.toFixed(1) });
    }

    // 🏆 MVP — most tasks completed
    const byDone = entries.filter(([, s]) => s.done > 0).sort((a, b) => b[1].done - a[1].done);
    if (byDone.length > 0) {
      result.push({ emoji: "🏆", titleKey: "mvp", userId: byDone[0][0], statKey: "tasksCompleted", statValue: String(byDone[0][1].done) });
    }

    // 🎯 On-Time King — highest on-time %
    const withOnTime = entries.filter(([, s]) => s.done > 0).map(([id, s]) => ({ id, pct: (s.onTime / s.done) * 100 }));
    if (withOnTime.length > 0) {
      const best = withOnTime.sort((a, b) => b.pct - a.pct)[0];
      result.push({ emoji: "🎯", titleKey: "onTimeKing", userId: best.id, statKey: "onTimeRate", statValue: `${Math.round(best.pct)}%` });
    }

    // 🔥 Early Bird — most tasks finished early
    const earlyCount: Record<string, number> = {};
    for (const t of rawTaskData) {
      if (t.task_status === "done" && t.finished_at && t.due_date) {
        const daysEarly = (new Date(t.due_date + "T23:59:59").getTime() - new Date(t.finished_at).getTime()) / 86400000;
        if (daysEarly > 0) {
          for (const a of t.assignees) {
            earlyCount[a.user_id] = (earlyCount[a.user_id] ?? 0) + 1;
          }
        }
      }
    }
    const earlyEntries = Object.entries(earlyCount).sort((a, b) => b[1] - a[1]);
    if (earlyEntries.length > 0) {
      result.push({ emoji: "🔥", titleKey: "earlyBird", userId: earlyEntries[0][0], statKey: "tasksEarly", statValue: String(earlyEntries[0][1]) });
    }

    // 💪 Workhorse — most tasks assigned
    const byTotal = [...entries].sort((a, b) => b[1].total - a[1].total);
    if (byTotal.length > 0) {
      result.push({ emoji: "💪", titleKey: "workhorse", userId: byTotal[0][0], statKey: "tasksAssigned", statValue: String(byTotal[0][1].total) });
    }

    return result;
  }, [isDone, rawTaskData]);

  const tr = useTranslations("recap");

  // ── Save project metadata ──
  const origDeadline = project?.final_due_date ? project.final_due_date.slice(0, 10) : "";
  const isDirty = project ? (
    name !== (project.project_name ?? "") ||
    deadline !== origDeadline ||
    detail !== (project.project_detail ?? "") ||
    deliverables !== (project.final_deliverable ?? "")
  ) : false;

  const canSave = name.trim() !== "" && !saving;

  const handleBackClick = () => {
    if (isDirty) setConfirm("discard");
    else router.back();
  };

  const handleSaveClick = () => setConfirm("save");

  const handleConfirm = async () => {
    if (confirm === "save") {
      setSaving(true);
      try {
        const updated = await updateProject(id, {
          project_name: name,
          final_due_date: deadline || undefined,
          project_detail: detail || undefined,
          final_deliverable: deliverables || undefined,
        });
        setProject(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Failed to save project:", err);
      } finally {
        setSaving(false);
      }
    } else if (confirm === "discard") {
      router.back();
    }
    setConfirm(null);
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      router.replace("/info-edit");
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const handleCloseProject = async () => {
    setClosing(true);
    try {
      const updated = await updateProject(id, { project_status: "done" });
      setProject(updated);
      setConfirm(null);
    } catch (err) {
      console.error("Failed to close project:", err);
    } finally {
      setClosing(false);
    }
  };

  // ── Loading / Error ──
  if (loading) {
    return <LoadingSpinner message={tl("project")} />;
  }

  if (error || !project) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center gap-4 px-6">
        <p className="text-santi-muted font-medium">{error ?? te("projectNotFound")}</p>
        <button onClick={() => router.back()} className="text-santi-primary font-semibold underline">
          {tc("goBack")}
        </button>
      </div>
    );
  }

  // ── Calendar ──
  const deadlineStr = project.final_due_date ?? "";
  const timelineGroups = buildTimelineGroups(tasks, meetings);
  const calCells = buildCalendarCells(calDisplayYear, calDisplayMonth, tasks, meetings, deadlineStr);

  // Calendar nav bounds
  const allDates = [
    ...tasks.map((t) => t.start_date).filter(Boolean),
    ...meetings.map((m) => localDateStr(m.datetime)),
    deadlineStr.slice(0, 10),
  ].filter(Boolean).sort();
  const minDate = allDates[0] ?? new Date().toISOString().slice(0, 10);
  const maxDate = allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const minCalYear = new Date(minDate + "T00:00:00").getFullYear();
  const minCalMonth = new Date(minDate + "T00:00:00").getMonth();
  const maxCalYear = new Date(maxDate + "T00:00:00").getFullYear();
  const maxCalMonth = new Date(maxDate + "T00:00:00").getMonth();

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

  const scrollToGroup = (dateStr: string) => {
    for (const group of timelineGroups) {
      if (group.dateKey === dateStr) {
        sectionRefs.current.get(group.dateKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  };

  const statusCfg = PROJECT_STATUS_CONFIG[project.project_status];
  const hasTasks = tasks.length > 0 || meetings.length > 0;

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-16 px-6">
        <div className="flex items-center justify-between">
          <button onClick={handleBackClick} aria-label={tc("goBack")} className="p-1 text-black">
            <BackArrowIcon />
          </button>
          <h1 className="text-lg font-bold text-black">{tb("name")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {!isDone && (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/60 text-black text-xs font-semibold active:bg-white/80 transition-colors"
                aria-label={tp("history")}
              >
                <HistoryIcon />
                {tp("history")}
              </button>
            )}
            <button
              onClick={() => router.push("/info-edit")}
              aria-label={tc("close")}
              className="p-1.5 rounded-full bg-white/60 text-black active:bg-white/80 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative -mt-8 bg-white rounded-t-[48px] pt-8 px-6 pb-6 space-y-6 flex-1">

        {/* Project badge */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex w-12 h-12 items-center justify-center rounded-xl bg-santi-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-santi-primary">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-santi-muted font-semibold uppercase tracking-wider">Project</p>
            <p className="font-bold text-black">{project.project_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${statusCfg.className}`}>
                {ts(statusCfg.key)}
              </span>
              {(() => {
                const creator = members.find((m) => m.user_id === project.created_by_user_id);
                if (!creator) return null;
                return (
                  <div className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={creator.picture_url ?? "/default-avatar.png"}
                      alt={creator.display_name ?? "Creator"}
                      className="w-4 h-4 rounded-full object-cover bg-slate-100"
                    />
                    <span className="text-[10px] text-santi-muted font-medium">
                      Created by {creator.display_name ?? "Unknown"}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Awards (done projects only) ── */}
        {isDone && awards.length > 0 && (
          <section className="bg-gradient-to-br from-santi-secondary/60 to-santi-primary/20 rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-black">{tr("projectComplete")}</h3>
              <div className="flex items-center justify-center gap-3 mt-1 text-sm text-black/60">
                <span>{tr("tasksDone", { done: rawTaskData.filter((t) => t.task_status === "done").length, total: rawTaskData.length })}</span>
                <span>·</span>
                <span>{tr("meetingsHeld", { count: meetings.length })}</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {awards.map((award) => {
                const member = members.find((m) => m.user_id === award.userId);
                return (
                  <div key={award.titleKey} className="flex items-center gap-3 bg-white/70 rounded-xl px-3.5 py-2.5">
                    <span className="text-2xl shrink-0">{award.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black">{tr(award.titleKey as any)}</p>
                      <p className="text-xs text-black/50">{tr(award.statKey as any, { value: award.statValue })}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={member?.picture_url ?? "/default-avatar.png"}
                        alt={member?.display_name ?? ""}
                        className="w-6 h-6 rounded-full object-cover bg-slate-100"
                      />
                      <span className="text-xs font-semibold text-black/70 max-w-[80px] truncate">
                        {member?.display_name ?? tc("unknown")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Project Details (collapsible, read-only) ── */}
        <SectionToggle label={t("projectDetails")} open={showDetails} onToggle={() => setShowDetails((v) => !v)} />

        {showDetails && (
          <div className="space-y-4">
            {/* Project Name */}
            <div className="flex flex-col gap-2">
              <label className="santi-label">{t("projectName")}</label>
              <input
                className="santi-input"
                value={name}
                readOnly
              />
            </div>

            {/* Deadline */}
            <div className="flex flex-col gap-2">
              <label className="santi-label">{t("projectDeadline")}</label>
              <DatePicker value={deadline} onChange={() => {}} />
            </div>

            {/* Project Detail */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-santi-primary" />
                <label className="santi-label">{t("projectDetail")}</label>
              </div>
              <textarea
                className="santi-textarea"
                rows={4}
                value={detail}
                readOnly
              />
            </div>

            {/* Final Deliverables */}
            <div className="flex flex-col gap-2">
              <label className="santi-label">{t("finalDeliverables")}</label>
              <input
                className="santi-input"
                value={deliverables}
                readOnly
              />
            </div>
          </div>
        )}

        {/* ── Calendar ── */}
        {hasTasks && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-black">
                {tdp(`months.${MONTH_KEYS[calDisplayMonth]}`)} {calDisplayYear}
              </h3>
              <div className="flex gap-1">
                <button onClick={prevCal} disabled={!canGoPrev} className="p-1.5 rounded-lg disabled:opacity-30 text-black/60 hover:bg-slate-100 transition-colors">
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button onClick={nextCal} disabled={!canGoNext} className="p-1.5 rounded-lg disabled:opacity-30 text-black/60 hover:bg-slate-100 transition-colors">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-santi-muted py-1">{d}</div>
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
        )}

        {/* ── Task Timeline ── */}
        {hasTasks && (
          <section className="space-y-5">
            <h3 className="text-base font-bold text-black">Tasks & Meetings</h3>

            {timelineGroups.map((group) => (
              <div
                key={group.dateKey}
                ref={(el: HTMLDivElement | null) => {
                  if (el) sectionRefs.current.set(group.dateKey, el);
                  else sectionRefs.current.delete(group.dateKey);
                }}
                className="space-y-3 scroll-mt-4"
              >
                {/* Date label */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-santi-primary shrink-0" />
                  <span className="text-sm font-semibold text-black">{group.label}</span>
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
                      <div className="w-1 rounded-full shrink-0 self-stretch" style={{ backgroundColor: task.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-black leading-snug">{task.title}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative">
                              {canEdit ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === task.id ? null : task.id); }}
                                className="rounded-full active:scale-95 transition-transform"
                              >
                                <TaskStatusBadge status={task.status} />
                              </button>
                              ) : (
                                <TaskStatusBadge status={task.status} />
                              )}
                              {canEdit && statusDropdownId === task.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setStatusDropdownId(null); }} />
                                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-100 py-1 min-w-[120px]">
                                    {(["todo", "doing", "done"] as const).map((s) => (
                                      <button
                                        key={s}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setStatusDropdownId(null);
                                          if (s === task.status) return;
                                          if (s === "done") { setMarkDoneTaskId(task.id); return; }
                                          applyTaskStatus(task.id, s);
                                        }}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm hover:bg-slate-50 ${s === task.status ? "font-bold" : ""}`}
                                      >
                                        <TaskStatusBadge status={s} />
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                            {canEdit && canEditTask(task) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingItem({ type: "task", id: task.id }); }}
                                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <PencilIcon className="w-3.5 h-3.5 text-santi-muted" />
                              </button>
                            )}
                            <ChevronDownIcon className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        {expanded && (
                          <>
                            {task.description && (
                              <p className="text-xs text-black/55 mt-2 leading-relaxed">{task.description}</p>
                            )}
                            {task.start_date && (
                              <div className="flex items-center gap-1 mt-2">
                                <CalendarDotIcon className="w-3.5 h-3.5 text-santi-muted" />
                                <span className="text-xs text-santi-muted">
                                  {task.start_date === task.end_date
                                    ? formatShortDate(task.start_date)
                                    : `${formatShortDate(task.start_date)} – ${formatShortDate(task.end_date)}`}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <AssigneeAvatars ids={task.assigned_to} members={members} />
                              {canEdit && canEditTask(task) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "task", id: task.id }); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-400" />
                                </button>
                              )}
                            </div>
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MeetingIcon className="w-4 h-4 text-santi-primary shrink-0" />
                            <p className="font-semibold text-sm text-black leading-snug">{meeting.title}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {canEdit && canEditMeeting() && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingItem({ type: "meeting", id: meeting.id }); }}
                                className="p-1 rounded-lg hover:bg-santi-secondary/60 transition-colors"
                              >
                                <PencilIcon className="w-3.5 h-3.5 text-santi-muted" />
                              </button>
                            )}
                            <ChevronDownIcon className={`w-4 h-4 text-santi-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        {expanded && (
                          <>
                            <div className="flex items-center gap-1 mt-2">
                              <CalendarDotIcon className="w-3.5 h-3.5 text-santi-muted" />
                              <span className="text-xs text-santi-muted">{formatMeetingTime(meeting.datetime)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <AssigneeAvatars ids={meeting.participants} members={members} />
                              {canEdit && canEditMeeting() && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "meeting", id: meeting.id }); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-400" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {!hasTasks && (
              <p className="text-sm text-santi-muted text-center py-4">No tasks or meetings yet.</p>
            )}

            {/* Create Task */}
            {canEdit && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-santi-primary/40 text-sm font-semibold text-black/60 hover:border-santi-primary hover:text-black transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                {tp("createTask")}
              </button>
            )}
          </section>
        )}

        {/* Create Task button when no tasks exist yet */}
        {!hasTasks && canEdit && (
          <button
            onClick={() => setShowCreateTask(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-santi-primary/40 text-sm font-semibold text-black/60 hover:border-santi-primary hover:text-black transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            {tp("createTask")}
          </button>
        )}
      </main>

      {/* Spacer for fixed footer */}
      <div className="h-36" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-santi-muted/10 z-30">
        <div className="max-w-md mx-auto">
          {/* Save bar — only when dirty (editable projects only) */}
          {canEdit && isDirty && (
            <div className="px-6 pt-3">
              <button
                onClick={handleSaveClick}
                disabled={!canSave}
                className="w-full bg-santi-primary py-3 rounded-santi font-bold text-sm text-black active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <SaveIcon />
                {saving ? tl("saving") : saved ? tl("saved") : tc("saveChanges")}
              </button>
            </div>
          )}

          {/* Delete draft button */}
          {isCreator && project.project_status === "draft" && (
            <div className="px-6 pt-3">
              <button
                onClick={() => setConfirm("delete")}
                disabled={deleting}
                className="w-full py-3 rounded-santi border-2 border-red-400 font-bold text-sm text-red-500 bg-white active:bg-red-50 transition-colors disabled:opacity-40"
              >
                {tc("delete")}
              </button>
            </div>
          )}

          {/* Close Project button — creator only, approved projects */}
          {isCreator && project.project_status === "approved" && (
            <div className="px-6 pt-3">
              <button
                onClick={() => setConfirm("close")}
                disabled={closing}
                className="w-full py-3 rounded-santi bg-green-500 font-bold text-sm text-white active:brightness-95 transition-all disabled:opacity-40"
              >
                {tp("closeProject")}
              </button>
            </div>
          )}

          {/* Edit with AI + Close */}
          <div className="flex gap-3 px-6 pt-3 pb-2">
            {canEdit && (
              <button
                onClick={() => router.push(`/info-edit/project/${id}/edit-with-ai`)}
                className="flex-1 py-3.5 rounded-santi border-2 border-santi-primary font-bold text-sm text-black bg-white active:bg-santi-secondary/30 transition-colors"
              >
                {tp("editWithAi")}
              </button>
            )}
            <button
              onClick={() => router.push("/info-edit")}
              className={`flex-1 py-3.5 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all`}
            >
              {tc("close")}
            </button>
          </div>

          <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </div>

      {/* Edit Sheets */}
      {editingItem?.type === "task" && (() => {
        const task = tasks.find((t) => t.id === editingItem.id);
        return task ? (
          <EditTaskSheet
            task={task}
            members={members}
            showStatus
            maxDate={deadlineStr}
            onSave={handleSaveTask}
            onClose={() => setEditingItem(null)}
          />
        ) : null;
      })()}
      {editingItem?.type === "meeting" && (() => {
        const meeting = meetings.find((m) => m.id === editingItem.id);
        return meeting ? (
          <EditMeetingSheet
            meeting={meeting}
            members={members}
            maxDate={deadlineStr}
            onSave={handleSaveMeeting}
            onClose={() => setEditingItem(null)}
          />
        ) : null;
      })()}

      {/* Confirm dialogs */}
      {confirm === "discard" && (
        <ConfirmDialog
          title={td("discardChanges")}
          message={td("unsavedLeave")}
          confirmLabel={tc("discard")}
          cancelLabel={tc("keepEditing")}
          confirmClassName="bg-red-500 text-white"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "save" && (
        <ConfirmDialog
          title={td("saveChanges")}
          message={td("saveProjectConfirm")}
          confirmLabel={tc("save")}
          cancelLabel={tc("keepEditing")}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <ConfirmDialog
          title={td("deleteProject")}
          message={td("deleteProjectMessage")}
          confirmLabel={tc("delete")}
          cancelLabel={tc("cancel")}
          confirmClassName="bg-red-500 text-white"
          onConfirm={handleDeleteProject}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "close" && (
        <ConfirmDialog
          title={td("closeProject")}
          message={td("closeProjectMessage")}
          confirmLabel={tc("confirm")}
          cancelLabel={tc("cancel")}
          onConfirm={handleCloseProject}
          onCancel={() => setConfirm(null)}
        >
          {unfinishedTasks.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700">
                {td("closeProjectWarning", { count: unfinishedTasks.length })}
              </p>
              <ul className="space-y-1">
                {unfinishedTasks.map((t) => (
                  <li key={t.task_id} className="text-xs text-amber-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {t.task_title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* Create Task Sheet */}
      {showCreateTask && (
        <EditTaskSheet
          task={{
            id: `task-${Date.now()}`,
            title: "",
            description: "",
            start_date: "",
            end_date: "",
            assigned_to: [],
            status: "todo",
          }}
          members={members}
          maxDate={deadlineStr}
          onSave={handleCreateTask}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title={deleteTarget.type === "task" ? "Delete task?" : "Delete meeting?"}
          message={deleteTarget.type === "task"
            ? "This task will be permanently removed. This action cannot be undone."
            : "This meeting will be permanently removed. This action cannot be undone."}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmClassName="bg-red-500 text-white"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Version History */}
      {showVersionHistory && (
        <VersionHistorySheet
          projectId={id}
          currentVersionNumber={currentVersionNumber}
          revertAction="revert-approved"
          onPreview={() => {}}
          onRevert={handleVersionRevert}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Mark as Done Confirmation */}
      {markDoneTaskId && (
        <ConfirmDialog
          title="Mark as done?"
          message={`Are you sure you want to mark "${tasks.find((t) => t.id === markDoneTaskId)?.title ?? "this task"}" as done?`}
          confirmLabel="Done"
          cancelLabel="Cancel"
          onConfirm={() => {
            applyTaskStatus(markDoneTaskId, "done");
            setMarkDoneTaskId(null);
          }}
          onCancel={() => setMarkDoneTaskId(null)}
        />
      )}
    </div>
  );
}
