"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { getGroupMembers, type GroupMember } from "@/utils/getGroupMembers";
import { useOnboarding } from "@/provider/OnboardingProvider";
import { useLiff } from "@/provider/LiffProvider";
import { apiFetch } from "@/utils/api";

export default function MemberPreferencesPage() {
  const router = useRouter();
  const { groupId } = useLiff();
  const { projectId, memberIds } = useOnboarding();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const gid = groupId ?? "Cgroup_shared_001";
    getGroupMembers(gid).then(({ members: all }) => {
      const selected = memberIds.length > 0
        ? all.filter((m) => memberIds.includes(m.user_id))
        : all;
      setMembers(selected);
      setDescriptions(Object.fromEntries(selected.map((m) => [m.user_id, ""])));
    });
  }, [groupId, memberIds]);

  const handleChange = (id: string, value: string) => {
    setDescriptions((prev) => ({ ...prev, [id]: value }));
  };

  const handleCreatePlan = async () => {
    if (!projectId) return;
    setSubmitting(true);
    try {
      const memberPreferences = Object.entries(descriptions)
        .filter(([, pref]) => pref.trim() !== "")
        .map(([user_id, preference]) => ({ user_id, preference }));

      if (memberPreferences.length > 0) {
        const res = await apiFetch(`/api/v1/projects/${projectId}`, {
          method: "PATCH",
          body: JSON.stringify({ member_preferences: memberPreferences }),
        });
        if (!res.ok) throw new Error(`Failed to update preferences: ${res.status}`);
      }

      router.push(`/onboarding/plan-proposal?project_id=${projectId}`);
    } catch (err) {
      console.error("Failed to update preferences:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingHeader step={3} totalSteps={3} onBack={() => router.back()} />

      <main className="relative -mt-12 bg-white rounded-t-[48px] pt-8 px-6 pb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black mb-1">Describe members</h2>
          <p className="text-sm text-santi-muted">
            (optional) This helps Santi assign tasks more accurately.
          </p>
        </div>

        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="bg-white border border-slate-200 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.picture_url ?? "/default-avatar.png"}
                  alt={member.display_name ?? "Member"}
                  className="w-10 h-10 rounded-full object-cover bg-slate-100 shrink-0"
                />
                <span className="font-bold text-black">
                  {member.display_name ?? "Unknown"}
                </span>
              </div>
              <textarea
                className="w-full bg-slate-50 border-0 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-santi-primary/50 resize-none h-20 placeholder:text-slate-400 font-sans"
                placeholder="Good at design, research, presentation..."
                value={descriptions[member.user_id] ?? ""}
                onChange={(e) => handleChange(member.user_id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </main>

      <OnboardingFooter onContinue={handleCreatePlan} label={submitting ? "Saving..." : "Create Plan"} disabled={submitting} />
    </>
  );
}
