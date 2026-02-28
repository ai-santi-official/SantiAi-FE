type Props = {
  onContinue: () => void;
  disabled?: boolean;
  label?: string;
};

export function OnboardingFooter({
  onContinue,
  disabled = false,
  label = "Continue",
}: Props) {
  return (
    <>
      {/* Spacer so content isn't hidden behind the fixed footer */}
      <div
        className="h-32"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      />

      <footer className="fixed bottom-0 left-0 w-full footer-safe bg-white/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto">
          <button
            onClick={onContinue}
            disabled={disabled}
            className="w-full bg-santi-primary py-4 rounded-santi font-bold text-lg text-black active:scale-[0.98] transition-transform btn-elevation disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        </div>
      </footer>
    </>
  );
}
