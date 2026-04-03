"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MeetingHeader } from "@/components/meeting/MeetingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { BottomNav } from "@/components/BottomNav";
import { useLiff } from "@/provider/LiffProvider";
import { getGroupProjects, type GroupProject } from "@/utils/getGroupProjects";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

const DEV_GROUP_ID = "Cgroup_shared_001";

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-santi-primary"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
    </svg>
  );
}

export default function MeetingSelectProjectPage() {
  const router = useRouter();
  const { groupId, isReady } = useLiff();
  const t = useTranslations("meeting");
  const tl = useTranslations("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projects, setProjects] = useState<GroupProject[]>([]);
  const [loading, setLoading] = useState(true);

  const lineGroupId = groupId ?? DEV_GROUP_ID;

  useEffect(() => {
    if (!isReady) return;
    getGroupProjects(lineGroupId)
      .then((res) => setProjects(res.projects.filter((p) => p.project_status === "approved")))
      .catch((err) => console.error("Failed to load projects:", err))
      .finally(() => setLoading(false));
  }, [isReady, lineGroupId]);

  const handleNext = () => {
    if (!selectedId) return;
    const projectName = projects.find((p) => p.project_id === selectedId)?.project_name ?? "";
    router.push(`/meeting/details?projectId=${selectedId}&projectName=${encodeURIComponent(projectName)}`);
  };

  return (
    <>
      <MeetingHeader
        title={t("createMeeting")}
        step={1}
        totalSteps={2}
        onBack={() => router.back()}
      />

      <main className="px-6 pb-6 space-y-3 relative -mt-12 bg-white rounded-t-[48px] pt-8">
        <section className="mb-6">
          <h2 className="text-xl font-bold text-black">{t("selectProject")}</h2>
        </section>

        <section className="flex flex-col gap-3">
          {loading && (
            <LoadingSpinner variant="inline" message={tl("projects")} />
          )}
          {!loading && projects.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t("noApprovedProjects")}</p>
          )}
          {projects.map((project) => {
            const selected = selectedId === project.project_id;
            return (
              <button
                key={project.project_id}
                onClick={() => setSelectedId(project.project_id)}
                className={`w-full flex items-center justify-between p-5 rounded-santi transition-all member-card ${
                  selected
                    ? "bg-santi-secondary border-2 border-santi-primary"
                    : "bg-white border border-santi-muted"
                }`}
              >
                <span
                  className={`font-medium text-black ${selected ? "font-semibold" : ""}`}
                >
                  {project.project_name}
                </span>
                {selected ? (
                  <CheckCircleIcon />
                ) : (
                  <div className="w-6 h-6 rounded-full border border-santi-muted" />
                )}
              </button>
            );
          })}
        </section>
      </main>

      <OnboardingFooter
        onContinue={handleNext}
        disabled={!selectedId}
        label={t("nextStep")}
        withNav
      />
      <BottomNav />
    </>
  );
}
