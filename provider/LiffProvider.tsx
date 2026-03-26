"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";
import { loginWithAccessToken, getApiToken, resolveLaunchContext } from "@/utils/api";

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
const CTX_TOKEN_KEY = 'santi_ctx';

/** Extract the ctx token from URL (query params or liff.state). */
function extractCtxToken(): string | null {
  const params = new URLSearchParams(window.location.search);

  // 1. Direct URL query param (?ctx=...)
  const direct = params.get('ctx');
  if (direct) {
    sessionStorage.setItem(CTX_TOKEN_KEY, direct);
    return direct;
  }

  // 2. Encoded inside liff.state (LIFF encodes original URL here after login redirect)
  const liffState = params.get('liff.state');
  if (liffState) {
    try {
      const decoded = decodeURIComponent(liffState);
      const stateParams = new URLSearchParams(decoded.split('?')[1] ?? '');
      const fromState = stateParams.get('ctx');
      if (fromState) {
        sessionStorage.setItem(CTX_TOKEN_KEY, fromState);
        return fromState;
      }
    } catch { /* ignore parse errors */ }
  }

  // 3. Check hash fragment as fallback
  if (window.location.hash) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const fromHash = hashParams.get('ctx');
      if (fromHash) {
        sessionStorage.setItem(CTX_TOKEN_KEY, fromHash);
        return fromHash;
      }
    } catch { /* ignore */ }
  }

  // 4. Recover from sessionStorage (survives login redirects)
  return sessionStorage.getItem(CTX_TOKEN_KEY);
}

/** Fallback: try to get groupId from LIFF context or sessionStorage. */
function extractGroupIdFallback(context: ReturnType<typeof liff.getContext> | null): string | null {
  if (context?.type === 'group') {
    const gid = context.groupId ?? null;
    if (gid) sessionStorage.setItem(GROUP_ID_KEY, gid);
    return gid;
  }
  return sessionStorage.getItem(GROUP_ID_KEY);
}

const INTENDED_PATH_KEY = 'santi_intended_path';

/** Save the current path before login redirect so it survives the round-trip. */
function persistIntendedPathBeforeLogin(): void {
  const path = window.location.pathname;
  if (path && path !== '/') {
    sessionStorage.setItem(INTENDED_PATH_KEY, path + window.location.search);
  }
}

/** Save ctx token to sessionStorage before login redirect so it survives the round-trip. */
function persistCtxBeforeLogin(): void {
  extractCtxToken(); // side-effect: saves to sessionStorage if found
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
          persistCtxBeforeLogin();
          persistIntendedPathBeforeLogin();
          liff.login({ redirectUri: window.location.href });
          return;
        }
        const [{ userId, displayName, pictureUrl }, context] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getContext()),
        ]);

        console.log('[LiffProvider] URL:', window.location.href);

        // 1. Try to resolve groupId from launch-context JWT token
        let groupId: string | null = null;
        const ctxToken = extractCtxToken();
        if (ctxToken) {
          const resolved = await resolveLaunchContext(ctxToken);
          if (resolved) {
            groupId = resolved.groupId;
            sessionStorage.setItem(GROUP_ID_KEY, groupId);
            sessionStorage.removeItem(CTX_TOKEN_KEY);
            console.log('[LiffProvider] groupId from launch context:', groupId, '| action:', resolved.action);
          } else {
            console.log('[LiffProvider] Launch context expired or invalid');
            sessionStorage.removeItem(CTX_TOKEN_KEY);
          }
        }

        // 2. Fallback: LIFF context or sessionStorage
        if (!groupId) {
          groupId = extractGroupIdFallback(context);
          // Discard LIFF context UUIDs (contain dashes) — real LINE group IDs start with 'C'
          if (groupId && groupId.includes('-')) {
            console.log('[LiffProvider] Ignoring LIFF context UUID:', groupId);
            groupId = null;
            sessionStorage.removeItem(GROUP_ID_KEY);
          }
          if (groupId) {
            console.log('[LiffProvider] groupId from fallback:', groupId);
          }
        }

        // 3. Exchange LIFF access token for a backend session JWT
        const accessToken = liff.getAccessToken();
        const existingToken = getApiToken();
        if (!existingToken && accessToken) {
          const loginResult = await loginWithAccessToken(accessToken);
          // 4. Last resort: use membership data when context is missing
          if (!groupId && loginResult.groups.length > 0) {
            groupId = loginResult.groups[0];
            sessionStorage.setItem(GROUP_ID_KEY, groupId);
            console.log('[LiffProvider] groupId from membership (fallback):', groupId);
          }
        } else if (!groupId && existingToken && accessToken) {
          const loginResult = await loginWithAccessToken(accessToken);
          if (loginResult.groups.length > 0) {
            groupId = loginResult.groups[0];
            sessionStorage.setItem(GROUP_ID_KEY, groupId);
            console.log('[LiffProvider] groupId from membership (re-login fallback):', groupId);
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
      })
      .catch((error: Error) => {
        setState({ isReady: true, isLoggedIn: false, profile: null, idToken: null, groupId: null, error });
      });
  }, []);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}

export const useLiff = () => useContext(LiffContext);
