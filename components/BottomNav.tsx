"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

function SparklesIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5Z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  );
}

function CalendarNavIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function EditNavIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "smart-planner", key: "smartPlanner" as const, href: "/onboarding", Icon: SparklesIcon },
  { id: "meetings", key: "newMeeting" as const, href: "/meeting", Icon: CalendarNavIcon },
  { id: "info-edit", key: "infoEdit" as const, href: "/info-edit", Icon: EditNavIcon },
] as const;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const activeId =
    pathname === "/onboarding" ? "smart-planner"
    : pathname.startsWith("/meeting") ? "meetings"
    : pathname.startsWith("/info-edit") ? "info-edit"
    : null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/90 backdrop-blur-sm border-t border-santi-muted/20">
      <div
        className="flex justify-around items-center px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {NAV_ITEMS.map(({ id, key, href, Icon }) => {
          const active = activeId === id;
          return (
            <button
              key={id}
              onClick={() => router.push(href)}
              className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-santi-primary" : "text-santi-muted"}`}
            >
              <Icon active={active} />
              <span className={`text-[10px] uppercase tracking-wider ${active ? "font-bold" : "font-medium"}`}>
                {t(key)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
