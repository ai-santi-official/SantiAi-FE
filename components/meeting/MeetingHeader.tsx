"use client";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = {
  title: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
};

export function MeetingHeader({ title, step, totalSteps, onBack }: Props) {
  return (
    <header className="bg-santi-secondary pt-10 pb-20 px-6 relative">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="p-1 text-black"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-black">{title}</h1>
        <LanguageSwitcher />
      </div>

      <div className="flex justify-center items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={
              i + 1 === step
                ? "bg-santi-primary w-6 h-2 rounded-full"
                : "bg-santi-muted w-2 h-2 rounded-full"
            }
          />
        ))}
      </div>
    </header>
  );
}
