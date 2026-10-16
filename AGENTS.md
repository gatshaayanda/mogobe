# Mogobe Butchery — Agent Operating Contract

## Product and authority
- Product owner/final reviewer: user. Technical navigator/implementer: ChatGPT/Codex.
- Work from this repository, actual source, Git history and verified command/tool output. Never invent completed work, tests, commits, pushes or deployment state.
- Target: Mogobe Butchery, African Mall, Unit 6, Gaborone, Botswana. Phones: +267 72 815 632 / +267 78 024 125. Hours supplied: Monday–Saturday, 08:00–18:00.
- The customer app must become the primary destination for catalogue, basket, checkout, order status, customer account, specials, loyalty and community. WhatsApp/social media are acquisition and optional support channels, not required checkout.

## Workflow and safe implementation
- Foundation: `gatshaayanda/the-plug` only, unless the product owner explicitly overrides it. The current repository was cloned from The Plug; never push its identity/history to another repo.
- Inspect status, remotes, branches, source files, relevant factory documents and existing behavior before changing code. Make the smallest controlled changes and preserve working features.
- Do not copy credentials, secrets, customer data, Firestore data, Firebase project settings, or client-specific infrastructure. Mogobe Firebase project is `mogobe-939a7`; use the owner-configured environment and do not invent keys.
- Do not weaken authentication, Firestore/Storage rules, input validation, or access checks to make a feature work.
- The product owner has explicitly authorized pushing completed, verified work to `main` by default so it is available for direct QA. Do not wait for a separate push/merge instruction; the owner will explicitly tell you when to stop pushing to `main`.
- Pushing/merging to `main` is not permission to deploy, mutate live data, deploy Firebase rules/indexes, or incur material costs. The owner handles Vercel deployment unless explicitly requested.
- Use VS Code Git Bash commands, not PowerShell. Never force-push. Verify the target remote before pushing.

## Customer experience
- Mobile-first, legible, warm, distinctive Mogobe identity; use explicit text/background colors and visible focus states. Meet WCAG 2.2 AA contrast.
- Let customers browse without signing in. Use Firebase Anonymous Auth only when needed to submit/save a private order; offer account linking later without losing the guest UID/history.
- Catalogue records and prices are owner-controlled. Starter items/prices are indicative and editable; never invent stock, specials, delivery charges, final packed weights, confirmed order status, or collection slots.
- Weight-based quantities must support fractions of a kilogram. Clearly label calculated totals as estimates when final packed weight/price is unknown.
- Checkout creates an order request in a pending/new state. Never call it accepted/confirmed until an admin explicitly accepts it. Preferred date/time is not a reservation; Mogobe must confirm it.
- Preserve the basket after failed submissions. Never report success until Firestore confirms the write.
- `/admin` uses a single access-word field. The server checks `ADMIN_PASSWORD` and creates a Firebase custom token for a dedicated Mogobe admin UID; only the server may provision its owner role. Keep `ADMIN_PASSWORD` and `FIREBASE_ADMIN_KEY` server-only and set a strong access word. Customers cannot self-assign admin roles.
- Product CRUD, availability controls, scheduled specials, order review, community moderation and manual loyalty credits live in `/admin`. Product images can be uploaded through the staff-authenticated, image-only UploadThing endpoint or supplied by URL. Live uploads require Mogobe's own UploadThing provider credentials and Firebase Admin environment configuration to be present and tested. Use public product reads and admin-only writes; Firebase rules, not UI hiding, enforce this.
- Customer accounts centre on order history, saved customer details and recorded loyalty points. Only award points after collection/delivery, and prevent duplicate credit per order. Redemption terms remain owner-controlled and must not be invented.
- Community contributions are private while pending and only become public after staff moderation. Treat recipes and tips as community content, not verified food-safety advice.
- Product specials are optional, owner-controlled, time-windowed, and only shown at their special price during the configured window; normal prices remain intact.
- WhatsApp is never the required order path. Use it only as an optional support/acquisition channel.

## PWA and identity
- Preserve the foundation's verified native Android `beforeinstallprompt` flow and direct-click behavior. Do not replace it with manual-instructions-only guidance. iOS/Safari limitations must be described honestly.
- One install state machine; no install prompt loops, fake installation, JavaScript alerts, or stacked dialogs. Respect standalone state and user dismissal.
- All customer-facing app name, metadata, manifest, icons, cache prefixes, notification copy and service-worker paths must use Mogobe identity. Do not leave The Plug, BOEMO, Padre Pio or another client's branding/configuration in the finished app.
- Never broadly cache private basket/checkout/order/account/admin content or treat offline writes as confirmed.

## Verification and checkpoint
- Inspect diffs and run identity verification, typecheck, lint, tests and production build when available. Verify catalogue/order rules and PWA behavior; do not claim a check passed unless it actually ran.
- Report branch, remote, commit, changed files, exact checks/results, push status and blockers. A push is not a deployment.
- Unexpected failure: STOP → inspect actual state → identify first failure → fix → verify.
- Current build sequence: customer shopping flow first; admin catalogue CRUD/image upload and admin order review afterward. Do not build the admin phase until the customer flow is checked and stable.

## Responsive storefront checkpoint — 2026-10-16
- Reference inspected: `gatshaayanda/sefalana-shop-collect` on `main`, especially `src/app/shop.css` and its scoped viewport, basket disclosure, safe-area and reduced-motion safeguards. Mogobe remains the source of truth; no Sefalana copy, catalogue, prices, routes or business rules were imported.
- Target inspected: `gatshaayanda/mogobe` on `main`; customer entry is `MogobeStorefront`, basket navigation is `/basket`, basket data is handled by `@/lib/mogobe/catalogue`, and the staff workspace uses `MogobeAdminDashboard`.
- Change: appended scoped responsive rules in `src/app/mogobe.css` for constrained flex/grid children, long labels/prices, images and controls; mobile header/navigation; horizontally scrollable category chips; product-card layout; basket rows; admin inventory actions/forms; visible focus; minimum touch targets; and reduced-motion preferences. Breakpoints cover 1050px, 760px and 420px, including narrow 320–360px behavior. Existing category filtering, catalogue source, basket persistence, quantity choices, checkout semantics, auth and PWA code were not changed.
- Existing customer add-to-basket feedback was confirmed in source inspection: `MogobeStorefront` writes through `writeMogobeCart` and announces the addition using a `role="status"` toast. Basket is a dedicated `/basket` route, so no second basket or new sticky summary was invented.
- Verification: source inspection only. Automated build/typecheck/lint, browser viewport checks at 320/360/390/tablet/desktop, interaction testing, real-device testing, offline testing and deployed production verification were not run in this environment. Do not represent these as passing. No PWA/offline implementation was changed.
- Source checkpoint: responsive CSS commit `a9e76b5ac0148b6063682b468b3395cc2a6cb5b2` on `main`. The source was updated through GitHub's repository API because no local checkout or network-enabled Git shell was available here; consequently there is no local `git status` or local build evidence. The owner handles Vercel deployment.
