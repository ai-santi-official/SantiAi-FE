export default function MeetingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto min-h-dvh bg-white">
      {children}
    </div>
  );
}
