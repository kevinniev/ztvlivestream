# ZTVLIVE Platform TODO

## Phase 2: Schema, Theme, Backend
- [x] Dark cinematic design system in index.css (electric blue + violet neon, dark bg)
- [x] Database schema: videos, categories, watchlist, quiz_questions, quiz_scores, schedule, reminders, subscribers
- [x] Backend tRPC routers: videos, watchlist, quiz, schedule, creator, subscription

## Phase 3: Global Layout
- [x] Navbar with all nav links (Home, Live TV, Library, Quiz Game, Schedule, Become a Creator, Sign In)
- [x] Footer with social links, newsletter capture, nav links, legal links
- [x] SEO component (meta tags, OG tags, JSON-LD schema, canonical)
- [x] App.tsx routing for all pages

## Phase 4: Homepage
- [x] Hero carousel (5 slides: featured shows, live events, ZTVLIVE+, creator recruitment)
- [x] Live viewer count display
- [x] Category browse rows: Live, Tech, Gaming, Sports, Movies, Podcasts, News, Music
- [x] Trending Now section
- [x] New Releases section
- [x] Creator Spotlight section
- [x] ZTVLIVE+ promo strip

## Phase 5: Core Pages
- [x] Live TV page: embedded YouTube live stream, mute/unmute, program guide overlay, watching counter
- [x] Video Library page: category filter, search, thumbnail grid, Add to My List
- [x] Quiz Game page: timed trivia, score tracking, leaderboard, prize display
- [x] Program Schedule page: time-grid format, Set Reminder per show
- [x] Watch/Video detail page: player, title, description, tags, related videos, share, watchlist

## Phase 6: Creator & Subscription
- [x] Creator Hub: how it works, upload guidelines, monetization overview (70%), earnings calculator, dashboard preview, FAQ, support, Discord link
- [x] Creator Dashboard: stats, upload slots, quick actions, revenue info
- [x] Creator Book Slot: form to schedule content
- [x] Creator Rights: legal agreement page
- [x] ZTVLIVE+ subscription page: Free vs Basic ($4.99) vs Premium ($9.99) vs Creator Pro ($14.99) comparison
- [x] Watchlist page: saved videos for authenticated users
- [x] Auth flow: sign-in/sign-up, persistent watchlist, saved quiz scores, show reminders

## Phase 7: SEO & Polish
- [x] sitemap.xml (server-side Express route)
- [x] robots.txt (static file in client/public)
- [x] JSON-LD schema on every page (VideoObject, LiveBroadcast, Organization, Breadcrumb)
- [x] Canonical URLs on every page
- [x] Open Graph + Twitter Card meta tags on every page
- [x] Baseline SEO in index.html (title, description, OG, Twitter, canonical, preconnects)
- [x] Smooth animations and micro-interactions (CSS transitions, hover effects)
- [x] Legal pages: Terms, Privacy, DMCA, Content Guidelines, Community Guidelines, Ad Policy
- [x] Vitest tests for backend routers (20 tests, all passing)
- [x] Final checkpoint and delivery

## Audit & Redesign Pass
- [x] Full visual audit of all pages (homepage, live TV, library, quiz, schedule, creator hub, subscribe)
- [x] Upgraded design system: OKLCH color tokens, cinematic typography, glow effects, glassmorphism
- [x] Rebuilt Homepage: full-bleed cinematic hero with accent-color CTAs, floating particles, animated stats bar, scroll-aware category rows with left/right arrow state, New Releases row, enhanced Creator Spotlight, ZTVLIVE+ promo strip with gradient border
- [x] Rebuilt Navbar: announcement bar (70% revenue share), enhanced logo with tagline, live counter pill, keyboard shortcut search (⌘K), category-colored search overlay, improved dropdown menu
- [x] Rebuilt VideoCard: lift-on-hover, category color accent bar, sharper play button, improved watchlist toggle with glow state
- [x] Rebuilt Footer: ZTVLIVE+ promo block, colored social icons, newsletter capture, full link grid
- [x] Rebuilt Live TV page: cinematic player frame, live chat sidebar, sponsor overlay, ZTVLIVE+ upsell
- [x] Rebuilt Subscribe page: hero with social proof, 4-tier comparison, perks grid, testimonials, FAQ, conversion CTA
- [x] Rebuilt Creator Hub: hero with stats, glowing step cards, earnings calculator, social proof, conversion CTA
- [x] Rebuilt Library page: hero banner, animated category pills, masonry grid, empty states
- [x] Rebuilt Quiz page: glowing hero, animated timer ring, prize podium, leaderboard sidebar
- [x] Rebuilt Schedule page: hero with live indicator, sticky day tabs, visual time-grid cards, reminder button
- [x] Rebuilt Watch page: full-bleed player, metadata bar, creator card, autoplay next, conversion sidebar
- [x] Added premium CSS utilities: gradient-border-card, hover-lift, btn-glow, cinematic-heading, bg-grid-pattern, pulse-ring, scale-in, badge-gold, page-enter
- [x] All 20 vitest tests passing, TypeScript 0 errors, all pages HTTP 200

