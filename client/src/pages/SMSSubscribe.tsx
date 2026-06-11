import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SMSSubscribe() {
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const subscribeMutation = trpc.sms.optIn.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("You're subscribed! Welcome to ZTVLIVE SMS alerts.");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consented) {
      toast.error("You must check the consent box to subscribe.");
      return;
    }
    if (!phone.match(/^\+?[1-9]\d{9,14}$/)) {
      toast.error("Please enter a valid phone number (e.g. +12125551234).");
      return;
    }
    setLoading(true);
    subscribeMutation.mutate({ phone, name: firstName });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 py-4 px-6">
        <Link href="/">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-[#00d4ff]">ZTV</span>
            <span className="text-white">LIVE</span>
          </span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {submitted ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#00d4ff]/20 border-2 border-[#00d4ff] flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-black">You're In!</h1>
              <p className="text-white/70 text-lg">
                Welcome to ZTVLIVE SMS alerts. You'll receive notifications about new shows, live events, and exclusive content.
              </p>
              <p className="text-white/50 text-sm">
                To unsubscribe at any time, reply <strong className="text-white">STOP</strong> to any message. Standard message and data rates may apply.
              </p>
              <Link href="/">
                <Button className="bg-[#00d4ff] hover:bg-[#00b8d9] text-black font-bold px-8">
                  Watch ZTVLIVE
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Hero */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-full px-4 py-1.5 text-sm text-[#00d4ff] font-medium mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
                  SMS Alerts
                </div>
                <h1 className="text-4xl font-black leading-tight">
                  Never Miss a <span className="text-[#00d4ff]">ZTVLIVE</span> Moment
                </h1>
                <p className="text-white/60 text-lg">
                  Get instant SMS alerts for new shows, live events, creator drops, and exclusive ZTVLIVE content — delivered straight to your phone.
                </p>
              </div>

              {/* What you'll receive */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                <h2 className="font-bold text-white/90 text-sm uppercase tracking-wider">What You'll Receive</h2>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-center gap-2">
                    <span className="text-[#00d4ff]">✓</span> New show & episode alerts from ZTVLIVE
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00d4ff]">✓</span> Live event start notifications
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00d4ff]">✓</span> Exclusive subscriber-only content drops
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00d4ff]">✓</span> ZTVLIVE+ subscription deals & offers
                  </li>
                </ul>
                <p className="text-xs text-white/40 pt-1">
                  Message frequency: up to 4 messages/month. Standard message &amp; data rates may apply.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-white/80 font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-[#00d4ff] h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white/80 font-medium">
                    Mobile Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (212) 555-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-[#00d4ff] h-12"
                    required
                  />
                  <p className="text-xs text-white/40">
                    US numbers only. Format: +1XXXXXXXXXX
                  </p>
                </div>

                {/* Explicit Consent Checkbox — Required by TCPA / Twilio A2P */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consented}
                      onCheckedChange={(checked) => setConsented(checked === true)}
                      className="mt-0.5 border-white/40 data-[state=checked]:bg-[#00d4ff] data-[state=checked]:border-[#00d4ff]"
                    />
                    <Label
                      htmlFor="consent"
                      className="text-sm text-white/70 leading-relaxed cursor-pointer"
                    >
                      By checking this box, I agree to receive recurring automated marketing text messages
                      from <strong className="text-white">ZTVLIVE</strong> at the mobile number provided above.
                      I understand that consent is not a condition of any purchase. Message frequency varies.
                      Message &amp; data rates may apply. Reply <strong className="text-white">STOP</strong> to
                      unsubscribe at any time. Reply <strong className="text-white">HELP</strong> for help.
                      View our{" "}
                      <Link href="/privacy">
                        <span className="text-[#00d4ff] underline hover:text-[#00b8d9]">Privacy Policy</span>
                      </Link>{" "}
                      and{" "}
                      <Link href="/terms">
                        <span className="text-[#00d4ff] underline hover:text-[#00b8d9]">Terms of Service</span>
                      </Link>
                      .
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!consented || loading}
                  className="w-full h-12 bg-[#00d4ff] hover:bg-[#00b8d9] text-black font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Subscribing..." : "Subscribe to ZTVLIVE SMS Alerts"}
                </Button>
              </form>

              {/* Legal footer */}
              <div className="text-center space-y-2 text-xs text-white/40 border-t border-white/10 pt-6">
                <p>
                  ZTVLIVE SMS Alerts are operated by <strong className="text-white/60">ZTVLIVE</strong>.
                </p>
                <p>
                  To opt out at any time, reply <strong className="text-white/60">STOP</strong> to any message.
                  For help, reply <strong className="text-white/60">HELP</strong> or email{" "}
                  <a href="mailto:admin@communitycut.com" className="text-[#00d4ff] hover:underline">
                    admin@communitycut.com
                  </a>
                </p>
                <p>
                  <Link href="/privacy">
                    <span className="text-[#00d4ff] hover:underline cursor-pointer">Privacy Policy</span>
                  </Link>
                  {" · "}
                  <Link href="/terms">
                    <span className="text-[#00d4ff] hover:underline cursor-pointer">Terms of Service</span>
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
