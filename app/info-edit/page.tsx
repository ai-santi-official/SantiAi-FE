"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import mockProjects from "@/utils/mock/projects.json";
import mockMeetings from "@/utils/mock/meetings.json";
import { BottomNav } from "@/components/BottomNav";

type Project = { project_id: string; project_name: string };
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

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-santi-primary">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
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

export default function InfoEditPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const projects: Project[] = mockProjects;
  const meetings: Meeting[] = mockMeetings as Meeting[];

  const filteredProjects = useMemo(() =>
    projects.filter((p) =>
      p.project_name.toLowerCase().includes(query.toLowerCase())
    ), [projects, query]);

  const filteredMeetings = useMemo(() =>
    meetings.filter((m) =>
      m.meeting_name.toLowerCase().includes(query.toLowerCase())
    ), [meetings, query]);

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-20 px-6 relative">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-1 text-black"
          >
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

      {/* Content — white card overlapping header */}
      <main className="relative -mt-12 bg-white rounded-t-[48px] flex-1 flex flex-col gap-8 px-6 pt-6 pb-28">

        {/* Search Bar */}
        <div>
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
        </div>

        {/* Projects Section */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">Projects</h3>

          {filteredProjects.length === 0 ? (
            <p className="text-sm text-santi-muted text-center py-4">No projects found</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredProjects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => router.push(`/onboarding/plan-proposal?projectId=${project.project_id}&mode=view`)}
                  className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-santi-secondary">
                      <FolderIcon />
                    </div>
                    <span className="font-bold text-black">{project.project_name}</span>
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Meetings Section */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">Meetings</h3>

          {filteredMeetings.length === 0 ? (
            <p className="text-sm text-santi-muted text-center py-4">No meetings found</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredMeetings.map((meeting) => (
                <button
                  key={meeting.meeting_id}
                  onClick={() => router.push(`/info-edit/meeting/${meeting.meeting_id}`)}
                  className="flex items-center justify-between p-4 bg-white rounded-santi border border-santi-muted/40 shadow-sm hover:border-santi-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-santi-primary">
                      <CalendarIcon />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-black">{meeting.meeting_name}</span>
                      <span className="text-xs text-santi-muted font-medium">
                        {formatDisplayDate(meeting.date)}, {meeting.start_time}
                        {" · "}
                        {projects.find((p) => p.project_id === meeting.project_id)?.project_name ?? "—"}
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