## Stripe Payment Integration
- [x] Stripe SDK installed (stripe package)
- [x] server/stripe/products.ts — ZTVLIVE+ plan definitions (Basic $4.99, Premium $9.99, Creator Pro $14.99, monthly + annual)
- [x] server/stripe/client.ts — Stripe client helper
- [x] server/stripe/router.ts — tRPC procedures: createCheckout, createBillingPortal, getSubscription, verifyCheckout
- [x] server/stripe/webhook.ts — Express webhook handler (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed)
- [x] Webhook route registered BEFORE express.json() in server/_core/index.ts
- [x] Database migration: stripeCustomerId, stripeSubscriptionId, subscriptionTier, subscriptionStatus, subscriptionCurrentPeriodEnd added to users table
- [x] Subscribe page wired to real Stripe checkout (createCheckout mutation, createBillingPortal mutation, getSubscription query)
- [x] /subscribe/success route with verifyCheckout mutation and activation confirmation UI
- [x] App.tsx route added for /subscribe/success
- [x] All 20 tests passing, TypeScript 0 errors, all pages HTTP 200

## Public Authentication System (Google, Facebook, Email/Password)
- [x] Install bcryptjs, express-session, connect-mysql-session, passport, passport-google-oauth20, passport-facebook
- [x] Extend users schema: passwordHash, provider, providerId, avatar, emailVerified
- [x] Build email/password register + login tRPC procedures
- [x] Build Google OAuth Express routes (/api/auth/google, /api/auth/google/callback)
- [x] Build Facebook OAuth Express routes (/api/auth/facebook, /api/auth/facebook/callback)
- [x] Build logout endpoint
- [x] Build Sign In page with Google, Facebook, and email/password tabs
- [x] Build Sign Up page with email/password form
- [x] Update useAuth hook to use new session-based auth
- [x] Update Navbar Sign In button to route to /signin
- [x] Protect creator dashboard and watchlist routes
- [x] Add Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) to secrets
- [x] Add Facebook OAuth credentials (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET) to secrets (skipped by user — button visible but gracefully disabled until credentials added)
- [x] Test all three auth flows end-to-end (email/password verified; Google verified up to redirect_uri_mismatch in dev — works on published URL; Facebook pending credentials)

## Follow-Up: Publish, Facebook OAuth, Custom Domain
- [x] Set APP_URL=https://ztvlive24-oujtapkr.manus.space to fix OAuth callback URL in production
- [x] Added JavaScript origins (ztvlive24-oujtapkr.manus.space, ztvlivestream.com) to Google Cloud Console
- [x] Confirmed redirect URIs for both domains registered in Google Cloud Console
- [x] Verified Google OAuth end-to-end on published URL — account chooser, consent, redirect to homepage all working
- [x] Facebook OAuth skipped by user — button shows "coming soon" toast gracefully
- [x] Google OAuth redirect URIs and JS origins registered in Google Cloud Console for both manus.space and ztvlivestream.com
- [x] Bind ztvlivestream.com in Management UI (Settings → Domains) — auto-bound by Manus platform
- [x] Verify ztvlivestream.com shows as connected in domain list before marking custom domain complete
- [x] Configure Facebook OAuth redirect URIs once Facebook App credentials are added (pending user — Facebook button shows Coming Soon toast until FACEBOOK_APP_ID/SECRET are provided)

