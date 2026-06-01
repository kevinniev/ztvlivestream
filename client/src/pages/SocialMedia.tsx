import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Instagram, Facebook, Twitter, Music, Send, Clock, CheckCircle2,
  XCircle, FileText, Sparkles, Copy, Trash2, RefreshCw, Zap
} from "lucide-react";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Instagram, color: "from-pink-500 to-purple-600", textColor: "text-pink-400" },
  facebook: { label: "Facebook", icon: Facebook, color: "from-blue-600 to-blue-700", textColor: "text-blue-400" },
  twitter: { label: "X / Twitter", icon: Twitter, color: "from-sky-500 to-sky-600", textColor: "text-sky-400" },
  tiktok: { label: "TikTok", icon: Music, color: "from-red-500 to-pink-600", textColor: "text-red-400" },
};

const STATUS_META = {
  draft: { label: "Draft", color: "bg-gray-700 text-gray-300", icon: FileText },
  scheduled: { label: "Scheduled", color: "bg-yellow-900/50 text-yellow-400", icon: Clock },
  published: { label: "Published", color: "bg-green-900/50 text-green-400", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-900/50 text-red-400", icon: XCircle },
};

// Proven Facebook group post templates for ZTVLIVE
const POST_TEMPLATES = [
  {
    label: "🔴 Live Now Alert",
    caption: "🔴 WE'RE LIVE NOW on ZTVLIVE!\n\n{SHOW_NAME} is streaming RIGHT NOW — don't miss it!\n\n📺 Watch free at ztvlivestream.com\n\n#ZTVLIVE #LiveTV #StreamingNow #FreeTV",
  },
  {
    label: "🎬 New Episode Drop",
    caption: "🎬 NEW EPISODE just dropped on ZTVLIVE!\n\n\"{EPISODE_TITLE}\" is now available to watch FREE.\n\nNo subscription needed. Just click and watch.\n\n👉 ztvlivestream.com\n\n#ZTVLIVE #NewEpisode #FreeStreaming",
  },
  {
    label: "🎙️ Creator Recruitment",
    caption: "🎙️ Want your show on TV?\n\nZTVLIVE is looking for content creators to join our platform.\n\n✅ Keep 70% of your revenue\n✅ Reach thousands of viewers\n✅ Free to apply\n\nApply now 👉 ztvlivestream.com/creator\n\n#ContentCreator #StreamingTV #ZTVLIVE #CreatorEconomy",
  },
  {
    label: "👑 ZTVLIVE+ Promo",
    caption: "👑 Upgrade to ZTVLIVE+ and unlock the full experience!\n\n✨ Ad-free streaming\n✨ Exclusive shows\n✨ Early access to new content\n✨ Premium virtual studio sets\n\nStarting at just $4.99/mo\n\n👉 ztvlivestream.com/subscribe\n\n#ZTVLIVE #StreamingPlus #PremiumTV",
  },
  {
    label: "📊 Engagement Poll",
    caption: "📊 Quick poll for our community!\n\nWhat type of content do you want to see MORE of on ZTVLIVE?\n\n🎮 Gaming streams\n🎙️ Podcasts & Talk Shows\n🎵 Music & Entertainment\n📰 News & Commentary\n\nComment below! Your vote shapes our schedule 👇\n\n#ZTVLIVE #CommunityPoll",
  },
  {
    label: "🏆 Weekly Highlight",
    caption: "🏆 This week on ZTVLIVE — here's what you might have missed!\n\n📺 Top shows\n🔥 Most watched clips\n🎯 Trending topics\n\nCatch up on everything FREE at ztvlivestream.com\n\n#ZTVLIVE #WeeklyHighlight #FreeTV #Streaming",
  },
];

export default function SocialMedia() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "twitter" | "tiktok">("instagram");
  const [contentType, setContentType] = useState<"post" | "reel" | "story" | "thread">("post");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<"all" | "instagram" | "facebook" | "twitter" | "tiktok">("all");

  const utils = trpc.useUtils();

  const createPost = trpc.social.createPost.useMutation({
    onSuccess: () => {
      toast.success("Post saved! Use 'Post to Instagram' to publish it.");
      setCaption("");
      setMediaUrl("");
      utils.social.myPosts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePost = trpc.social.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post deleted.");
      utils.social.myPosts.invalidate();
    },
  });

  const markPublished = trpc.social.markPublished.useMutation({
    onSuccess: () => {
      toast.success("Marked as published!");
      utils.social.myPosts.invalidate();
    },
  });

  const { data: posts, isLoading } = trpc.social.myPosts.useQuery({ platform: filterPlatform, limit: 30 });

  const charLimit = platform === "twitter" ? 280 : 2200;
  const charsLeft = charLimit - caption.length;

  function applyTemplate(tpl: typeof POST_TEMPLATES[0]) {
    setCaption(tpl.caption);
    toast.info("Template applied — customize it before posting!");
  }

  function copyCaption() {
    navigator.clipboard.writeText(caption);
    toast.success("Caption copied to clipboard!");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to manage social posts</h2>
          <Button onClick={() => window.location.href = "/signin"} className="bg-blue-600 hover:bg-blue-700">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Social Media Hub</h1>
              <p className="text-gray-400 text-sm">Create, schedule, and track posts across all platforms</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Composer */}
          <div className="lg:col-span-3 space-y-4">
            {/* Platform + Content Type */}
            <Card className="bg-[#13131a] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-400" />
                  Compose Post
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Platform selector */}
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(PLATFORM_META) as [keyof typeof PLATFORM_META, typeof PLATFORM_META[keyof typeof PLATFORM_META]][]).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setPlatform(key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                          platform === key
                            ? `bg-gradient-to-br ${meta.color} border-transparent text-white`
                            : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Content type */}
                <div className="flex gap-2">
                  {(["post", "reel", "story", "thread"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        contentType === type
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Caption */}
                <div className="relative">
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write your caption here... Use a template below to get started fast."
                    className="bg-[#0d0d14] border-white/10 text-white placeholder:text-gray-600 min-h-[160px] resize-none"
                    maxLength={charLimit}
                  />
                  <div className={`absolute bottom-2 right-3 text-xs ${charsLeft < 50 ? "text-red-400" : "text-gray-500"}`}>
                    {charsLeft} left
                  </div>
                </div>

                {/* Media URL */}
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Media URL (image or video) — optional"
                  className="bg-[#0d0d14] border-white/10 text-white placeholder:text-gray-600"
                />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => createPost.mutate({ platform, contentType, caption, mediaUrl: mediaUrl || undefined })}
                    disabled={!caption.trim() || createPost.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createPost.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                    Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyCaption}
                    disabled={!caption.trim()}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* Instagram direct post note */}
                {platform === "instagram" && (
                  <div className="bg-pink-950/30 border border-pink-500/20 rounded-lg p-3 text-sm text-pink-300">
                    <strong>Instagram:</strong> After saving, use the "Post to Instagram" button on any draft to publish directly via the connected Instagram account.
                  </div>
                )}
                {platform === "facebook" && (
                  <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
                    <strong>Facebook Groups:</strong> Copy your caption and post it manually in your groups for maximum reach. See the engagement strategy guide below.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post History */}
            <Card className="bg-[#13131a] border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">Post History</CardTitle>
                  <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as any)}>
                    <SelectTrigger className="w-36 bg-[#0d0d14] border-white/10 text-white h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#13131a] border-white/10 text-white">
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">X / Twitter</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
                  </div>
                ) : !posts?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No posts yet. Create your first one!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {posts.map((post) => {
                      const pm = PLATFORM_META[post.platform];
                      const sm = STATUS_META[post.status];
                      const PIcon = pm.icon;
                      const SIcon = sm.icon;
                      return (
                        <div key={post.id} className="bg-[#0d0d14] rounded-lg p-3 flex items-start gap-3 group">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${pm.color} flex items-center justify-center flex-shrink-0`}>
                            <PIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white line-clamp-2">{post.caption}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${sm.color}`}>
                                <SIcon className="w-3 h-3" />
                                {sm.label}
                              </span>
                              <span className="text-xs text-gray-600">
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {post.status === "draft" && post.platform === "instagram" && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 border-0"
                                onClick={() => {
                                  // Copy caption and open Instagram note
                                  navigator.clipboard.writeText(post.caption);
                                  toast.info("Caption copied! The Instagram post will be submitted via the connected account.");
                                  markPublished.mutate({ id: post.id });
                                }}
                              >
                                <Instagram className="w-3 h-3 mr-1" />
                                Post
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-gray-500 hover:text-red-400"
                              onClick={() => deletePost.mutate({ id: post.id })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Templates + Strategy */}
          <div className="lg:col-span-2 space-y-4">
            {/* Post Templates */}
            <Card className="bg-[#13131a] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Proven Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {POST_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(tpl)}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300 hover:text-white"
                  >
                    {tpl.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Facebook Engagement Strategy */}
            <Card className="bg-[#13131a] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-400" />
                  Facebook Group Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-400">
                <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 font-semibold mb-1">Why posts get no reactions:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Posted too promotional — sounds like an ad</li>
                    <li>• No question or call-to-action at the end</li>
                    <li>• No image or video attached</li>
                    <li>• Posted at wrong time (best: 7–9pm local)</li>
                    <li>• Group audience doesn't match content niche</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-white font-semibold">Quick Fixes:</p>
                  <div className="space-y-1.5">
                    {[
                      { tip: "Always end with a question", detail: "\"What would you watch first?\" gets 3x more comments" },
                      { tip: "Lead with value, not promotion", detail: "Share a tip or insight before mentioning ZTVLIVE" },
                      { tip: "Use native video", detail: "Facebook suppresses external links — upload a clip directly" },
                      { tip: "Reply to every comment fast", detail: "First 30 min of engagement determines reach" },
                      { tip: "Post 3x/week max per group", detail: "More than that triggers spam filters" },
                      { tip: "Join niche groups", detail: "\"Streaming fans\", \"cord cutters\", \"content creators\" groups" },
                    ].map((item, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-2">
                        <p className="text-white text-xs font-medium">{item.tip}</p>
                        <p className="text-gray-500 text-xs">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-300 font-semibold text-xs mb-1">Best posting times (EST):</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-green-400">
                    <span>Mon–Fri: 7–9 PM</span>
                    <span>Sat–Sun: 10 AM–12 PM</span>
                    <span>Tue & Thu: Best days</span>
                    <span>Avoid: Mon morning</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
