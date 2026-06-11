import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Step = "phone" | "code" | "success";

export default function PhoneVerify() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOTPMutation = trpc.sms.sendOTP.useMutation({
    onSuccess: () => {
      setStep("code");
      toast.success("Code sent! Check your phone.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send code. Please try again.");
    },
  });

  const verifyOTPMutation = trpc.sms.verifyOTP.useMutation({
    onSuccess: () => {
      setStep("success");
      toast.success("Phone number verified!");
    },
    onError: (err) => {
      toast.error(err.message || "Invalid or expired code. Please try again.");
    },
  });

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^\+?[1-9]\d{9,14}$/)) {
      toast.error("Please enter a valid phone number (e.g. +12125551234).");
      return;
    }
    sendOTPMutation.mutate({ phone });
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      codeRefs.current[nextIndex]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "");
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }
    verifyOTPMutation.mutate({ phone, code: fullCode });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 py-4 px-6">
        <Link href="/">
          <span className="text-2xl font-black tracking-tight cursor-pointer">
            <span className="text-[#00d4ff]">ZTV</span>
            <span className="text-white">LIVE</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Step: Phone entry */}
          {step === "phone" && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-black">Verify Your Phone</h1>
                <p className="text-white/60">
                  Enter your mobile number and we'll send a 6-digit verification code via SMS.
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-5">
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
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-[#00d4ff] h-12 text-lg"
                    required
                  />
                  <p className="text-xs text-white/40">
                    Include country code (e.g. +1 for US)
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={sendOTPMutation.isPending}
                  className="w-full h-12 bg-[#00d4ff] hover:bg-[#00b8d9] text-black font-bold text-base transition-all"
                >
                  {sendOTPMutation.isPending ? "Sending Code..." : "Send Verification Code"}
                </Button>
              </form>

              <p className="text-center text-xs text-white/40">
                Standard message & data rates may apply. By verifying, you agree to our{" "}
                <Link href="/terms"><span className="text-[#00d4ff] hover:underline cursor-pointer">Terms</span></Link>
                {" & "}
                <Link href="/privacy"><span className="text-[#00d4ff] hover:underline cursor-pointer">Privacy Policy</span></Link>.
              </p>
            </div>
          )}

          {/* Step: Code entry */}
          {step === "code" && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-black">Enter Your Code</h1>
                <p className="text-white/60">
                  We sent a 6-digit code to <strong className="text-white">{phone}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                {/* 6-digit OTP input */}
                <div className="flex gap-3 justify-center">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/20 rounded-xl text-white focus:border-[#00d4ff] focus:outline-none focus:ring-1 focus:ring-[#00d4ff] transition-all"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={verifyOTPMutation.isPending || code.join("").length !== 6}
                  className="w-full h-12 bg-[#00d4ff] hover:bg-[#00b8d9] text-black font-bold text-base disabled:opacity-40 transition-all"
                >
                  {verifyOTPMutation.isPending ? "Verifying..." : "Verify Code"}
                </Button>
              </form>

              <div className="text-center space-y-2">
                <button
                  onClick={() => sendOTPMutation.mutate({ phone })}
                  disabled={sendOTPMutation.isPending}
                  className="text-sm text-[#00d4ff] hover:underline disabled:opacity-40"
                >
                  Didn't receive a code? Resend
                </button>
                <br />
                <button
                  onClick={() => { setStep("phone"); setCode(["", "", "", "", "", ""]); }}
                  className="text-sm text-white/40 hover:text-white/70"
                >
                  Use a different number
                </button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-black">Phone Verified!</h1>
              <p className="text-white/60 text-lg">
                Your phone number <strong className="text-white">{phone}</strong> has been successfully verified.
              </p>
              <Link href="/">
                <Button className="bg-[#00d4ff] hover:bg-[#00b8d9] text-black font-bold px-8">
                  Back to ZTVLIVE
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