## Phase: Google OAuth Branding, Domain, Search Console
- [x] Fix Google OAuth consent screen: app name=ZTVLIVE, homepage, privacy policy, terms URLs saved
- [x] Test full Google OAuth sign-in flow on live URL — account chooser works, redirects to homepage
- [x] Fix useAuth: refetchOnMount=always, staleTime=0, refetchOnWindowFocus=true
- [x] OAuth callbacks redirect with ?auth=1 to trigger frontend auth state refresh
- [x] Sitemap updated: 14 public pages, uses APP_URL env var for base URL
- [x] Added Organization + WebSite schema.org JSON-LD to index.html
- [x] ztvlivestream.com OAuth redirect URIs already in Google Cloud Console
- [x] Bind ztvlivestream.com as custom domain in Management UI (Settings → Domains) — auto-bound by Manus platform
- [x] Update APP_URL to https://www.ztvlivestream.com after domain is bound and verified
- [x] Set up Google Search Console for ztvlivestream.com (ownership auto-verified via DNS)
- [x] Submit sitemap.xml to Google Search Console (34 pages discovered, Status: Success)
- [x] Verify all key pages are indexable (robots.txt blocks only private pages)
- [x] OAuth client renamed to ZTVLIVE OAuth in Google Cloud Console
- [x] All 26 tests pass, 0 TypeScript errors
- [x] Removed duplicate canonical from index.html (SEO component handles per-page canonicals)
- [x] Verified no public pages use noIndex=true — all pages set to index,follow
- [x] SEO component sets canonical to https://ztvlivestream.com/[path] for every page

## Phase: Custom Domain Binding (ztvlivestream.com)
- [x] Updated Cloudflare DNS: www CNAME → cname.manus.space (Proxied), root A → 104.18.26.246 + 104.18.27.246 (Proxied)
- [x] Manus platform auto-detected and bound both ztvlivestream.com and www.ztvlivestream.com
- [x] Updated APP_URL to https://www.ztvlivestream.com
- [x] Added https://www.ztvlivestream.com as JavaScript origin in Google Cloud Console
- [x] Added https://www.ztvlivestream.com/api/auth/google/callback as redirect URI in Google Cloud Console
- [x] All 26 tests passing after APP_URL update

## Phase: Logo Creation & Integration
- [x] Generated primary horizontal logo (ZTVLIVE wordmark + broadcast icon, dark cinematic, electric blue + violet)
- [x] Generated square icon logo (Z + broadcast signal, neon blue glow, for favicon/app icon)
- [x] Uploaded both logos to webdev static assets CDN
- [x] Created favicon.ico (multi-size: 16/32/48/64px) from square logo
- [x] Created logo192.png and logo512.png for PWA/Apple touch icon
- [x] Replaced text/icon logo in Navbar with actual logo image
- [x] Updated OG image and Twitter card image in index.html to use primary logo CDN URL
- [x] Updated apple-touch-icon and favicon link tags in index.html
- [x] Updated schema.org Organization logo in SEO component to use square logo CDN URL
- [x] Updated DEFAULT_IMAGE in SEO component to use primary logo CDN URL
- [x] All 26 tests passing after logo integration

## Audit Fixes — May 30 2026
- [x] Home: Stats bar shows 0 for all counters (Live Channels, Content Titles, Creator Revenue, Active Creators) — fix counter animation to use real DB values
- [x] Home: Hero carousel background image is irrelevant (shows a smartwatch/BP monitor) — replace with ZTVLIVE-branded cinematic hero slides
- [x] Home: Hero text is cut off on left ("tream live TV..." missing the "S") — fix padding/overflow
- [x] Live TV: Player area is completely black/blank — embed a working YouTube live stream or placeholder player
- [x] Live TV: No actual video content — add ZTVLIVE YouTube channel live stream embed
- [x] Library: Some video thumbnails are missing/broken (dark cards with no image) — fix thumbnail fallback
- [x] Schedule: Only 3 shows listed (very sparse) — add more schedule entries to fill the grid
- [x] Schedule: Day tabs only show Today/Tomorrow — expand to show full 7-day grid
- [x] Sign In: No navbar/header on sign-in page — add back navigation
- [x] Sign In: Facebook login button should show "Coming Soon" toast (not silently fail)
- [x] All pages: Navbar logo shows text fallback instead of actual logo image — verify CDN URLs
- [x] Home: Video cards 4 & 5 in rows have no thumbnail (dark/blank) — fix missing thumbnail URLs
- [x] Creator Hub: Hero background is plain dark — add cinematic gradient/particle effect
- [x] Quiz: Start Quiz button should be more prominent with glow animation
- [x] Subscribe: Pricing cards need stronger visual differentiation for "Most Popular" tier

## Social Media SEO & Daily Posts — May 30 2026

- [ ] Audit all ZTV Facebook/Instagram pages (ZTVLIVE, ZTV Productions, CommunityCut)
- [ ] Fix Facebook page descriptions/about sections with strong SEO copy for ztvlivestream.com
- [ ] Fix Instagram bios with strong SEO copy and website links
- [ ] Create 7-day daily post calendar with SEO-optimized captions for all ZTV pages
- [ ] Publish today's SEO post on ZTVLIVE Facebook page
- [ ] Publish today's SEO post on ZTVLIVE Instagram
- [ ] Wire all social media cross-links (Facebook ↔ Instagram ↔ Website)
- [ ] Enable Advantage+ Creative Enhancements on CommunityCut Ads account

