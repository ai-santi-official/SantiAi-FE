"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/provider/LiffProvider";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { getGroupMembers, type GroupMember } from "@/utils/getGroupMembers";

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
  const { profile } = useLiff();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // TODO: pass groupId from LIFF context once API is ready
    getGroupMembers().then(({ members }) => setMembers(members));
  }, []);

  const allSelected =
    members.length > 0 && selectedIds.size === members.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.line_user_id)));
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

  const handleContinue = () => {
    const selected = members.filter((m) => selectedIds.has(m.line_user_id));

    console.log("Selected members:", selected, "User ID:", profile?.userId);
    router.push("/onboarding/project-detail");
  };

  return (
    <>
      <OnboardingHeader step={1} totalSteps={3} />

      <main className="px-6 pb-6 space-y-3 relative -mt-12 bg-white rounded-t-[48px] pt-8">
        <section className="mb-6">
          <h2 className="text-xl font-bold text-black">Create a new project</h2>
          <p className="text-sm text-black/60">Select members</p>
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
              <span className="font-medium text-black">Select All</span>
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
            const selected = selectedIds.has(member.line_user_id);
            return (
              <div
                key={member.line_user_id}
                onClick={() => toggleMember(member.line_user_id)}
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
                    alt={member.display_name ?? "Member"}
                    className="w-10 h-10 rounded-full bg-gray-100 border border-santi-muted/20 object-cover"
                  />
                  <span className="font-medium">{member.display_name ?? "Unknown"}</span>
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
        disabled={selectedIds.size === 0}
      />
    </>
  );
}
