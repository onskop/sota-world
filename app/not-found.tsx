import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="main-wrapper">
      <div className="glass-card p-12 text-center space-y-6">
        <h1 className="text-4xl font-display font-semibold text-electric">Signal Lost</h1>
        <p className="text-slate-300 max-w-xl mx-auto">
          The page you’re looking for drifted beyond our radar. Navigate back to the intelligence hub to review the latest
          reports.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-electric/20 text-electric font-semibold uppercase tracking-[0.3em] hover:bg-electric/30"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
