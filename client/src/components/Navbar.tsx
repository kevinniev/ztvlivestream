import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
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
  Tv,
  Library,
  GamepadIcon,
  Calendar,
  Users,
  Menu,
  X,
  Search,
  Crown,
  LogOut,
  User,
  Bookmark,
  ChevronDown,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live TV", icon: Tv },
  { href: "/library", label: "Library", icon: Library },
  { href: "/quiz", label: "Quiz Game", icon: GamepadIcon },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/creator", label: "Become a Creator", icon: Users, highlight: true },
];

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/library?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[oklch(0.08_0.01_264/0.95)] backdrop-blur-md border-b border-white/5"
          : "bg-gradient-to-b from-[oklch(0_0_0/0.8)] to-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <div className="relative">
            <span className="text-2xl font-black tracking-tight gradient-text">ZTV</span>
            <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[oklch(0.6_0.22_25)] animate-pulse" />
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                link.highlight
                  ? "text-[oklch(0.72_0.2_220)] hover:bg-[oklch(0.72_0.2_220/0.1)] border border-[oklch(0.72_0.2_220/0.3)]"
                  : location === link.href
                  ? "text-white bg-white/10"
                  : "text-[oklch(0.75_0.02_264)] hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Live counter */}
          {liveData && (
            <Link
              href="/live"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[oklch(0.6_0.22_25/0.15)] border border-[oklch(0.6_0.22_25/0.4)] text-xs font-semibold text-[oklch(0.75_0.15_25)] hover:bg-[oklch(0.6_0.22_25/0.25)] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.6_0.22_25)] animate-pulse" />
              {liveData.count.toLocaleString()} watching
            </Link>
          )}

          {/* Search */}
          <div className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ZTVLIVE..."
                  className="w-48 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-[oklch(0.72_0.2_220/0.6)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="ml-1 p-1.5 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-white/60 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ZTVLIVE+ */}
          <Link href="/subscribe">
            <Button
              size="sm"
              className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 font-semibold text-xs px-3 hover:opacity-90"
            >
              <Crown className="w-3.5 h-3.5" />
              ZTVLIVE+
            </Button>
          </Link>

          {/* Auth */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[oklch(0.72_0.2_220/0.3)] text-[oklch(0.72_0.2_220)] text-xs font-bold">
                      {(user.name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-white/60 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-[oklch(0.11_0.015_264)] border-white/10 text-white"
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/watchlist" className="flex items-center gap-2 cursor-pointer">
                    <Bookmark className="w-4 h-4" /> My Watchlist
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/creator/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" /> Creator Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscribe" className="flex items-center gap-2 cursor-pointer text-[oklch(0.72_0.2_220)]">
                    <Crown className="w-4 h-4" /> Upgrade to ZTVLIVE+
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 text-xs"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Sign In
            </Button>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-[oklch(0.09_0.012_264/0.98)] backdrop-blur-md border-t border-white/5 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                link.highlight
                  ? "text-[oklch(0.72_0.2_220)] bg-[oklch(0.72_0.2_220/0.08)]"
                  : location === link.href
                  ? "text-white bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.icon && <link.icon className="w-4 h-4" />}
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10 flex gap-2">
            <Link href="/subscribe" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 text-xs">
                <Crown className="w-3.5 h-3.5 mr-1" /> ZTVLIVE+
              </Button>
            </Link>
            {!isAuthenticated && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 text-white text-xs"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
