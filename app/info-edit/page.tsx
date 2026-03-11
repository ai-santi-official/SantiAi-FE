"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import mockProjects from "@/utils/mock/projects.json";
import mockMeetings from "@/utils/mock/meetings.json";
import { BottomNav } from "@/components/BottomNav";

type ProjectStatus = "draft" | "waiting_approval" | "approved" | "done";

type Project = {
  project_id: string;
  project_name: string;
  project_status: ProjectStatus;
  deadline?: string;
};

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

const TODAY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  draft:            { label: "Draft",            className: "bg-slate-100 text-slate-500" },
  waiting_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved:         { label: "Approved",         className: "bg-green-100 text-green-700" },
  done:             { label: "Done",             className: "bg-blue-100 text-blue-700" },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = PROJECT_STATUS_CONFIG[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

export default function InfoEditPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showPastProjects, setShowPastProjects] = useState(false);
  const [showPastMeetings, setShowPastMeetings] = useState(false);

  const projects: Project[] = mockProjects as Project[];
  const meetings: Meeting[] = mockMeetings as Meeting[];

  const activeProjects = useMemo(() =>
    projects.filter((p) => p.project_status !== "done" &&
      p.project_name.toLowerCase().includes(query.toLowerCase())),
    [projects, query]);

  const pastProjects = useMemo(() =>
    projects.filter((p) => p.project_status === "done" &&
      p.project_name.toLowerCase().includes(query.toLowerCase())),
    [projects, query]);

  const upcomingMeetings = useMemo(() =>
    meetings.filter((m) => m.date >= TODAY &&
      m.meeting_name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [meetings, query]);

  const pastMeetings = useMemo(() =>
    meetings.filter((m) => m.date < TODAY &&
      m.meeting_name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date)), // newest first
    [meetings, query]);

  const getProjectName = (id: string) =>
    projects.find((p) => p.project_id === id)?.project_name ?? "—";

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
            <h1 className="text-3xl font-bold text-black">Santi</h1>
            <p className="text-sm text-black/60 mt-0.5">Info / Edit</p>
          </div>
          <div className="w-8" />
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
            placeholder="Search projects or meetings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Active Projects */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">Projects</h3>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-santi-muted text-center py-4">No active projects</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeProjects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => router.push(`/onboarding/plan-proposal?projectId=${project.project_id}&mode=view`)}
                  className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-santi-secondary shrink-0">
                      <FolderIcon />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-black truncate">{project.project_name}</span>
                      {project.deadline && (
                        <span className="text-xs text-santi-muted">Due {formatDisplayDate(project.deadline)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <StatusBadge status={project.project_status} />
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
              title="Past Projects"
              count={pastProjects.length}
              open={showPastProjects}
              onToggle={() => setShowPastProjects((v) => !v)}
            />
            {showPastProjects && (
              <div className="flex flex-col gap-3">
                {pastProjects.map((project) => (
                  <button
                    key={project.project_id}
                    onClick={() => router.push(`/onboarding/plan-proposal?projectId=${project.project_id}&mode=view`)}
                    className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left opacity-70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                        <FolderIcon faded />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-black truncate">{project.project_name}</span>
                        {project.deadline && (
                          <span className="text-xs text-santi-muted">Ended {formatDisplayDate(project.deadline)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <StatusBadge status={project.project_status} />
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
          <h3 className="text-lg font-bold">Meetings</h3>
          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-santi-muted text-center py-4">No upcoming meetings</p>
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
                      <span className="font-bold text-black">{meeting.meeting_name}</span>
                      <span className="text-xs text-santi-muted font-medium">
                        {formatDisplayDate(meeting.date)}, {meeting.start_time}
                        {" · "}
                        {getProjectName(meeting.project_id)}
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
              title="Past Meetings"
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
                        <span className="font-bold text-black">{meeting.meeting_name}</span>
                        <span className="text-xs text-santi-muted font-medium">
                          {formatDisplayDate(meeting.date)}, {meeting.start_time}
                          {" · "}
                          {getProjectName(meeting.project_id)}
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
