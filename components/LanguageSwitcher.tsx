"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();

  const switchLocale = () => {
    const next = locale === "th" ? "en" : "th";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <button
      onClick={switchLocale}
      aria-label="Switch language"
      className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/60 backdrop-blur-sm text-black/70 active:bg-white/80 transition-colors"
    >
      <GlobeIcon className="w-4 h-4" />
      <span className="text-xs font-bold uppercase">{locale === "th" ? "EN" : "TH"}</span>
    </button>
  );
}
