"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root page — redirects to the correct route.
 *
 * When LIFF redirects after login, the original path (e.g. /approval/PROJECT_ID)
 * is encoded in the `liff.state` query param and the app lands on `/`.
 * We extract that path here so the user reaches the intended page.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 1. Check liff.state in URL (set by LIFF after login redirect)
    const params = new URLSearchParams(window.location.search);
    const liffState = params.get("liff.state");
    if (liffState) {
      try {
        const decoded = decodeURIComponent(liffState);
        const path = decoded.split("?")[0] || decoded;
        if (path && path !== "/") {
          console.log("[Home] Redirecting to liff.state path:", decoded);
          router.replace(decoded);
          return;
        }
      } catch { /* ignore */ }
    }

    // 2. Check sessionStorage for intended path saved before login redirect
    const intended = sessionStorage.getItem("santi_intended_path");
    if (intended) {
      sessionStorage.removeItem("santi_intended_path");
      const path = intended.split("?")[0];
      if (path && path !== "/") {
        console.log("[Home] Redirecting to saved intended path:", intended);
        router.replace(intended);
        return;
      }
    }

    // 3. Default: go to onboarding
    router.replace("/onboarding");
  }, [router]);

  return null;
}
