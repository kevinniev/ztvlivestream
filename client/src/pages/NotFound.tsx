import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <>
      <SEO
        title="Page Not Found — ZTVLIVE"
        description="The page you're looking for doesn't exist on ZTVLIVE. Browse our live TV, video library, or return to the homepage."
        url="/404"
        noIndex
      />
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--accent-blue)]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center px-4 relative z-10">
          <p className="text-[oklch(0.72_0.2_220)] text-sm font-semibold tracking-widest uppercase mb-4">404 — Page Not Found</p>
          <h1 className="text-7xl sm:text-9xl font-black text-white mb-4 leading-none">404</h1>
          <p className="text-white/50 text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setLocation("/")}
              className="px-8 py-3 rounded-xl bg-[var(--accent-blue)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Go Home
            </button>
            <button
              onClick={() => setLocation("/library")}
              className="px-8 py-3 rounded-xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-colors"
            >
              Browse Library
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
