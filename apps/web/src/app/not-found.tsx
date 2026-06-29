import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-sm text-[var(--signal)]">
          404 / UNKNOWN COORDINATE
        </p>
        <h1 className="font-display mt-4 text-6xl">
          Nothing is registered here.
        </h1>
        <Link
          className="mt-8 inline-block border-b border-[var(--signal)] pb-1 text-sm"
          href="/dashboard"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