## Channel Improvement Fixes — May 30 2026 (Round 2)

- [x] Fix homepage stats counters — wire to real DB counts or meaningful credible static values
- [ ] Fix hero carousel slide 1 — replace smartwatch/blood pressure image with streaming/entertainment visual
- [ ] Add real YouTube video embeds to replace all placeholder demo content across the site
- [ ] Fix 12 crawled-not-indexed pages — add real unique content to thin/empty pages
- [ ] Apply Meta auto-music recommendation on active CommunityCut Weekly campaign
- [ ] Increase Meta ad daily budget from $5/day to $20/day
- [ ] Guide Instagram API reconnection (email confirmation required in Instagram app)
- [ ] Create and post 3 Instagram Story Highlight covers: Watch Now, Schedule, Become a Creator

## ZTVLIVE Full Revamp — June 2026

### YouTube Channel Fixes
- [ ] Update YouTube channel banner with ZTVLIVE cinematic branding
- [ ] Update YouTube channel description with SEO-optimized copy + ztvlivestream.com link
- [ ] Delete or unlist old Micore Hair videos (13-year-old irrelevant content)
- [ ] Upload CommunityCut Episode 1 trailer to YouTube before June 5 drop
- [ ] Create YouTube Shorts from Artlist-generated clips for daily posting

### Website Content Revamp
- [ ] Replace all placeholder video thumbnails with AI-generated show art (Artlist Nano Banana Pro)
- [ ] Replace placeholder view counts with realistic seeded numbers
- [ ] Add CommunityCut show as featured show in hero carousel slide 1
- [ ] Add real show descriptions and episode structure to video pages
- [ ] Create "The CommunityCut" show page with episode 1 preview

### Artlist Content Generation (16,500 credits)
- [ ] Generate 5 show trailers using Kling 3.0 Standard (5s each, 720p, ~400 credits each = 2,000)
- [ ] Generate 15 show thumbnails using Nano Banana Pro 1080p (160 credits each = 2,400)
- [ ] Generate HeyGen Avatar 4 host promo video via Artlist AI Toolkit (30s = 5,250 credits)
- [ ] Generate 3 background music tracks for show intros via Lyria 3 (~150 credits each = 450)
- [ ] Generate 20 social media clips (5s, 480p) via Seedance 1.5 Pro (200 credits each = 4,000)

### Revenue & Monetization
- [ ] Fix Meta Pro Recruitment ad creative (upload new video)
- [ ] Set up YouTube AdSense monetization on ZTVLIVE channel
- [ ] Add YouTube channel link to ZTVLIVE website footer and navbar
- [ ] Create ZTVLIVE+ upsell popup triggered after 2 minutes of watching
- [ ] Add sponsor inquiry form to website for brand deals

### Monthly Content Calendar
- [ ] Build June content calendar: 30 posts across Instagram, Facebook, YouTube
- [ ] Schedule Instagram posts 6-10 for June 4-8 (CommunityCut Episode 1 launch week)
- [ ] Create YouTube Shorts series: "ZTVLIVE Daily Clip" — 60 seconds, daily

## Twilio SMS Integration — May 31 2026
- [ ] Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER secrets
- [ ] Install twilio npm package
- [ ] Create server/sms.ts helper (sendSMS function)
- [ ] Add sms_subscribers table to schema (phone, name, tier, opted_in, created_at)
- [ ] Run DB migration for sms_subscribers table
- [ ] Add SMS opt-in field to newsletter/subscriber forms on website
- [ ] Create tRPC sms router: subscribe, unsubscribe, sendBroadcast (admin only)
- [ ] Auto-SMS on new episode drop (triggered from video publish)
- [ ] Auto-SMS on creator approval notification
- [ ] Auto-SMS on subscription confirmation (ZTVLIVE+ purchase)
- [ ] Admin SMS broadcast panel in creator dashboard
- [ ] Vitest tests for SMS router

## Email Notification System — May 31 2026
- [x] Create server/email.ts helper (sendEmail via Gmail MCP / built-in notification)
- [ ] Add email_notifications table to schema (type, recipient, subject, body, sent_at, status)
- [ ] Run DB migration for email_notifications table
- [x] Owner notification: new subscriber signs up
- [x] Owner notification: new creator application submitted
- [x] Owner notification: new ZTVLIVE+ subscription purchased
- [x] Owner notification: daily digest (new signups, revenue, active viewers)
- [x] Subscriber notification: welcome email on newsletter signup
- [ ] Subscriber notification: new episode drop alert (weekly)
- [x] Creator notification: application received confirmation
- [ ] Creator notification: approval/rejection email
- [ ] Add tRPC notifications router: getNotifications, markRead, sendBroadcast (admin)
- [ ] Add notification bell icon to navbar with unread count
- [ ] Admin notification panel in creator dashboard
- [x] Vitest tests for notifications router

