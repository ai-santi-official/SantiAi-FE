"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { useLiff } from "@/provider/LiffProvider";
import { getGroupProjects, type GroupProject } from "@/utils/getGroupProjects";
import { getGroupMeetings, type GroupMeeting } from "@/utils/getGroupMeetings";
import { getGroupMembers, type GroupMember } from "@/utils/getGroupMembers";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const DEV_GROUP_ID = "Cgroup_shared_001";

type ProjectStatus = "draft" | "waiting_approval" | "approved" | "done";

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  draft:            { label: "draft",            className: "bg-slate-100 text-slate-500" },
  waiting_approval: { label: "pendingApproval",  className: "bg-amber-100 text-amber-700" },
  approved:         { label: "approved",         className: "bg-green-100 text-green-700" },
  done:             { label: "done",             className: "bg-blue-100 text-blue-700" },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const ts = useTranslations("status");
  const cfg = PROJECT_STATUS_CONFIG[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.className}`}>
      {ts(cfg.label as any)}
    </span>
  );
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDisplayTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-santi-muted">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function FolderIcon({ faded }: { faded?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={faded ? "text-slate-400" : "text-santi-primary"}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

function CalendarIcon({ faded }: { faded?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={faded ? "text-slate-400" : "text-black"}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-santi-muted">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-santi-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SectionHeader({ title, count, open, onToggle }: { title: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <ChevronDownIcon open={open} />
    </button>
  );
}

function projectRoute(project: GroupProject): string {
  if (project.project_status === "approved" || project.project_status === "done") {
    return `/info-edit/project/${project.project_id}`;
  }
  if (project.project_status === "waiting_approval") {
    return `/approval/${project.project_id}`;
  }
  return `/onboarding/plan-proposal?project_id=${project.project_id}&mode=view`;
}

export default function InfoEditPage() {
  const router = useRouter();
  const t = useTranslations("infoEdit");
  const tb = useTranslations("brand");
  const tn = useTranslations("nav");
  const tl = useTranslations("loading");
  const { groupId, isReady, profile } = useLiff();
  const lineGroupId = groupId ?? DEV_GROUP_ID;
  const [query, setQuery] = useState("");
  const [showPastProjects, setShowPastProjects] = useState(false);
  const [showPastMeetings, setShowPastMeetings] = useState(false);
  const [projects, setProjects] = useState<GroupProject[]>([]);
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    Promise.all([
      getGroupProjects(lineGroupId).then((res) => setProjects(res.projects)),
      getGroupMeetings(lineGroupId).then((res) => setMeetings(res.meetings)),
      getGroupMembers(lineGroupId).then((res) => setGroupMembers(res.members)),
    ])
      .catch((err) => console.error("Failed to load data:", err))
      .finally(() => setLoading(false));
  }, [isReady, lineGroupId]);

  // Resolve current user's internal user_id from LINE profile
  const currentUserId = groupMembers.find((m) => m.line_user_id === profile?.userId)?.user_id ?? null;

  const now = new Date();

  const STATUS_ORDER: Record<string, number> = { approved: 0, waiting_approval: 1, draft: 2 };

  const activeProjects = useMemo(() =>
    projects.filter((p) => {
      if (p.project_status === "done") return false;
      // Only show draft projects to their creator
      if (p.project_status === "draft" && p.created_by_user_id !== currentUserId) return false;
      return (p.project_name || "").toLowerCase().includes(query.toLowerCase());
    })
      .sort((a, b) => (STATUS_ORDER[a.project_status] ?? 9) - (STATUS_ORDER[b.project_status] ?? 9)),
    [projects, query, currentUserId]);

  const pastProjects = useMemo(() =>
    projects.filter((p) => p.project_status === "done" &&
      p.project_name.toLowerCase().includes(query.toLowerCase())),
    [projects, query]);

  const upcomingMeetings = useMemo(() =>
    meetings.filter((m) => new Date(m.meeting_time) >= now &&
      m.meeting_title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.meeting_time.localeCompare(b.meeting_time)),
    [meetings, query]);

  const pastMeetings = useMemo(() =>
    meetings.filter((m) => new Date(m.meeting_time) < now &&
      m.meeting_title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.meeting_time.localeCompare(a.meeting_time)),
    [meetings, query]);

  if (loading) {
    return <LoadingSpinner message={tl("projects")} />;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-20 px-6 relative">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} aria-label="Go back" className="p-1 text-black">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-black">{tb("name")}</h1>
            <p className="text-sm text-black/60 mt-0.5">{tn("infoEdit")}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="relative -mt-12 bg-white rounded-t-[48px] flex-1 flex flex-col gap-8 px-6 pt-6 pb-28">

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-white border border-santi-muted rounded-santi h-12 px-4 shadow-sm">
          <SearchIcon />
          <input
            type="text"
            className="flex-1 border-none bg-transparent p-0 text-base focus:ring-0 outline-none placeholder:text-santi-muted text-black"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Active Projects */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">{t("projects")}</h3>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-santi-muted text-center py-4">{t("noActiveProjects")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeProjects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => router.push(projectRoute(project))}
                  className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-santi-secondary shrink-0">
                      <FolderIcon />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-black truncate">{project.project_name || t("untitledProject")}</span>
                      {project.final_due_date && (
                        <span className="text-xs text-santi-muted">{t("due")} {formatDisplayDate(project.final_due_date)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <StatusBadge status={project.project_status as ProjectStatus} />
                    <ChevronRightIcon />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Past Projects */}
        {pastProjects.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeader
              title={t("pastProjects")}
              count={pastProjects.length}
              open={showPastProjects}
              onToggle={() => setShowPastProjects((v) => !v)}
            />
            {showPastProjects && (
              <div className="flex flex-col gap-3">
                {pastProjects.map((project) => (
                  <button
                    key={project.project_id}
                    onClick={() => router.push(projectRoute(project))}
                    className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left opacity-70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                        <FolderIcon faded />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-black truncate">{project.project_name || t("untitledProject")}</span>
                        {project.final_due_date && (
                          <span className="text-xs text-santi-muted">{t("ended")} {formatDisplayDate(project.final_due_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <StatusBadge status={project.project_status as ProjectStatus} />
                      <ChevronRightIcon />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Upcoming Meetings */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">{t("meetings")}</h3>
          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-santi-muted text-center py-4">{t("noUpcomingMeetings")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingMeetings.map((meeting) => (
                <button
                  key={meeting.meeting_id}
                  onClick={() => router.push(`/info-edit/meeting/${meeting.meeting_id}`)}
                  className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-santi-primary shrink-0">
                      <CalendarIcon />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-black">{meeting.meeting_title}</span>
                      <span className="text-xs text-santi-muted font-medium">
                        {formatDisplayDate(meeting.meeting_time)}, {formatDisplayTime(meeting.meeting_time)}
                        {" · "}
                        {meeting.project_name}
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Past Meetings */}
        {pastMeetings.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeader
              title={t("pastMeetings")}
              count={pastMeetings.length}
              open={showPastMeetings}
              onToggle={() => setShowPastMeetings((v) => !v)}
            />
            {showPastMeetings && (
              <div className="flex flex-col gap-3">
                {pastMeetings.map((meeting) => (
                  <button
                    key={meeting.meeting_id}
                    onClick={() => router.push(`/info-edit/meeting/${meeting.meeting_id}`)}
                    className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                        <CalendarIcon faded />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-black">{meeting.meeting_title}</span>
                        <span className="text-xs text-santi-muted font-medium">
                          {formatDisplayDate(meeting.meeting_time)}, {formatDisplayTime(meeting.meeting_time)}
                          {" · "}
                          {meeting.project_name}
                        </span>
                      </div>
                    </div>
                    <ChevronRightIcon />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
