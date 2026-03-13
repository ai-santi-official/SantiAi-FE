"use client";

import { createContext, useContext, useState } from "react";

type OnboardingState = {
  projectId: string | null;
  memberIds: string[];
};

type OnboardingActions = {
  setProjectId: (id: string) => void;
  setMemberIds: (ids: string[]) => void;
};

const OnboardingContext = createContext<(OnboardingState & OnboardingActions) | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    projectId: null,
    memberIds: [],
  });

  const setProjectId = (id: string) =>
    setState((prev) => ({ ...prev, projectId: id }));

  const setMemberIds = (ids: string[]) =>
    setState((prev) => ({ ...prev, memberIds: ids }));

  return (
    <OnboardingContext.Provider value={{ ...state, setProjectId, setMemberIds }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