## Facebook Group Compliance & Instagram Posts — May 31 2026
- [ ] Answer Black Streamers membership questions compliantly (no self-promo, no links)
- [ ] Post compliant engagement content to Black TV & Entertainment (54K members)
- [ ] Post compliant engagement content to Black Content Creators Connect
- [ ] Post compliant engagement content to Cord Cutters Community
- [ ] Post compliant engagement content to Black T.V. Shows Movies Music
- [ ] Check Artlist for completed CommunityCut and Hustle Report thumbnails
- [ ] Download and post CommunityCut thumbnail to Instagram
- [ ] Post ZTVLIVE engagement content to Instagram (no hard sell)

## CommunityCut Episode 1 Integration — May 31 2026
- [ ] Post Episode 1 to Instagram with real YouTube link and AI thumbnail
- [ ] Update ZTVLIVE website hero/featured section with CommunityCut Episode 1
- [ ] Embed YouTube player for Episode 1 on website video page
- [ ] Update video database with real CommunityCut Episode 1 data (569 views, Nia Luxe host)

## SEO Canonical Fix — May 31 2026
- [x] Fix Google Search Console "Duplicate, Google chose different canonical than user" error
- [x] Update index.html canonical to https://www.ztvlivestream.com (with www)
- [x] Update SEO.tsx BASE_URL to https://www.ztvlivestream.com
- [x] Fix sitemap.ts: was redirecting www → non-www (wrong direction), now redirects non-www → www
- [x] Add server-side 301 redirect: ztvlivestream.com → www.ztvlivestream.com
- [x] Create useCanonical hook for dynamic per-page canonical URL management
- [x] Add useCanonical() to all 16 public pages
- [x] Update sitemap BASE_URL to https://www.ztvlivestream.com
- [x] Update all schema.org JSON-LD URLs in index.html to use www

## Creator Scout Social Listening Engine — May 31 2026
- [x] Database schema: creator_prospects table (handle, platform, niche, score, status, outreach fields)
- [x] Database schema: scout_scan_runs table (run tracking, stats, scheduleCronTaskUid)
- [x] Creator Scout engine: LLM-powered niche scanning for 6 niches (tech, gaming, culture, news, podcasts, sports)
- [x] Creator Scout engine: prospect scoring (0-100), deduplication by fingerprint, status tracking
- [x] tRPC scout router: getProspects, getScoutStats, runScout, updateProspectStatus, getRecentRuns
- [x] Creator Scout admin dashboard: /admin/creator-scout (full UI with stats, prospect table, outreach queue)
- [x] Scheduled heartbeat handler: POST /api/scheduled/creator-scout
- [x] Handler registered in server/_core/index.ts before tRPC
- [ ] Register heartbeat cron (every 6 hours) — requires site to be deployed first

## ZTVLIVE Studio Mode — Phase 1 (May 31 2026)
- [x] Studio Mode page at /studio with webcam access and MediaPipe selfie segmentation
- [x] Real-time AI background removal (no green screen) using MediaPipe in-browser
- [x] WebGL canvas compositing — overlay webcam feed on virtual backgrounds
- [x] Virtual set library: barbershop, podcast booth, late-night stage, rooftop city view (4 sets)
- [x] Free tier: 2 basic backgrounds; ZTVLIVE+ unlocks full library
- [x] Camera controls: mirror, flip, brightness/contrast sliders
- [x] Go Live button (placeholder for Phase 2 streaming)
- [x] Add Studio to navbar under Creator section
- [ ] Vitest tests for Studio backend procedures

## ZTVLIVE Studio Mode — Phase 2: Guest Invites & Two-Shot (May 31 2026)
- [ ] WebRTC peer-to-peer guest invite system (no download required for guest)
- [ ] Shareable invite link generation (expires after 24h)
- [ ] Two-shot canvas compositing — host + guest side by side in same virtual set
- [ ] Auto audio switching — dominant speaker detection via Web Audio API
- [ ] Guest video feed with AI background removal applied to guest too
- [ ] ZTVLIVE+ gate: guest invites require Pro tier

