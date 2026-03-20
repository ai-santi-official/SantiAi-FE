"use client";

import { createContext, useContext, useState } from "react";

type ProjectDetail = {
  name: string;
  deadline: string;
  detail: string;
  deliverables: string;
};

type OnboardingState = {
  projectId: string | null;
  memberIds: string[];
  projectDetail: ProjectDetail;
  safeguardPassed: boolean;
};

type OnboardingActions = {
  setProjectId: (id: string) => void;
  setMemberIds: (ids: string[]) => void;
  setProjectDetail: (detail: ProjectDetail) => void;
  setSafeguardPassed: (passed: boolean) => void;
};

const OnboardingContext = createContext<(OnboardingState & OnboardingActions) | null>(null);

const defaultProjectDetail: ProjectDetail = {
  name: "",
  deadline: "",
  detail: "",
  deliverables: "",
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    projectId: null,
    memberIds: [],
    projectDetail: defaultProjectDetail,
    safeguardPassed: false,
  });

  const setProjectId = (id: string) =>
    setState((prev) => ({ ...prev, projectId: id }));

  const setMemberIds = (ids: string[]) =>
    setState((prev) => ({ ...prev, memberIds: ids }));

  const setProjectDetail = (projectDetail: ProjectDetail) =>
    setState((prev) => ({ ...prev, projectDetail }));

  const setSafeguardPassed = (passed: boolean) =>
    setState((prev) => ({ ...prev, safeguardPassed: passed }));

  return (
    <OnboardingContext.Provider value={{ ...state, setProjectId, setMemberIds, setProjectDetail, setSafeguardPassed }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
