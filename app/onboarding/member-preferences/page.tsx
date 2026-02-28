"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { getGroupMembers, type GroupMember } from "@/utils/getGroupMembers";

export default function MemberPreferencesPage() {
  const router = useRouter();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    // TODO: receive only the selected members from step 1 once state management is added
    getGroupMembers().then(({ members }) => {
      setMembers(members);
      setDescriptions(Object.fromEntries(members.map((m) => [m.line_user_id, ""])));
    });
  }, []);

  const handleChange = (id: string, value: string) => {
    setDescriptions((prev) => ({ ...prev, [id]: value }));
  };

  const handleCreatePlan = () => {
    console.log("Member descriptions:", descriptions);
    // TODO: submit all onboarding data to backend before navigating
    router.push("/onboarding/plan-proposal");
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
              key={member.line_user_id}
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
                value={descriptions[member.line_user_id] ?? ""}
                onChange={(e) => handleChange(member.line_user_id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </main>

      <OnboardingFooter onContinue={handleCreatePlan} label="Create Plan" />
    </>
  );
}
