"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const INITIAL_VISIBLE = 5;

type VersionCreator = {
  user_id: string;
  line_display_name: string | null;
  picture_url: string | null;
};

export type PlanVersionSummary = {
  plan_version_id: string;
  version_number: number;
  change_type: string;
  version_status: string;
  snapshot: any;
  created_at: string;
  created_by: VersionCreator | null;
};

type Props = {
  projectId: string;
  currentVersionNumber: number;
  onPreview: (version: PlanVersionSummary) => void;
  onRevert: (versionId: string) => void;
  onClose: () => void;
  /** Override the revert API path suffix. Defaults to "revert". Use "revert-approved" for approved projects. */
  revertAction?: string;
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  ai_proposal: "AI Proposal",
  ai_reprompt: "AI Reprompt",
  manual_edit: "Manual Edit",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VersionHistorySheet({ projectId, currentVersionNumber, onPreview, onRevert, onClose, revertAction = "revert" }: Props) {
  const [versions, setVersions] = useState<PlanVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState<PlanVersionSummary | null>(null);
  const [reverting, setReverting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Sort by version_number descending (latest first) and limit display
  const sortedVersions = useMemo(() => [...versions].sort((a, b) => b.version_number - a.version_number), [versions]);
  const visibleVersions = showAll ? sortedVersions : sortedVersions.slice(0, INITIAL_VISIBLE);
  const hasMore = sortedVersions.length > INITIAL_VISIBLE;

  useEffect(() => {
    apiFetch(`/api/v1/projects/${projectId}/plan-versions`)
      .then((res) => res.json())
      .then((data) => setVersions(data.versions ?? []))
      .catch((err) => console.error("Failed to load versions:", err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleRevert = async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      const res = await apiFetch(
        `/api/v1/projects/${projectId}/plan-versions/${revertTarget.plan_version_id}/${revertAction}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`Failed to revert: ${res.status}`);
      setRevertTarget(null);
      onRevert(revertTarget.plan_version_id);
    } catch (err) {
      console.error("Failed to revert:", err);
    } finally {
      setReverting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-t-3xl px-6 pt-5 pb-10 max-h-[70dvh] overflow-y-auto">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
          <h2 className="text-base font-bold text-black mb-4">Version History</h2>

          {loading ? (
            <p className="text-sm text-black/60 text-center py-8">Loading...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-black/60 text-center py-8">No versions found</p>
          ) : (
            <div className="space-y-2">
              {visibleVersions.map((v) => {
                const isCurrent = v.version_number === currentVersionNumber;
                const taskCount = v.snapshot?.tasks?.length ?? 0;
                const meetingCount = v.snapshot?.meetings?.length ?? 0;
                return (
                  <div
                    key={v.plan_version_id}
                    onClick={() => onPreview(v)}
                    className={`p-3 rounded-xl border cursor-pointer active:bg-slate-50 transition-colors ${
                      isCurrent
                        ? "border-santi-primary bg-santi-secondary/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-black">v{v.version_number}</span>
                          <span className="text-xs text-black/50">
                            {CHANGE_TYPE_LABELS[v.change_type] ?? v.change_type}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold bg-santi-primary px-1.5 py-0.5 rounded-full text-black">
                              Current
                            </span>
                          )}
                        </div>

                        {/* Creator row */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {v.created_by ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={v.created_by.picture_url ?? "/default-avatar.png"}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover bg-slate-100"
                              />
                              <span className="text-xs text-black/50">
                                {v.created_by.line_display_name ?? "Unknown"}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-black/50">
                              {v.change_type === "ai_proposal" || v.change_type === "ai_reprompt" ? "Santi AI" : "Unknown"}
                            </span>
                          )}
                          <span className="text-xs text-black/30">·</span>
                          <span className="text-xs text-black/40">{formatDateTime(v.created_at)}</span>
                        </div>

                        {/* Snapshot summary */}
                        <p className="text-[11px] text-black/35 mt-0.5">
                          {taskCount} task{taskCount !== 1 ? "s" : ""}, {meetingCount} meeting{meetingCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setRevertTarget(v); }}
                          className="text-xs font-semibold text-santi-primary border border-santi-primary px-3 py-1.5 rounded-full shrink-0 active:bg-santi-secondary/30 transition-colors ml-2"
                        >
                          Revert
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full py-2 text-sm font-semibold text-santi-primary active:text-santi-primary/70 transition-colors"
                >
                  Show {sortedVersions.length - INITIAL_VISIBLE} older version{sortedVersions.length - INITIAL_VISIBLE !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-santi border-2 border-slate-200 text-sm font-bold text-black/60"
          >
            Close
          </button>
        </div>
      </div>

      {revertTarget && (
        <ConfirmDialog
          title={`Revert to v${revertTarget.version_number}?`}
          message="This will create a new version with the snapshot from the selected version. Your current changes will still be available in the history."
          confirmLabel={reverting ? "Reverting..." : "Revert"}
          cancelLabel="Cancel"
          onConfirm={handleRevert}
          onCancel={() => setRevertTarget(null)}
        />
      )}
    </>
  );
}
