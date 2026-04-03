"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPlanProposal,
  type PlanProposalResponse,
  type PlanTask,
  type PlanMeeting,
  type PlanMember,
} from "@/utils/getPlanProposal";
import {
  SparklesIcon,
  CalendarDotIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  MeetingIcon,
  TrashIcon,
  PlusIcon,
} from "@/components/icons";
import EditTaskSheet from "@/components/onboarding/EditTaskSheet";
import EditMeetingSheet from "@/components/onboarding/EditMeetingSheet";
import VersionHistorySheet, { type PlanVersionSummary } from "@/components/onboarding/VersionHistorySheet";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { apiFetch } from "@/utils/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_KEYS: Record<string, { key: string; className: string }> = {
  todo:  { key: "todo",  className: "bg-blue-100 text-blue-600" },
  doing: { key: "doing",  className: "bg-santi-primary/20 text-black/70" },
  done:  { key: "done",   className: "bg-green-100 text-green-700" },
};

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  const cfg = STATUS_KEYS[status] ?? STATUS_KEYS.todo;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      {t(cfg.key as any)}
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
/** Extract "YYYY-MM-DD" from a date string (ISO or date-only). */
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

// ─── Page ─────────────────────────────────────────────────────────────────────
const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

type EditingItem =
  | { type: "task"; id: string }
  | { type: "meeting"; id: string }
  | null;

function buildSnapshot(tasks: ColoredTask[], meetings: PlanMeeting[], aiReasoning?: string) {
  return {
    ai_reasoning: aiReasoning ?? "",
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      start_date: t.start_date,
      end_date: t.end_date,
      assigned_to: t.assigned_to,
      status: t.status,
    })),
    meetings: meetings.map((m) => ({
      id: m.id,
      title: m.title,
      datetime: m.datetime,
      duration_minutes: m.duration_minutes,
      recurrence: m.recurrence,
      participants: m.participants,
      notes: m.notes,
    })),
  };
}

export default function PlanProposalPage() {
  return <Suspense><PlanProposalContent /></Suspense>;
}

