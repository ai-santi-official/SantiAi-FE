"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";
import { loginWithIdToken, getApiToken } from "@/utils/api";

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

const GROUP_ID_KEY = 'santi_groupId';

/** Try multiple sources for the LINE group ID (webhook-provided, not LIFF context UUID). */
function extractGroupId(context: ReturnType<typeof liff.getContext> | null): string | null {
  // 1. Direct URL query param (?groupId=C685...)
  const params = new URLSearchParams(window.location.search);
  const direct = params.get('groupId');
  if (direct) {
    sessionStorage.setItem(GROUP_ID_KEY, direct);
    return direct;
  }

  // 2. Encoded inside liff.state (LIFF encodes original URL here after login redirect)
  const liffState = params.get('liff.state');
  if (liffState) {
    try {
      const decoded = decodeURIComponent(liffState);
      const stateParams = new URLSearchParams(decoded.split('?')[1] ?? '');
      const fromState = stateParams.get('groupId');
      if (fromState) {
        sessionStorage.setItem(GROUP_ID_KEY, fromState);
        return fromState;
      }
    } catch { /* ignore parse errors */ }
  }

  // 3. Check hash fragment as fallback
  if (window.location.hash) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const fromHash = hashParams.get('groupId');
      if (fromHash) {
        sessionStorage.setItem(GROUP_ID_KEY, fromHash);
        return fromHash;
      }
    } catch { /* ignore */ }
  }

  // 4. LIFF context (may return a different ID than webhook — last resort)
  if (context?.type === 'group') {
    const gid = context.groupId ?? null;
    if (gid) sessionStorage.setItem(GROUP_ID_KEY, gid);
    return gid;
  }

  // 5. Recover from sessionStorage (survives login redirects)
  return sessionStorage.getItem(GROUP_ID_KEY);
}

/** Save groupId to sessionStorage before login redirect so it survives the round-trip. */
function persistGroupIdBeforeLogin(): void {
  // Use the same extraction logic (without LIFF context) to find groupId from any URL source
  const groupId = extractGroupId(null);
  if (groupId) {
    sessionStorage.setItem(GROUP_ID_KEY, groupId);
  }
}

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
          console.log('[LiffProvider] Not logged in. URL before login:', window.location.href);
          persistGroupIdBeforeLogin();
          liff.login({ redirectUri: window.location.href });
          return;
        }
        const [{ userId, displayName, pictureUrl }, context] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getContext()),
        ]);
        // Extract groupId from multiple sources — LIFF may encode params in liff.state
        // during login redirects, losing the original ?groupId= query param.
        const groupId = extractGroupId(context);
        console.log('[LiffProvider] URL:', window.location.href);
        console.log('[LiffProvider] groupId resolved:', groupId, '| LIFF context type:', context?.type);

        // Exchange LIFF ID token for a backend session JWT (only if we don't already have one)
        const idToken = liff.getIDToken();
        const existingToken = getApiToken();
        if (!existingToken && idToken) {
          await loginWithIdToken(idToken);
        }

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
