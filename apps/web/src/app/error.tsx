"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-lg border border-white/10 bg-black/30 p-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--ember)]">
          System interruption
        </p>
        <h1 className="font-display mt-4 text-4xl">
          The control plane hit an unexpected state.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          {error.message}
        </p>
        <button
          className="mt-8 bg-[var(--signal)] px-4 py-2 text-sm font-semibold text-black"
          onClick={reset}
        >
          Retry operation
        </button>
      </section>
    </main>
  );
}
