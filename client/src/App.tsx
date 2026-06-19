import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import Home from "./pages/Home";
import LiveTV from "./pages/LiveTV";
import Library from "./pages/Library";
import Quiz from "./pages/Quiz";
import Schedule from "./pages/Schedule";
import Watch from "./pages/Watch";
import CreatorHub from "./pages/CreatorHub";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorBookSlot from "./pages/CreatorBookSlot";
import CreatorRights from "./pages/CreatorRights";
import Subscribe from "./pages/Subscribe";
import Watchlist from "./pages/Watchlist";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import DMCA from "./pages/legal/DMCA";
import ContentGuidelines from "./pages/legal/ContentGuidelines";
import CommunityGuidelines from "./pages/legal/CommunityGuidelines";
import AdPolicy from "./pages/legal/AdPolicy";
import TrustCenter from "./pages/legal/TrustCenter";
import CreatorScout from "./pages/CreatorScout";
import Studio from "./pages/Studio";
import CommunityCutWeekly from "./pages/CommunityCutWeekly";
import SMSSubscribe from "./pages/SMSSubscribe";
import PhoneVerify from "./pages/PhoneVerify";
import SocialMedia from "./pages/SocialMedia";
import Admin from "./pages/Admin";
import LiveWatch from "./pages/LiveWatch";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// LiveLayout: full-viewport layout for Live TV — no footer, player fills remaining height after navbar
function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <Navbar noSpacer />
      {/* The Navbar is fixed-position; this spacer compensates for it */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col" style={{ paddingTop: "var(--navbar-height, 64px)" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Detects ?auth=1 in the URL after OAuth redirect, forces a refetch of auth state,
 * and shows a personalized welcome toast once the user data is available.
 */
function AuthRedirectHandler() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const toastFiredRef = useRef(false);
  const pendingWelcomeRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "1") {
      pendingWelcomeRef.current = true;
      // Invalidate and refetch the auth.me query so the navbar updates
      utils.auth.me.invalidate().then(() => {
        // Remove the ?auth=1 param from the URL without triggering a reload
        const url = new URL(window.location.href);
        url.searchParams.delete("auth");
        window.history.replaceState({}, "", url.toString());
      });
    }
  }, [utils]);

  // Fire the welcome toast once user data arrives after OAuth redirect
  useEffect(() => {
    if (!pendingWelcomeRef.current) return;
    if (!user) return;
    if (toastFiredRef.current) return;
    toastFiredRef.current = true;
    pendingWelcomeRef.current = false;
    const firstName = user.name?.split(" ")[0] ?? "there";
    toast.success(`Welcome back, ${firstName}!`, {
      duration: 3000,
    });
  }, [user]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><Home /></Layout>} />
      <Route path="/live" component={() => <LiveLayout><LiveTV /></LiveLayout>} />
      <Route path="/library" component={() => <Layout><Library /></Layout>} />
      <Route path="/quiz" component={() => <Layout><Quiz /></Layout>} />
      <Route path="/schedule" component={() => <Layout><Schedule /></Layout>} />
      <Route path="/watch/:id" component={() => <Layout><Watch /></Layout>} />
      <Route path="/creator" component={() => <Layout><CreatorHub /></Layout>} />
      <Route path="/creator/dashboard" component={() => <Layout><CreatorDashboard /></Layout>} />
      <Route path="/creator/book-slot" component={() => <Layout><CreatorBookSlot /></Layout>} />
      <Route path="/creator/rights" component={() => <Layout><CreatorRights /></Layout>} />
      <Route path="/subscribe" component={() => <Layout><Subscribe /></Layout>} />
      <Route path="/subscribe/success" component={() => <Layout><Subscribe /></Layout>} />
      <Route path="/watchlist" component={() => <Layout><Watchlist /></Layout>} />
      <Route path="/signin" component={() => <SignIn />} />
      <Route path="/signup" component={() => <SignUp />} />
      <Route path="/terms" component={() => <Layout><Terms /></Layout>} />
      <Route path="/privacy" component={() => <Layout><Privacy /></Layout>} />
      <Route path="/dmca" component={() => <Layout><DMCA /></Layout>} />
      <Route path="/content-guidelines" component={() => <Layout><ContentGuidelines /></Layout>} />
      <Route path="/community-guidelines" component={() => <Layout><CommunityGuidelines /></Layout>} />
      <Route path="/ad-policy" component={() => <Layout><AdPolicy /></Layout>} />
      <Route path="/trust-center" component={() => <Layout><TrustCenter /></Layout>} />
      <Route path="/admin/creator-scout" component={() => <CreatorScout />} />
      <Route path="/studio" component={() => <Studio />} />
      <Route path="/live/:id" component={() => <Layout><LiveWatch /></Layout>} />
      <Route path="/social" component={() => <Layout><SocialMedia /></Layout>} />
      <Route path="/admin" component={() => <Admin />} />
      <Route path="/shows/communitycut-weekly" component={() => <Layout><CommunityCutWeekly /></Layout>} />
      <Route path="/sms-subscribe" component={() => <SMSSubscribe />} />
      <Route path="/verify-phone" component={() => <PhoneVerify />} />
      <Route path="/404" component={() => <Layout><NotFound /></Layout>} />
      <Route component={() => <Layout><NotFound /></Layout>} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="bottom-right" richColors closeButton />
          <AuthRedirectHandler />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
