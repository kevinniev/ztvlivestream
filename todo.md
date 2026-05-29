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
