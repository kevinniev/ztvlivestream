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