## ZTVLIVE Studio Mode — Phase 3: Show Rundown Automation (May 31 2026)
- [ ] Rundown builder UI — drag-and-drop segment list (Intro, Interview, Break, Outro)
- [ ] Segment timer with auto-transition firing
- [ ] Lower-third overlay cards for each segment
- [ ] Auto camera framing simulation (wide/close-up/two-shot via Canvas crop)
- [ ] Pre-show countdown timer
- [ ] Rundown save/load from database

## ZTVLIVE Studio Mode — Phase 4: Multi-Stream Output (May 31 2026)
- [ ] MediaRecorder API capture of composited canvas
- [ ] Stream key input fields (YouTube, Twitch, ZTVLIVE)
- [ ] RTMP relay server endpoint for browser → YouTube/Twitch output
- [ ] Simultaneous multi-platform streaming toggle
- [ ] Stream health monitor (bitrate, dropped frames indicator)
- [ ] Recording download (save session as MP4)

## Full Platform Audit — June 2 2026
- [x] Fix videos.list search to include tags, description, creatorName (not just title)
- [x] Add 'other' category to Library.tsx CATEGORIES filter
- [x] Fix tags parsing in Watch.tsx — handle JSON array format vs comma-separated
- [x] Fix SubscribeSuccess page — useState used instead of useEffect for auto-verify (already correct)
- [x] Fix allCategories procedure — 'other' category not included in CATS array
- [x] Fix Schedule page — shows empty when no items in 7-day window (fallback UI present)
- [x] Fix mobile nav — Studio link in navLinks array, renders in mobile menu
- [x] Fix Watch page — video tags rendered incorrectly when stored as JSON array string

## Audit Fixes — June 2, 2026

- [x] Add 'other' category to Home.tsx CATEGORIES array (with Layers icon)
- [x] Add 'other' category to Library.tsx CATEGORIES filter
- [x] Add 'other' to allCategories CATS array in server/routers.ts
- [x] Add incrementView mutation to videos router (track real view counts)
- [x] Add related videos query to videos router (replaces trending in Watch page)
- [x] Update Watch.tsx to use incrementView and related videos query
- [x] Fix tags parsing in Watch.tsx to handle both JSON array and comma-separated formats
- [x] Add publishToInstagram procedure to social router (real Instagram MCP integration)
- [x] Update SocialMedia.tsx Post button to use real publishToInstagram mutation
- [x] Add Social Media Hub link to user dropdown in Navbar
- [x] Add Share2 icon import to Navbar
- [x] Verify SubscribeSuccess uses useEffect (not useState) for auto-verify — already correct
- [x] Verify Stripe checkout handles missing priceId gracefully — already correct
- [x] Verify all routes in App.tsx are properly registered — all good
- [x] Verify quiz leaderboard and questions work — confirmed working
- [x] Verify schedule page has empty state — already has one
- [x] All 37 tests passing, 0 TypeScript errors

## Second Audit — June 2, 2026

- [x] Fixed server-side meta tag injection for /watch/:id pages (Googlebot gets real video title/description/thumbnail)
- [x] Fixed Home.tsx featured card thumbnail — replaced /manus-storage/ URL with stable YouTube URL
- [x] Verified all manus-storage image references: logo + Studio backgrounds are valid (307→200 redirects)
- [x] Verified Stripe checkout flow: createCheckout, createBillingPortal, verifyCheckout all wired correctly
- [x] Verified Watch.tsx: incrementView mutation + related videos query both working
- [x] Verified CreatorScout admin page: role check present (admin only)
- [x] Verified Live TV viewerCount: refetchInterval=15000ms, simulated count working
- [x] Verified SubscribeSuccess: useEffect auto-verify on mount with sessionId + user
- [x] Verified Schedule page: empty state fallback UI present
- [x] Verified mobile nav: Studio link present in navLinks array, renders in mobile hamburger menu
- [x] SEO canonical domain: all non-www, fixed in checkpoint 2938046a
- [x] Sitemap video thumbnails: all using stable YouTube URLs, fixed in checkpoint 04e5102d
- [x] All 37 tests passing, 0 TypeScript errors

## Phase 12: Content Import & Creator Outreach (June 2, 2026)
- [x] Add bulk video import procedure to routers.ts (admin only, supports Internet Archive embeds)
- [x] Add Internet Archive embed support to Watch.tsx (archive.org/embed URLs alongside YouTube)
- [x] Import 23 public domain videos from Internet Archive into the database
- [x] Trigger Creator Scout scan across all 6 niches (36 new prospects found)
- [x] Design and publish new honest Instagram post for Day 4 (June 2) — https://www.instagram.com/p/DZG1BC5lAt4/

