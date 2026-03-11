"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/DatePicker";
import { SparklesIcon } from "@/components/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import mockProjects from "@/utils/mock/projects.json";

type ProjectStatus = "draft" | "waiting_approval" | "approved" | "done";

type Project = {
  project_id: string;
  project_name: string;
  project_status?: ProjectStatus;
  deadline?: string;
  detail?: string;
  deliverables?: string;
};

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  draft:            { label: "Draft",            className: "bg-slate-100 text-slate-500" },
  waiting_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved:         { label: "Approved",         className: "bg-green-100 text-green-700" },
  done:             { label: "Done",             className: "bg-blue-100 text-blue-700" },
};

function BackArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
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

export default function ProjectInfoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const projects: Project[] = mockProjects;
  const project = projects.find((p) => p.project_id === id);

  const [name, setName] = useState(project?.project_name ?? "");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [detail, setDetail] = useState(project?.detail ?? "");
  const [deliverables, setDeliverables] = useState(project?.deliverables ?? "");
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "save" | null>(null);

  const isDirty =
    name !== (project?.project_name ?? "") ||
    deadline !== (project?.deadline ?? "") ||
    detail !== (project?.detail ?? "") ||
    deliverables !== (project?.deliverables ?? "");

  if (!project) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center gap-4 px-6">
        <p className="text-santi-muted font-medium">Project not found.</p>
        <button onClick={() => router.back()} className="text-santi-primary font-semibold underline">
          Go back
        </button>
      </div>
    );
  }

  const canSave = name.trim() !== "";

  const handleBackClick = () => {
    if (isDirty) setConfirm("discard");
    else router.back();
  };

  const handleSaveClick = () => setConfirm("save");

  const handleConfirm = () => {
    if (confirm === "save") {
      console.log("Save project", { id, name, deadline, detail, deliverables });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      router.back();
    }
    setConfirm(null);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <header className="bg-santi-secondary pt-10 pb-16 px-6">
        <div className="flex items-center justify-between">
          <button onClick={handleBackClick} aria-label="Go back" className="p-1 text-black">
            <BackArrowIcon />
          </button>
          <h1 className="text-lg font-bold text-black">Edit Project</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* Form */}
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
            {project.project_status && (() => {
              const cfg = PROJECT_STATUS_CONFIG[project.project_status];
              return (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${cfg.className}`}>
                  {cfg.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Project Name */}
        <div className="flex flex-col gap-2">
          <label className="santi-label">Project Name</label>
          <input
            className="santi-input"
            placeholder="e.g. Science Fair Presentation"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Deadline */}
        <div className="flex flex-col gap-2">
          <label className="santi-label">Project Deadline</label>
          <DatePicker
            value={deadline}
            onChange={setDeadline}
            placeholder="Select date & time"
          />
        </div>

        {/* Project Detail */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-santi-primary" />
            <label className="santi-label">Project Detail</label>
          </div>
          <textarea
            className="santi-textarea"
            rows={5}
            placeholder="Describe your goals, team size, and any specific requirements..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <p className="text-xs text-santi-muted ml-1">
            The more details you give, the better Santi can plan.
          </p>
        </div>

        {/* Final Deliverables */}
        <div className="flex flex-col gap-2">
          <label className="santi-label">Final Deliverables</label>
          <input
            className="santi-input"
            placeholder="e.g. Figma file, PDF report, Codebase"
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
          />
        </div>
      </main>

      {/* Spacer for fixed footer */}
      <div className="h-28" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full footer-safe bg-white/80 backdrop-blur-sm border-t border-santi-muted/10">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSaveClick}
            disabled={!canSave}
            className="w-full bg-santi-primary py-4 rounded-santi font-bold text-lg text-black active:scale-[0.98] transition-transform btn-elevation disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <SaveIcon />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </footer>
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
          message="Are you sure you want to save the changes to this project?"
          confirmLabel="Save"
          cancelLabel="Keep editing"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
