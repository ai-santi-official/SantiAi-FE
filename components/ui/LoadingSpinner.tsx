"use client";

type Props = {
  message?: string;
  /** "page" = full-screen centered, "inline" = smaller inline, "overlay" = modal with backdrop */
  variant?: "page" | "inline" | "overlay";
};

export default function LoadingSpinner({ message = "Loading...", variant = "page" }: Props) {
  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-santi-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-black font-semibold text-lg">{message}</p>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center gap-3 py-8">
        <div className="w-6 h-6 border-3 border-santi-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-black/60">{message}</p>
      </div>
    );
  }

  // "page" variant
  return (
    <div className="flex flex-col min-h-dvh items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-santi-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-santi-muted font-medium">{message}</p>
    </div>
  );
}
