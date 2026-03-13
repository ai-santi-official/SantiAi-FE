import { OnboardingProvider } from "@/provider/OnboardingProvider";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <div className="max-w-md mx-auto min-h-dvh bg-white">
        {children}
      </div>
    </OnboardingProvider>
  );
}
