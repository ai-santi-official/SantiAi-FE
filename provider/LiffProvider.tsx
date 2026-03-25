"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithAccessToken, getApiToken } from "@/utils/api";

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

const INTENDED_PATH_KEY = 'santi_intended_path';

/** Extract the intended route path from liff.state (set after login redirect). */
function extractIntendedPath(): string | null {
  const params = new URLSearchParams(window.location.search);
  const liffState = params.get('liff.state');
  if (liffState) {
    try {
      const decoded = decodeURIComponent(liffState);
      // liff.state contains the original path, e.g. "/approval/PROJECT_ID?groupId=..."
      const pathPart = decoded.split('?')[0] || decoded;
      if (pathPart && pathPart !== '/') {
        return pathPart;
      }
    } catch { /* ignore */ }
  }
  // Check sessionStorage for path saved before login redirect
  return sessionStorage.getItem(INTENDED_PATH_KEY);
}

/** Save the current path before login redirect so it survives the round-trip. */
function persistIntendedPathBeforeLogin(): void {
  const path = window.location.pathname;
  if (path && path !== '/') {
    sessionStorage.setItem(INTENDED_PATH_KEY, path + window.location.search);
  }
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
  const router = useRouter();
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
          persistIntendedPathBeforeLogin();
          liff.login({ redirectUri: window.location.href });
          return;
        }
        const [{ userId, displayName, pictureUrl }, context] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getContext()),
        ]);
        // Extract groupId from multiple sources — LIFF may encode params in liff.state
        // during login redirects, losing the original ?groupId= query param.
        let groupId = extractGroupId(context);
        console.log('[LiffProvider] URL:', window.location.href);
        console.log('[LiffProvider] groupId resolved:', groupId, '| LIFF context type:', context?.type);

        // If groupId looks like a LIFF context UUID (contains dashes), discard it.
        // Real LINE group IDs start with 'C' and have no dashes.
        if (groupId && groupId.includes('-')) {
          console.log('[LiffProvider] Ignoring LIFF context UUID:', groupId);
          groupId = null;
          sessionStorage.removeItem(GROUP_ID_KEY);
        }

        // Exchange LIFF access token for a backend session JWT
        const accessToken = liff.getAccessToken();
        const existingToken = getApiToken();
        if (!existingToken && accessToken) {
          const loginResult = await loginWithAccessToken(accessToken);
          // If groupId wasn't found from URL, use the user's group from backend
          if (!groupId && loginResult.groups.length > 0) {
            groupId = loginResult.groups[0];
            sessionStorage.setItem(GROUP_ID_KEY, groupId);
            console.log('[LiffProvider] groupId from backend:', groupId);
          }
        } else if (!groupId && existingToken && accessToken) {
          // Already logged in but no valid groupId — fetch groups from backend
          const loginResult = await loginWithAccessToken(accessToken);
          if (loginResult.groups.length > 0) {
            groupId = loginResult.groups[0];
            sessionStorage.setItem(GROUP_ID_KEY, groupId);
            console.log('[LiffProvider] groupId from backend (re-login):', groupId);
          }
        }

        setState({
          isReady: true,
          isLoggedIn: true,
          profile: { userId, displayName, pictureUrl },
          idToken: accessToken ?? null,
          groupId: groupId ?? null,
          error: null,
        });

        // Restore intended route after login redirect (e.g. /approval/PROJECT_ID)
        const intendedPath = extractIntendedPath();
        if (intendedPath) {
          sessionStorage.removeItem(INTENDED_PATH_KEY);
          const targetPath = intendedPath.split('?')[0];
          // Only navigate if we're not already on the intended page
          if (targetPath !== window.location.pathname) {
            console.log('[LiffProvider] Restoring intended path:', intendedPath);
            router.replace(intendedPath);
          }
        }
      })
      .catch((error: Error) => {
        setState({ isReady: true, isLoggedIn: false, profile: null, idToken: null, groupId: null, error });
      });
  }, []);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}

export const useLiff = () => useContext(LiffContext);
