type Props = {
  onContinue: () => void;
  disabled?: boolean;
  label?: string;
  /** Set true when a BottomNav is present so the button sits above it */
  withNav?: boolean;
};

export function OnboardingFooter({
  onContinue,
  disabled = false,
  label = "Continue",
  withNav = false,
}: Props) {
  return (
    <>
      {/* Spacer so content isn't hidden behind the fixed footer(s) */}
      <div
        className={withNav ? "h-48" : "h-32"}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      />

      <footer
        className="fixed left-0 w-full footer-safe bg-white/80 backdrop-blur-sm"
        style={{ bottom: withNav ? "60px" : "0px" }}
      >
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