function PlanProposalContent() {
  const t = useTranslations("planProposal");
  const tc = useTranslations("common");
  const td = useTranslations("confirmDialog");
  const tl = useTranslations("loading");
  const tb = useTranslations("brand");
  const tdp = useTranslations("datePicker");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewMode = searchParams.get("mode") === "view";
  const [data, setData] = useState<PlanProposalResponse | null>(null);
  const [tasks, setTasks] = useState<ColoredTask[]>([]);
  const [meetings, setMeetings] = useState<PlanMeeting[]>([]);
  const [editingItem, setEditingItem] = useState<EditingItem>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<PlanVersionSummary | null>(null);
  const [savedTasks, setSavedTasks] = useState<ColoredTask[]>([]);
  const [savedMeetings, setSavedMeetings] = useState<PlanMeeting[]>([]);
  const [revertTarget, setRevertTarget] = useState<PlanVersionSummary | null>(null);
  const [reverting, setReverting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublished, setShowPublished] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [loadError, setLoadError] = useState(false);
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

  const STATUS_CYCLE: PlanTask["status"][] = ["todo", "doing", "done"];

  const cycleTaskStatus = (taskId: string) => {
    const next = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length];
      return { ...t, status: nextStatus };
    });
    setTasks(next);
    savePlanVersion(next, meetings);
  };

  const savePlanVersion = async (nextTasks: ColoredTask[], nextMeetings: PlanMeeting[]) => {
    if (!projectId) return;
    try {
      const snapshot = buildSnapshot(nextTasks, nextMeetings, data?.plan_version.ai_reasoning);
      const res = await apiFetch(`/api/v1/ai/plans/projects/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ change_type: "manual_edit", snapshot }),
      });
      if (res.ok) {
        const result = await res.json();
        // Update version metadata without resetting task/meeting state
        if (result.plan_version && data) {
          setData({
            ...data,
            plan_version: {
              ...data.plan_version,
              id: result.plan_version.plan_version_id,
              version: result.plan_version.version_number,
            },
          });
        }
      }
    } catch (err) {
      console.error("Failed to save plan version:", err);
    }
  };

  const handleSaveTask = (updated: PlanTask) => {
    const next = tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
    setTasks(next);
    setEditingItem(null);
    savePlanVersion(next, meetings);
  };

  const handleSaveMeeting = (updated: PlanMeeting) => {
    const next = meetings.map((m) => (m.id === updated.id ? updated : m));
    setMeetings(next);
    setEditingItem(null);
    savePlanVersion(tasks, next);
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const handleDeleteTask = (taskId: string) => {
    const next = tasks.filter((t) => t.id !== taskId);
    setTasks(next);
    setDeleteTarget(null);
    setExpandedIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
    savePlanVersion(next, meetings);
  };

  const handleCreateTask = (newTask: PlanTask) => {
    const colored: ColoredTask = { ...newTask, color: getTaskColor(tasks.length) };
    const next = [...tasks, colored];
    setTasks(next);
    setShowCreateTask(false);
    savePlanVersion(next, meetings);
  };

  const projectId = searchParams.get("project_id");

  const handlePublish = async () => {
    if (!projectId || !data) return;
    setPublishing(true);
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}/publish`, {
        method: "POST",
        body: JSON.stringify({ plan_version_id: data.plan_version.id }),
      });
      if (!res.ok) throw new Error(`Failed to publish: ${res.status}`);
      setShowPublished(true);
    } catch (err) {
      console.error("Failed to publish project:", err);
    } finally {
      setPublishing(false);
    }
  };

  const loadPlan = (id: string) => {
    getPlanProposal(id)
      .then((d) => {
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
      })
      .catch(() => {
        setLoadError(true);
      });
  };

  const normalizeSnapshot = (snapshot: any): { tasks: PlanTask[]; meetings: PlanMeeting[]; ai_reasoning: string } => {
    const rawTasks: any[] = snapshot?.tasks ?? [];
    const rawMeetings: any[] = snapshot?.meetings ?? [];

    // Build name→user_id lookup for resolving n8n assignee/attendee names
    const memberList = data?.project.members ?? [];
    const nameToId = new Map<string, string>();
    for (const m of memberList) {
      if (m.display_name) nameToId.set(m.display_name.toLowerCase(), m.user_id);
    }
    const resolveIds = (arr: string[]): string[] =>
      arr.map((v) => nameToId.get(v.toLowerCase()) ?? v);

    return {
      ai_reasoning: snapshot?.ai_reasoning ?? snapshot?.plan_rationale ?? "",
      tasks: rawTasks.map((t: any, i: number) => ({
        id: t.id ?? t.task_id ?? `task-${i}`,
        title: t.title ?? t.task_title ?? "",
        description: t.description ?? t.task_description ?? "",
        start_date: t.start_date ?? t.start_time ?? "",
        end_date: t.end_date ?? t.due_date ?? t.end_time ?? "",
        assigned_to: resolveIds(t.assigned_to ?? t.assignee_user_ids ?? t.task_assignees ?? []),
        status: t.status ?? "todo",
      })),
      meetings: rawMeetings.map((m: any, i: number) => {
        let datetime = m.datetime ?? m.meeting_time ?? "";
        if (!datetime && m.meeting_date) {
          datetime = m.start_time
            ? `${m.meeting_date}T${m.start_time}:00`
            : `${m.meeting_date}T00:00:00`;
        }
        let duration = m.duration_minutes;
        if (duration == null && m.start_time && m.end_time) {
          const [sh, sm] = m.start_time.split(":").map(Number);
          const [eh, em] = m.end_time.split(":").map(Number);
          duration = (eh * 60 + em) - (sh * 60 + sm);
          if (duration <= 0) duration = 60;
        }
        return {
          id: m.id ?? m.meeting_id ?? `meeting-${i}`,
          title: m.title ?? m.meeting_title ?? "",
          datetime,
          duration_minutes: duration ?? 60,
          recurrence: m.recurrence ?? "none",
          participants: resolveIds(m.participants ?? m.attendee_user_ids ?? m.meeting_attendees ?? []),
          notes: m.notes ?? m.meeting_detail ?? "",
        };
      }),
    };
  };

  const [previewReasoning, setPreviewReasoning] = useState("");

  const handlePreviewVersion = (version: PlanVersionSummary) => {
    // Save current state so we can restore on "Back"
    setSavedTasks(tasks);
    setSavedMeetings(meetings);
    setShowVersionHistory(false);

    // Normalize and load the preview snapshot
    const normalized = normalizeSnapshot(version.snapshot);
    setTasks(normalized.tasks.map((t, i) => ({ ...t, color: getTaskColor(i) })));
    setMeetings(normalized.meetings);
    setPreviewReasoning(normalized.ai_reasoning);
    setPreviewVersion(version);
    setExpandedIds(new Set());

    // Update calendar to earliest task in preview
    const earliest = [...normalized.tasks].sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    if (earliest) {
      const date = new Date(earliest.start_date + "T00:00:00");
      setCalDisplayYear(date.getFullYear());
      setCalDisplayMonth(date.getMonth());
    }
  };

  const exitPreview = () => {
    setTasks(savedTasks);
    setMeetings(savedMeetings);
    setPreviewVersion(null);
    setPreviewReasoning("");
    setExpandedIds(new Set());

    const earliest = [...savedTasks].sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    if (earliest) {
      const date = new Date(earliest.start_date + "T00:00:00");
      setCalDisplayYear(date.getFullYear());
      setCalDisplayMonth(date.getMonth());
    }
  };

  const handleRevertFromPreview = async () => {
    if (!revertTarget || !projectId) return;
    setReverting(true);
    try {
      const res = await apiFetch(
        `/api/v1/projects/${projectId}/plan-versions/${revertTarget.plan_version_id}/revert`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`Failed to revert: ${res.status}`);
      setRevertTarget(null);
      setPreviewVersion(null);
      loadPlan(projectId);
    } catch (err) {
      console.error("Failed to revert:", err);
    } finally {
      setReverting(false);
    }
  };

  const isPreviewMode = !!previewVersion;
  const isCurrentPreview = previewVersion?.version_number === data?.plan_version.version;

  useEffect(() => {
    if (!projectId) return;
    loadPlan(projectId);
  }, [projectId]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-santi-secondary">
        {loadError ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
              <div className="bg-santi-secondary px-6 pt-8 pb-6 text-center">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                  <SparklesIcon className="w-7 h-7 text-santi-primary" />
                </div>
                <h3 className="text-xl font-bold text-black">{t("noPlanTitle")}</h3>
              </div>
              <div className="px-6 pt-4 pb-6 text-center">
                <p className="text-sm text-black/60 leading-relaxed mb-6">
                  {t("noPlanMessage")}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => router.push(`/onboarding/project-detail?project_id=${projectId}`)}
                    className="w-full py-3.5 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all"
                  >
                    {t("setUp")}
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="w-full py-3.5 rounded-santi border-2 border-slate-200 font-bold text-sm text-black/60 bg-white active:bg-slate-50 transition-colors"
                  >
                    {tc("goBack")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <LoadingSpinner variant="inline" message={tl("plan")} />
        )}
      </div>
    );
  }

  const { project, plan_version } = data;

  const timelineGroups = buildTimelineGroups(tasks, meetings);

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
    [...tasks].sort((a, b) => a.start_date.localeCompare(b.start_date))[0]?.start_date + "T00:00:00"
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
    tasks,
    meetings,
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
          <button onClick={() => router.back()} className="p-1 text-black" aria-label="Go back">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-black">{t("projectPlan")}</h1>
          </div>
          <LanguageSwitcher />
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
                {t("deadline")} {formatShortDate(project.deadline)}
              </p>
            </div>
            {isPreviewMode ? (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full shrink-0 active:bg-amber-200 transition-colors"
              >
                {t("previewingVersion", { version: previewVersion.version_number })}
              </button>
            ) : (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="text-xs font-semibold bg-santi-primary/20 text-black/60 px-2.5 py-1 rounded-full shrink-0 active:bg-santi-primary/30 transition-colors"
              >
                v{plan_version.version} · {t("history")}
              </button>
            )}
          </div>
          {isPreviewMode && previewVersion.created_by && (
            <div className="flex items-center gap-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewVersion.created_by.picture_url ?? "/default-avatar.png"}
                alt=""
                className="w-5 h-5 rounded-full object-cover bg-slate-100"
              />
              <span className="text-xs text-black/60">
                {t("changedBy")} <span className="font-semibold text-black/80">{previewVersion.created_by.line_display_name ?? tc("unknown")}</span>
              </span>
            </div>
          )}
          <div className="flex gap-2 items-start bg-santi-secondary/50 rounded-xl p-3">
            <SparklesIcon className="w-4 h-4 text-black/60 shrink-0 mt-0.5" />
            <p className="text-xs text-black/70 leading-relaxed">
              {isPreviewMode
                ? previewReasoning || plan_version.ai_reasoning
                : plan_version.ai_reasoning}
            </p>
          </div>
        </section>

        {/* Calendar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-black">
              {tdp(MONTH_KEYS[calDisplayMonth])} {calDisplayYear}
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
                          {isViewMode && !isPreviewMode ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); cycleTaskStatus(task.id); }}
                              className="rounded-full active:scale-95 transition-transform"
                            >
                              <StatusBadge status={task.status} />
                            </button>
                          ) : (
                            <StatusBadge status={task.status} />
                          )}
                          {!isPreviewMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingItem({ type: "task", id: task.id }); }}
                              className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <PencilIcon className="w-3.5 h-3.5 text-santi-muted" />
                            </button>
                          )}
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
                          <div className="flex items-center justify-between mt-2">
                            <AssigneeAvatars ids={task.assigned_to} members={project.members} />
                            {!isPreviewMode && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(task.id); }}
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
                      {/* Always-visible header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MeetingIcon className="w-4 h-4 text-santi-primary shrink-0" />
                          <p className="font-semibold text-sm text-black leading-snug">{meeting.title}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isPreviewMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingItem({ type: "meeting", id: meeting.id }); }}
                              className="p-1 rounded-lg hover:bg-santi-secondary/60 transition-colors"
                            >
                              <PencilIcon className="w-3.5 h-3.5 text-santi-muted" />
                            </button>
                          )}
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

          {/* Create Task */}
          {!isPreviewMode && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-santi-primary/40 text-sm font-semibold text-black/60 hover:border-santi-primary hover:text-black transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Create Task
            </button>
          )}
        </section>
      </main>

      {/* Edit Sheets */}
      {editingItem?.type === "task" && (() => {
        const task = tasks.find((t) => t.id === editingItem.id);
        return task ? (
          <EditTaskSheet
            task={task}
            members={project.members}
            showStatus={isViewMode}
            maxDate={project.deadline}
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
            members={project.members}
            maxDate={project.deadline}
            onSave={handleSaveMeeting}
            onClose={() => setEditingItem(null)}
          />
        ) : null;
      })()}

      {/* Create Task Sheet — reuse EditTaskSheet with empty task */}
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
          members={project.members}
          maxDate={project.deadline}
          onSave={handleCreateTask}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {/* Delete Task Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete task?"
          message="This task will be removed from the plan. This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmClassName="bg-red-500 text-white"
          onConfirm={() => handleDeleteTask(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showVersionHistory && projectId && (
        <VersionHistorySheet
          projectId={projectId}
          currentVersionNumber={plan_version.version}
          onPreview={handlePreviewVersion}
          onRevert={() => {
            setShowVersionHistory(false);
            loadPlan(projectId);
          }}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {revertTarget && (
        <ConfirmDialog
          title={`Revert to v${revertTarget.version_number}?`}
          message="This will create a new version with the snapshot from the selected version. Your current changes will still be available in the history."
          confirmLabel={reverting ? "Reverting..." : "Revert"}
          cancelLabel="Cancel"
          onConfirm={handleRevertFromPreview}
          onCancel={() => setRevertTarget(null)}
        />
      )}

      {/* Published success modal */}
      {showPublished && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
            <div className="bg-santi-secondary px-6 pt-8 pb-6 text-center">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                <SparklesIcon className="w-7 h-7 text-santi-primary" />
              </div>
              <h3 className="text-xl font-bold text-black">Plan Published!</h3>
            </div>
            <div className="px-6 pt-4 pb-6 text-center">
              <p className="text-sm text-black/60 leading-relaxed mb-6">
                The approval link has been sent to your LINE group. Members can now review and approve the plan.
              </p>
              <button
                onClick={() => {
                  setShowPublished(false);
                  router.push(`/onboarding/plan-proposal?project_id=${projectId}&mode=view`);
                }}
                className="w-full py-3.5 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 z-40">
        {/* Action Buttons */}
        <div className="flex gap-3 px-6 pt-3 pb-2">
          {isPreviewMode ? (
            <>
              <button
                onClick={exitPreview}
                className="flex-1 py-3.5 rounded-santi border-2 border-slate-200 font-bold text-sm text-black/60 bg-white active:bg-slate-50 transition-colors"
              >
                Back
              </button>
              {!isCurrentPreview && (
                <button
                  onClick={() => setRevertTarget(previewVersion)}
                  className="flex-1 py-3.5 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all"
                >
                  Revert to this version
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => router.push(`/onboarding/edit-with-ai?project_id=${projectId}`)}
                className="flex-1 py-3.5 rounded-santi border-2 border-santi-primary font-bold text-sm text-black bg-white active:bg-santi-secondary/30 transition-colors"
              >
                Edit with AI
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 py-3.5 rounded-santi bg-santi-primary font-bold text-sm text-black active:brightness-95 transition-all disabled:opacity-60"
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            </>
          )}
        </div>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </>
  );
}
