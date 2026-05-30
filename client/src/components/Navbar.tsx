import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  Menu, X, Search, Crown, LogOut, Bookmark,
  ChevronDown, Radio, LayoutDashboard, Trophy, Sparkles
} from "lucide-react";

const navLinks = [
  { href: "/",         label: "Home" },
  { href: "/live",     label: "Live TV",          isLive: true },
  { href: "/library",  label: "Library" },
  { href: "/quiz",     label: "Quiz Game" },
  { href: "/schedule", label: "Schedule" },
  { href: "/creator",  label: "Become a Creator", highlight: true },
];

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setMobileOpen(false); }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/library?search=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      {/* ── Announcement bar ─────────────────────────────── */}
      {announcementVisible && (
        <div className="relative z-50 bg-gradient-to-r from-[oklch(0.74_0.21_218/0.15)] via-[oklch(0.56_0.24_290/0.12)] to-[oklch(0.74_0.21_218/0.15)]
          border-b border-[oklch(0.74_0.21_218/0.2)] py-2 px-4 text-center">
          <p className="text-xs text-white/70 font-medium">
            <span className="text-[oklch(0.74_0.21_218)] font-black">NEW:</span>
            {" "}Creators now earn <span className="text-white font-black">70% revenue share</span> from day one.{" "}
            <Link href="/creator" className="text-[oklch(0.74_0.21_218)] font-bold hover:underline">
              Apply now →
            </Link>
          </p>
          <button onClick={() => setAnnouncementVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main header ──────────────────────────────────── */}
      <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        announcementVisible ? "top-[33px]" : "top-0"
      } ${
        scrolled
          ? "bg-[oklch(0.06_0.012_264/0.95)] backdrop-blur-2xl border-b border-white/8 shadow-2xl shadow-black/40"
          : "bg-gradient-to-b from-[oklch(0_0_0/0.8)] to-transparent"
      }`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

          {/* ── Logo ─────────────────────────────────────── */}
          <Link href="/" className="flex items-center shrink-0 group mr-2">
            <img
              src="/manus-storage/ztvlive-logo-primary_27b2d58f.png"
              alt="ZTVLIVE"
              className="h-10 w-auto object-contain transition-all duration-200 group-hover:opacity-90 group-hover:scale-105"
              style={{ maxWidth: 180 }}
            />
          </Link>

          {/* ── Desktop Nav ──────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {navLinks.map((link) => {
              const isActive = location === link.href ||
                (link.href !== "/" && location.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href}>
                  <button className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold
                    transition-all duration-150 whitespace-nowrap ${
                      link.highlight
                        ? "text-[oklch(0.74_0.21_218)] hover:bg-[oklch(0.74_0.21_218/0.08)] border border-[oklch(0.74_0.21_218/0.3)] hover:border-[oklch(0.74_0.21_218/0.5)]"
                        : isActive
                          ? "text-white bg-white/10 border border-white/10"
                          : "text-white/60 hover:text-white hover:bg-white/6"
                    }`}>
                    {link.label}
                    {link.isLive && (
                      <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black
                        uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm shadow-red-500/40">
                        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {link.highlight && (
                      <Sparkles className="w-3 h-3 opacity-70" />
                    )}
                    {isActive && !link.highlight && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[oklch(0.74_0.21_218)]" />
                    )}
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* ── Right controls ───────────────────────────── */}
          <div className="flex items-center gap-1.5 ml-auto">

            {/* Live counter pill */}
            {liveData && (
              <Link href="/live">
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                  bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold
                  hover:bg-red-500/20 hover:border-red-500/40 transition-all cursor-pointer select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  {liveData.count.toLocaleString()} watching
                </div>
              </Link>
            )}

            {/* Search */}
            <button onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                text-white/50 hover:text-white hover:bg-white/8 transition-all text-xs"
              aria-label="Search (⌘K)">
              <Search className="w-4 h-4" />
              <span className="hidden xl:block">Search</span>
              <kbd className="hidden xl:block px-1.5 py-0.5 rounded bg-white/8 text-[10px] text-white/30 font-mono">⌘K</kbd>
            </button>

            {/* ZTVLIVE+ CTA */}
            <Link href="/subscribe">
              <button className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black
                bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white
                hover:opacity-90 active:scale-95 transition-all duration-150
                shadow-lg shadow-[oklch(0.74_0.21_218/0.3)]">
                <Crown className="w-3.5 h-3.5" />
                ZTVLIVE+
              </button>
            </Link>

            {/* Auth */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full
                    hover:bg-white/8 border border-transparent hover:border-white/10 transition-all">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-gradient-to-br from-[oklch(0.74_0.21_218/0.5)] to-[oklch(0.56_0.24_290/0.5)]
                        text-[oklch(0.74_0.21_218)] text-xs font-black border border-[oklch(0.74_0.21_218/0.4)]">
                        {(user.name ?? "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-3 h-3 text-white/40 hidden md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end"
                  className="w-56 bg-[oklch(0.09_0.014_264/0.98)] backdrop-blur-2xl border-white/10 text-white shadow-2xl shadow-black/60 rounded-xl">
                  <div className="px-3 py-3 border-b border-white/8">
                    <p className="text-sm font-bold truncate text-white">{user.name}</p>
                    <p className="text-xs text-white/35 truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem asChild>
                      <Link href="/watchlist" className="flex items-center gap-2.5 cursor-pointer text-white/65 hover:text-white rounded-lg px-2 py-2">
                        <Bookmark className="w-4 h-4 text-white/35" /> My Watchlist
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/quiz" className="flex items-center gap-2.5 cursor-pointer text-white/65 hover:text-white rounded-lg px-2 py-2">
                        <Trophy className="w-4 h-4 text-white/35" /> Quiz Scores
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/creator/dashboard" className="flex items-center gap-2.5 cursor-pointer text-white/65 hover:text-white rounded-lg px-2 py-2">
                        <LayoutDashboard className="w-4 h-4 text-white/35" /> Creator Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/subscribe" className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-2
                        text-[oklch(0.74_0.21_218)] hover:bg-[oklch(0.74_0.21_218/0.08)]">
                        <Crown className="w-4 h-4" /> Upgrade to ZTVLIVE+
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-white/8 mx-1" />
                  <div className="p-1">
                    <DropdownMenuItem onClick={() => logout()}
                      className="flex items-center gap-2.5 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10 rounded-lg px-2 py-2">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/signin">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
                    border border-white/12 text-white/75 hover:text-white hover:border-white/25 hover:bg-white/6
                    transition-all duration-150 active:scale-95">
                  Sign In
                </button>
              </Link>
            )}

            {/* Mobile toggle */}
            <button className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Nav ───────────────────────────────────── */}
        {mobileOpen && (
          <div className="lg:hidden bg-[oklch(0.07_0.012_264/0.99)] backdrop-blur-2xl border-t border-white/8 px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                  <button className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold
                    transition-all ${
                      link.highlight
                        ? "text-[oklch(0.74_0.21_218)] bg-[oklch(0.74_0.21_218/0.08)] border border-[oklch(0.74_0.21_218/0.2)]"
                        : isActive
                          ? "text-white bg-white/10"
                          : "text-white/65 hover:text-white hover:bg-white/6"
                    }`}>
                    <span className="flex items-center gap-2">
                      {link.label}
                      {link.highlight && <Sparkles className="w-3 h-3 opacity-60" />}
                    </span>
                    {link.isLive && (
                      <span className="flex items-center gap-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </button>
                </Link>
              );
            })}

            {/* Mobile bottom CTAs */}
            <div className="pt-3 border-t border-white/8 flex gap-2">
              <Link href="/subscribe" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white border-0 text-xs font-black shadow-lg shadow-[oklch(0.74_0.21_218/0.3)]">
                  <Crown className="w-3.5 h-3.5 mr-1.5" /> ZTVLIVE+
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link href="/signin" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="outline"
                    className="w-full border-white/15 text-white/80 text-xs hover:bg-white/8">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            {/* Live counter in mobile */}
            {liveData && (
              <Link href="/live" onClick={() => setMobileOpen(false)}>
                <div className="flex items-center justify-center gap-2 py-2 text-red-400 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {liveData.count.toLocaleString()} watching live right now
                </div>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ── Search overlay ───────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[200]"
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[oklch(0.04_0.008_264/0.92)] backdrop-blur-xl" />

          {/* Search panel */}
          <div className="relative flex justify-center pt-20 px-4">
            <div className="w-full max-w-2xl scale-in">
              <form onSubmit={handleSearch}>
                <div className="flex items-center gap-3 bg-[oklch(0.11_0.016_264)] border border-[oklch(0.74_0.21_218/0.45)]
                  rounded-2xl px-5 py-4 shadow-2xl shadow-[oklch(0.74_0.21_218/0.2)]">
                  <Search className="w-5 h-5 text-[oklch(0.74_0.21_218)] flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos, creators, categories..."
                    className="flex-1 bg-transparent text-white placeholder-white/25 text-lg outline-none"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")}
                      className="text-white/35 hover:text-white transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[oklch(0.74_0.21_218)] text-[oklch(0.06_0.012_264)]
                      text-sm font-black hover:opacity-90 active:scale-95 transition-all">
                    Search
                  </button>
                </div>
              </form>

              {/* Suggested tags */}
              <div className="mt-4">
                <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-2 px-1">Browse by category</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Tech", color: "oklch(0.74 0.21 218)" },
                    { label: "Gaming", color: "oklch(0.65 0.25 290)" },
                    { label: "Sports", color: "oklch(0.65 0.22 150)" },
                    { label: "Movies", color: "oklch(0.78 0.18 60)" },
                    { label: "Music", color: "oklch(0.7 0.2 320)" },
                    { label: "Podcasts", color: "oklch(0.7 0.18 200)" },
                    { label: "News", color: "oklch(0.72 0.2 25)" },
                    { label: "Live", color: "oklch(0.65 0.25 25)" },
                  ].map((tag) => (
                    <button key={tag.label}
                      onClick={() => {
                        window.location.href = `/library?category=${tag.label.toLowerCase()}`;
                        setSearchOpen(false);
                      }}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/6 border border-white/8
                        hover:bg-white/12 hover:border-white/18 transition-all"
                      style={{ color: tag.color }}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-white/20 mt-5">Press <kbd className="px-1.5 py-0.5 rounded bg-white/8 font-mono">Esc</kbd> to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to push content below fixed header */}
      <div style={{ height: announcementVisible ? "97px" : "64px" }} />
    </>
  );
}
