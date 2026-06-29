export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="w-48">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          Synchronizing
        </p>
        <div className="h-px bg-white/10">
          <div className="signal-line h-px w-full bg-[var(--signal)]" />
        </div>
      </div>
    </main>
  );
}