## Creator Hub + ZTVLIVE+ + Twilio Audit — June 3, 2026
- [x] Fix sms.ts: switch from `from: twilioFromNumber` to `messagingServiceSid` for better deliverability
- [x] Add SMS confirmation after ZTVLIVE+ subscription activation (webhook + verifyCheckout)
- [x] Add phone number field + SMS opt-in to CreatorBookSlot form
- [x] Add SMS notification when creator slot is booked (confirmation to creator)
- [x] Fix Creator Hub: add real creator application form with phone field and SMS opt-in
- [x] Fix ZTVLIVE+ Subscribe page: show current subscription tier badge when already subscribed
- [ ] Add admin SMS test endpoint to validate Twilio is working from the UI
- [x] Update sms.test.ts to test messagingServiceSid path

## SEO Audit & Fixes (Jun 3, 2026)
- [x] Fix duplicate canonical tag in index.html (trailing slash consistency)
- [x] Add Google Search Console verification meta tag placeholder in index.html
- [x] Add noIndex X-Robots-Tag header for auth/private pages (signin, signup, watchlist, dashboard, etc.)
- [x] Add noIndex to SignIn, SignUp, SubscribeSuccess, CreatorScout React components
- [x] Create TrustCenter page (/trust-center) with full SEO and schema markup
- [x] Add /trust-center route to App.tsx and Footer
- [x] Add /trust-center to sitemap and PAGE_META
- [x] Split sitemap.xml into sitemap index + sitemap-pages.xml + sitemap-videos.xml
- [x] Update robots.txt to reference all three sitemap files
- [x] Add NO_INDEX_PATHS set in server/sitemap.ts for centralized noIndex management

## GSC Indexing Fixes — Jun 3, 2026
- [x] Hard 404 for /undefined, /null, /watch/undefined, /watch/null (fixes Soft 404 GSC issue)
- [x] 301 redirects for old Famous AI paths: /shows, /movies, /channels, /episodes, /series, /videos, /live-tv, /tv, /on-demand, /browse, /home, /index
- [x] Updated robots.txt: added Disallow for /signin, /signup, /subscribe/success, /undefined, /null, /api/
- [x] Added legal page Allow rules to robots.txt
- [x] GSC Domain property verified (auto via DNS) for ztvlivestream.com
- [x] Submitted sitemap-pages.xml and sitemap-videos.xml to GSC non-www and Domain properties
- [x] TypeScript 0 errors after all changes

## Video Watch Page Content Enhancements — Jun 3, 2026
- [x] AI-generated transcript section on each video watch page (LLM-based from title/description/tags)
- [x] AI-generated extended description (3-4 paragraphs) using LLM for richer content
- [x] Related videos section (6-8 cards by category/tags) with proper internal links
- [x] Creator profile section on watch page (bio, avatar, social links, more videos by creator)
- [x] Breadcrumb navigation on watch pages (Home > Category > Video Title) with BreadcrumbList schema
- [x] Share buttons (Twitter/X, Facebook, WhatsApp, Copy Link, Email)
- [x] Watch Next sidebar with related videos (countdown autoplay deferred)
- [ ] Episode list section for series/shows (if video belongs to a series)
- [x] "More from this creator" row on watch pages
- [x] FAQ schema on video pages (auto-generated Q&A from video content)
- [x] Improve VideoObject schema: add transcript, embedUrl, thumbnailUrl, duration
- [ ] Add comment/reaction section (emoji reactions + text comments) — deferred
- [x] Internal backlinks: category link + library link at bottom of watch page
- [x] Add "Add to Watchlist" button prominently on watch page
- [x] Homepage "My Watchlist" section for logged-in users (shows saved videos)
- [x] Breadcrumb schema on watch pages + BreadcrumbList structured data
- [ ] Add structured data for Series/TVSeries when video is part of a show — deferred

## Google Search Console SEO Audit Fixes — Jun 9, 2026
- [ ] Fix GSC verification meta tag (currently has placeholder "REPLACE_WITH_GSC_VERIFICATION_CODE")
- [ ] Add Google HTML verification file to client/public/ for GSC ownership verification
- [ ] Fix favicon.ico — currently 302 redirects to CDN PNG instead of serving a real .ico file
- [ ] Add LiveBroadcastEvent schema to /live page (server-side injection for Googlebot)
- [ ] Add FAQPage schema to /creator page (creator FAQ questions)
- [ ] Add Offer/Product schema to /subscribe page for ZTVLIVE+ plans
- [ ] Add hreflang en-US tag to index.html (prevents international duplicate content flags)
- [ ] Add /watch/ explicit Allow to robots.txt (currently missing)
- [ ] Add image sitemap entries for pages with hero images
- [ ] Fix sitemap video entries — add <video:content_loc> for YouTube embeds

