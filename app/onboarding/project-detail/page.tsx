"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { DatePicker } from "@/components/ui/DatePicker";
import { SparklesIcon, WarningIcon } from "@/components/icons";
import { useOnboarding } from "@/provider/OnboardingProvider";
import { apiFetch } from "@/utils/api";

export default function ProjectDetailPage() {
  const router = useRouter();
  const { projectId, projectDetail, setProjectDetail, safeguardPassed, setSafeguardPassed } = useOnboarding();
  const [name, setName] = useState(projectDetail.name);
  const [deadline, setDeadline] = useState(projectDetail.deadline);
  const [detail, setDetail] = useState(projectDetail.detail);
  const [deliverables, setDeliverables] = useState(projectDetail.deliverables);
  const [submitting, setSubmitting] = useState(false);
  const [safeguardReason, setSafeguardReason] = useState<string | null>(null);

  const syncProjectDetail = () => {
    setProjectDetail({ name, deadline, detail, deliverables });
  };

  const isModified =
    name !== projectDetail.name ||
    deadline !== projectDetail.deadline ||
    detail !== projectDetail.detail ||
    deliverables !== projectDetail.deliverables;

  const canContinue =
    name.trim() !== "" &&
    deadline !== "" &&
    detail.trim() !== "" &&
    deliverables.trim() !== "";

  const handleContinue = async () => {
    if (!projectId) return;

    // Skip safeguard if already passed and nothing changed
    if (safeguardPassed && !isModified) {
      syncProjectDetail();
      router.push("/onboarding/member-preferences");
      return;
    }

    setSubmitting(true);
    try {
      const safeguardRes = await apiFetch(`/api/v1/ai/safeguards/projects/${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          project_name: name,
          final_due_date: deadline,
          final_deliverable: deliverables,
          project_detail: detail,
        }),
      });

      if (!safeguardRes.ok) throw new Error(`Safeguard check failed: ${safeguardRes.status}`);

      const safeguardData = await safeguardRes.json();

      if (!safeguardData.is_valid_project) {
        setSafeguardReason(safeguardData.reason);
        return;
      }

      setSafeguardPassed(true);
      syncProjectDetail();
      router.push("/onboarding/member-preferences");
    } catch (err) {
      console.error("Failed to validate project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedAnyway = async () => {
    if (!projectId) return;
    setSafeguardReason(null);
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
      setSafeguardPassed(true);
      syncProjectDetail();
      router.push("/onboarding/member-preferences");
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseTemplate = () => {
    const template = [
      "เป้าหมายของโปรเจกต์: [ระบุเป้าหมายหลักของโปรเจกต์]",
      "ขอบเขตงาน: [ระบุขอบเขตและหน้าที่หลักของโปรเจกต์]",
      "เครื่องมือที่ใช้: [ระบุเครื่องมือหรือเทคโนโลยีที่ใช้ เช่น Figma, Google Docs]",
      "ข้อจำกัดหรือเงื่อนไขพิเศษ: [ระบุข้อจำกัดด้านเวลา งบประมาณ หรืออื่นๆ]",
    ].join("\n");
    setDetail(template);
    setSafeguardReason(null);
  };

  const reasonLines = safeguardReason
    ? safeguardReason.split("\n").filter((line) => line.trim() !== "")
    : [];

  return (
    <>
      <OnboardingHeader step={2} totalSteps={3} onBack={() => { syncProjectDetail(); router.back(); }} />

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

      <OnboardingFooter onContinue={handleContinue} disabled={!canContinue || submitting} label={submitting ? "Checking..." : "Continue"} />

      {safeguardReason && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden w-full max-w-md border border-slate-100">
            {/* Yellow header */}
            <div className="bg-santi-secondary px-6 py-8 flex items-center gap-4">
              <div className="flex-shrink-0 bg-white p-2 rounded-full flex items-center justify-center">
                <WarningIcon className="w-7 h-7 text-santi-primary" />
              </div>
              <h2 className="text-black text-2xl font-bold leading-tight">Wait a moment!</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-black/60 text-base leading-relaxed mb-6">
                It looks like some details are still missing. Having these will help Santi plan better for you.
              </p>

              {/* Bullet list */}
              <div className="space-y-4 mb-8">
                {reasonLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-santi-primary flex-shrink-0" />
                    <span className="text-black/80 font-medium">{line}</span>
                  </div>
                ))}
              </div>

              {/* Use template button */}
              <button
                onClick={handleUseTemplate}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-dashed border-santi-primary bg-santi-primary/10 text-black text-sm font-bold mb-3 flex items-center justify-center gap-2"
              >
                <SparklesIcon className="w-4 h-4 text-santi-primary" />
                Use template for project details
              </button>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleProceedAnyway}
                  className="flex-1 px-4 py-3.5 rounded-xl border-2 border-santi-muted text-black/60 text-sm font-bold"
                >
                  Proceed anyway
                </button>
                <button
                  onClick={() => setSafeguardReason(null)}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-santi-primary text-black text-sm font-bold"
                >
                  Add details
                </button>
              </div>
            </div>

            {/* Bottom handle */}
            <div className="pb-3 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
