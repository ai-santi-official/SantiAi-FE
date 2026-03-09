"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type LiffState = {
  isReady: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  groupId: string | null;
  error: Error | null;
};

const LiffContext = createContext<LiffState>({
  isReady: false,
  isLoggedIn: false,
  profile: null,
  groupId: null,
  error: null,
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffState>({
    isReady: false,
    isLoggedIn: false,
    profile: null,
    groupId: null,
    error: null,
  });

  useEffect(() => {
    liff
      .init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
      .then(async () => {
        const isLoggedIn = liff.isLoggedIn();
        if (!isLoggedIn) {
          liff.login();
          return;
        }
        const [{ userId, displayName, pictureUrl }, context] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getContext()),
        ]);
        const groupId = context?.type === 'group' ? context.groupId : null;
        setState({
          isReady: true,
          isLoggedIn: true,
          profile: { userId, displayName, pictureUrl },
          groupId: groupId ?? null,
          error: null,
        });
      })
      .catch((error: Error) => {
        setState({ isReady: true, isLoggedIn: false, profile: null, groupId: null, error });
      });
  }, []);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}

export const useLiff = () => useContext(LiffContext);
