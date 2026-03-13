"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { DatePicker } from "@/components/ui/DatePicker";
import { SparklesIcon } from "@/components/icons";
import { useOnboarding } from "@/provider/OnboardingProvider";
import { apiFetch } from "@/utils/api";

export default function ProjectDetailPage() {
  const router = useRouter();
  const { projectId } = useOnboarding();
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [detail, setDetail] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canContinue =
    name.trim() !== "" &&
    deadline !== "" &&
    detail.trim() !== "" &&
    deliverables.trim() !== "";

  const handleContinue = async () => {
    if (!projectId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({
          project_name: name,
          final_due_date: deadline,
          final_deliverable: deliverables,
          project_detail: detail,
        }),
      });
      if (!res.ok) throw new Error(`Failed to update project: ${res.status}`);
      router.push("/onboarding/member-preferences");
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingHeader step={2} totalSteps={3} onBack={() => router.back()} />

      <main className="relative -mt-12 bg-white rounded-t-[48px] pt-8 px-6 pb-6 space-y-6">
        <section>
          <h2 className="text-xl font-bold text-black">Create a new project</h2>
          <p className="text-sm text-black/60">Fill in the details</p>
        </section>

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

      <OnboardingFooter onContinue={handleContinue} disabled={!canContinue || submitting} label={submitting ? "Saving..." : "Continue"} />
    </>
  );
}
