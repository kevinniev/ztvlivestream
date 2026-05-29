import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, CheckCircle, ArrowLeft } from "lucide-react";

const CATEGORIES = ["tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"];

export default function CreatorBookSlot() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    youtubeId: "",
    scheduledDate: "",
    scheduledTime: "12:00",
  });
  const [submitted, setSubmitted] = useState(false);

  const bookSlot = trpc.creator.bookSlot.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Upload slot booked! We'll confirm within 24 hours.");
    },
    onError: (err) => toast.error(err.message || "Failed to book slot"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.scheduledDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const scheduledAt = new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime();
    bookSlot.mutate({
      title: form.title,
      description: form.description || undefined,
      category: form.category || undefined,
      youtubeId: form.youtubeId || undefined,
      scheduledAt,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-20 text-center">
        <Upload className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Book Upload Slot</h2>
        <p className="text-white/50 text-sm mb-6">Sign in to book your upload slot</p>
        <Button onClick={() => (window.location.href = getLoginUrl())} className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
          Sign In
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[oklch(0.65_0.22_150/0.15)] flex items-center justify-center mx-auto mb-6 border border-[oklch(0.65_0.22_150/0.3)]">
          <CheckCircle className="w-10 h-10 text-[oklch(0.65_0.22_150)]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Slot Booked!</h2>
        <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
          Your upload slot has been submitted. Our team will review and confirm within 24 hours. You'll receive an email notification.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/creator/dashboard">
            <Button className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">View Dashboard</Button>
          </Link>
          <Button onClick={() => setSubmitted(false)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Book Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Book Upload Slot — Creator Hub" description="Book your ZTVLIVE upload slot. Schedule your content and start earning 70% revenue share." url="/creator/book-slot" noIndex />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/creator" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Creator Hub
        </Link>

        <h1 className="text-2xl font-black text-white mb-2">Book Upload Slot</h1>
        <p className="text-white/50 text-sm mb-8">Schedule your content in the ZTVLIVE program guide</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">
                Content Title <span className="text-[oklch(0.6_0.22_25)]">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Best Budget Tech of 2025"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[oklch(0.72_0.2_220/0.5)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of your content..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[oklch(0.72_0.2_220/0.5)] outline-none resize-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border ${
                      form.category === cat
                        ? "bg-[oklch(0.72_0.2_220/0.2)] border-[oklch(0.72_0.2_220/0.5)] text-[oklch(0.72_0.2_220)]"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">YouTube Video ID (optional)</label>
              <Input
                value={form.youtubeId}
                onChange={(e) => setForm({ ...form, youtubeId: e.target.value })}
                placeholder="e.g. dQw4w9WgXcQ"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[oklch(0.72_0.2_220/0.5)]"
              />
              <p className="text-xs text-white/30 mt-1">The video ID from your YouTube URL (youtube.com/watch?v=VIDEO_ID)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">
                  Preferred Date <span className="text-[oklch(0.6_0.22_25)]">*</span>
                </label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-white/5 border-white/10 text-white focus:border-[oklch(0.72_0.2_220/0.5)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">Preferred Time</label>
                <Input
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  className="bg-white/5 border-white/10 text-white focus:border-[oklch(0.72_0.2_220/0.5)]"
                />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border-[oklch(0.65_0.22_150/0.2)]">
            <p className="text-xs text-white/60 leading-relaxed">
              By submitting, you confirm that you own the rights to this content and agree to ZTVLIVE's{" "}
              <Link href="/content-guidelines" className="text-[oklch(0.72_0.2_220)] hover:underline">Content Guidelines</Link>{" "}
              and{" "}
              <Link href="/creator/rights" className="text-[oklch(0.72_0.2_220)] hover:underline">Creator Rights Agreement</Link>.
            </p>
          </div>

          <Button
            type="submit"
            disabled={bookSlot.isPending}
            className="w-full bg-gradient-to-r from-[oklch(0.65_0.22_150)] to-[oklch(0.72_0.2_220)] text-white border-0 font-bold py-3"
          >
            {bookSlot.isPending ? "Submitting..." : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Book Upload Slot
              </>
            )}
          </Button>
        </form>
      </div>
    </>
  );
}
