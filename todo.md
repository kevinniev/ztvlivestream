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
- [ ] Configure Facebook OAuth redirect URIs once Facebook App credentials are added

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
