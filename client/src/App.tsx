import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><Home /></Layout>} />
      <Route path="/live" component={() => <Layout><LiveTV /></Layout>} />
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
          <Toaster theme="dark" position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
