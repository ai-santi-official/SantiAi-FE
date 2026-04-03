"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/provider/LiffProvider";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { BottomNav } from "@/components/BottomNav";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getGroupMembers, type GroupMember } from "@/utils/getGroupMembers";
import { useOnboarding } from "@/provider/OnboardingProvider";
import { apiFetch } from "@/utils/api";
import { useTranslations } from "next-intl";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const td = useTranslations("confirmDialog");
  const tl = useTranslations("loading");
  const { profile, groupId, isReady } = useLiff();
  const { memberIds, projectId, projectDetail, setMemberIds, setProjectId } = useOnboarding();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(memberIds));
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const hasProjectDetails =
    projectDetail.name.trim() !== "" ||
    projectDetail.deadline !== "" ||
    projectDetail.detail.trim() !== "" ||
    projectDetail.deliverables.trim() !== "";

  const handleBack = () => {
    if (projectId || hasProjectDetails) {
      setShowExitDialog(true);
    } else {
      router.push("/info-edit");
    }
  };

  useEffect(() => {
    if (!isReady) return;
    getGroupMembers(groupId ?? "Cgroup_shared_001")
      .then(({ members }) => setMembers(members))
      .catch((err) => console.error("Failed to load members:", err));
  }, [isReady, groupId]);

  const allSelected =
    members.length > 0 && selectedIds.size === members.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.user_id)));
    }
  };

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      const ids = Array.from(selectedIds);

      // If project already exists (user navigated back), just update selection and go forward
      if (projectId) {
        setMemberIds(ids);
        router.push("/onboarding/project-detail");
        return;
      }

      const lineGroupId = groupId ?? "Cgroup_shared_001";

      // Resolve creator: match LIFF profile to user_id, fallback to first selected
      const creator = profile
        ? members.find((m) => m.line_user_id === profile.userId)
        : null;
      const creatorUserId = creator?.user_id ?? ids[0];

      const res = await apiFetch("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({
          line_group_id: lineGroupId,
          created_by_user_id: creatorUserId,
          member_user_ids: ids,
        }),
      });

      if (!res.ok) throw new Error(`Failed to create project: ${res.status}`);

      const { project_id } = (await res.json()) as { project_id: string };
      setProjectId(project_id);
      setMemberIds(ids);
      router.push("/onboarding/project-detail");
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingHeader step={1} totalSteps={3} onBack={handleBack} />

      <main className="px-6 pb-6 space-y-3 relative -mt-12 bg-white rounded-t-[48px] pt-8">
        <section className="mb-6">
          <h2 className="text-xl font-bold text-black">{t("createNewProject")}</h2>
          <p className="text-sm text-black/60">{t("selectMembers")}</p>
        </section>

        {/* Select All */}
        <section>
          <button
            onClick={toggleSelectAll}
            className={`member-card w-full flex items-center justify-between p-4 rounded-santi ${
              allSelected
                ? "bg-santi-secondary border-2 border-santi-primary"
                : "bg-white border-2 border-santi-muted"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-santi-muted/30">
                <CheckIcon className="h-5 w-5 text-santi-primary" />
              </div>
              <span className="font-medium text-black">{tc("selectAll")}</span>
            </div>
            {allSelected && (
              <div className="bg-santi-primary rounded-full p-1">
                <CheckIcon className="h-4 w-4 text-black" />
              </div>
            )}
          </button>
        </section>

        {/* Individual Member Cards */}
        <section className="space-y-3 pt-3">
          {members.map((member) => {
            const selected = selectedIds.has(member.user_id);
            return (
              <div
                key={member.line_user_id}
                onClick={() => toggleMember(member.user_id)}
                className={`member-card flex items-center justify-between p-4 rounded-santi cursor-pointer ${
                  selected
                    ? "bg-santi-secondary border-2 border-santi-primary"
                    : "bg-white border border-santi-muted"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.picture_url ?? "/default-avatar.png"}
                    alt={member.display_name ?? tc("member")}
                    className="w-10 h-10 rounded-full bg-gray-100 border border-santi-muted/20 object-cover"
                  />
                  <span className="font-medium">{member.display_name ?? tc("unknown")}</span>
                </div>
                {selected && (
                  <div className="bg-santi-primary rounded-full p-1">
                    <CheckIcon className="h-4 w-4 text-black" />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      <OnboardingFooter
        onContinue={handleContinue}
        disabled={selectedIds.size === 0 || submitting}
        label={submitting ? tl("creating") : tc("continue")}
        withNav
      />
      <BottomNav />

      {showExitDialog && (
        <ConfirmDialog
          title={td("discardProject")}
          message={td("discardProjectMessage")}
          confirmLabel={tc("discard")}
          cancelLabel={td("saveDraft")}
          confirmClassName="bg-red-500 text-white"
          onConfirm={async () => {
            setShowExitDialog(false);
            if (projectId) {
              try {
                await apiFetch(`/api/v1/projects/${projectId}`, { method: "DELETE" });
              } catch (err) {
                console.error("Failed to delete project:", err);
              }
            }
            router.push("/info-edit");
          }}
          onCancel={() => {
            setShowExitDialog(false);
            router.push("/info-edit");
          }}
        />
      )}
    </>
  );
}