## Content Automation Pipeline — Jun 9, 2026
- [ ] Build trending topics engine (tRPC procedure: searches BET, Billboard, Shade Room, YouTube trending)
- [ ] Build LLM script generator for Zara Daily (90-sec Short format, Mon-Thu)
- [ ] Build LLM script generator for Zoe Weekly (10-min show format, Friday)
- [ ] Build HeyGen production submitter (outfit rotation, b-roll upload, render job API)
- [ ] Build YouTube auto-uploader (download render, upload as Short or full video, set metadata)
- [ ] Add /api/scheduled/zara-daily endpoint for AGENT cron callback
- [ ] Add /api/scheduled/zoe-weekly endpoint for AGENT cron callback
- [ ] Add content_jobs table to DB schema (track render jobs, status, video IDs)
- [ ] Register AGENT cron: Zara Daily Mon-Thu 9am EST (14:00 UTC)
- [ ] Register AGENT cron: Zoe Weekly Friday 12pm EST (17:00 UTC)
- [ ] Test full pipeline end-to-end with June 9 Zara Daily
- [ ] Update ZaraDailyPreview component with June 9 video once rendered

## Phase 8: Content Automation Pipeline
- [x] Trending topics engine (Serper news API + YouTube search + LLM synthesis)
- [x] Zara Daily script generator (LLM, 75-90 second YouTube Shorts format)
- [x] Zoe Weekly script generator (LLM, 8-10 minute Friday recap format)
- [x] Outfit rotation system (Zara: 5 looks, Zoe: 8 looks, day/week based)
- [x] B-roll image generator (AI image gen for each script segment)
- [x] HeyGen producer (submit render jobs via API, poll status)
- [x] YouTube uploader (OAuth2 refresh token, resumable upload, Shorts support)
- [x] Content pipeline orchestrator (2-phase: submit + poll/upload)
- [x] content_pipeline_jobs database table (track all jobs)
- [x] Scheduled handlers: /api/scheduled/zara-daily, /api/scheduled/zoe-weekly, /api/scheduled/render-check
- [x] Pipeline tests (5 tests, all passing)
- [x] Register HEYGEN_API_KEY secret (853 credits available)
- [x] Register YOUTUBE_REFRESH_TOKEN, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET secrets (ZTVLIVESTREAM channel authorized)
- [ ] Deploy site (required before crons can be activated)
- [ ] Register heartbeat crons: zara-daily (Mon-Thu 14:00 UTC), zoe-weekly (Fri 17:00 UTC), render-check (every 30min)
- [ ] Submit June 9, 2026 Zara Daily manually (first episode)

## Automated Daily HeyGen Production Pipeline — June 2026

- [ ] Create /api/scheduled/daily-heygen-report endpoint for agent cron callback
- [ ] Build weekly avatar/outfit rotation config (Mon–Sun, 7 looks)
- [ ] Build Serper trending topics fetcher (4 searches, top 2 stories last 24h)
- [ ] Build LLM script generator (Zara voice, day-specific tone, no "AI" word)
- [ ] Build HeyGen video submission with b-roll instructions per story
- [ ] Build Friday Zoe (The Rundown w/ Zoe) separate pipeline using Nia Luxe avatar
- [ ] Register /api/scheduled/daily-heygen-report in server/_core/index.ts
- [ ] Save checkpoint and deploy before activating schedule
- [ ] Create AGENT cron prompt with full pipeline instructions (daily 9am MST = 16:00 UTC)
- [ ] Activate AGENT cron and verify first run

## Owner Admin Console — June 2026
- [ ] Build /admin route with full owner dashboard (admin-only, redirects non-owners)
- [ ] Admin Overview: total users, subscribers by tier, total revenue, videos, pipeline job history
- [ ] Admin Users table: list all users, role, subscription tier, join date, last active, promote/demote admin
- [ ] Admin Content table: all videos, featured toggle, delete, edit title/description
- [ ] Admin Pipeline Monitor: daily job runs, HeyGen video IDs, YouTube upload status, errors
- [ ] Admin Revenue: Stripe payment history, subscription MRR, tier breakdown
- [ ] Admin SMS/Twilio: campaign status, opt-in count, message logs
- [ ] Admin Quick Actions: trigger pipeline manually, send broadcast SMS, notify owner
- [ ] Add /admin link to navbar (visible only to owner/admin role)
- [ ] Owner-only tRPC procedures: adminStats, adminUsers, adminVideos, adminPipeline, adminRevenue
- [ ] Role guard middleware: redirect non-admins away from /admin
