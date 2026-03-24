"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";
import { setApiToken } from "@/utils/api";

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type LiffState = {
  isReady: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  idToken: string | null;
  groupId: string | null;
  error: Error | null;
};

const LiffContext = createContext<LiffState>({
  isReady: false,
  isLoggedIn: false,
  profile: null,
  idToken: null,
  groupId: null,
  error: null,
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffState>({
    isReady: false,
    isLoggedIn: false,
    profile: null,
    idToken: null,
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
        // Prefer groupId from URL params (set by the bot webhook) over LIFF context,
        // because LIFF context may return a different ID than the webhook groupId.
        const urlGroupId = new URLSearchParams(window.location.search).get('groupId');
        const liffGroupId = context?.type === 'group' ? context.groupId : null;
        const groupId = urlGroupId ?? liffGroupId;
        const idToken = liff.getIDToken();
        setApiToken(idToken);
        setState({
          isReady: true,
          isLoggedIn: true,
          profile: { userId, displayName, pictureUrl },
          idToken: idToken ?? null,
          groupId: groupId ?? null,
          error: null,
        });
      })
      .catch((error: Error) => {
        setState({ isReady: true, isLoggedIn: false, profile: null, idToken: null, groupId: null, error });
      });
  }, []);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}

export const useLiff = () => useContext(LiffContext);
