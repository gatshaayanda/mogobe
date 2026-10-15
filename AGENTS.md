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
- No deployment, merge, live-data mutation, production rules deployment or material cost without explicit authorization. The owner handles Vercel deployment unless asked otherwise.
- Use VS Code Git Bash commands, not PowerShell. Never force-push. Verify the target remote before pushing.

## Customer experience
- Mobile-first, legible, warm, distinctive Mogobe identity; use explicit text/background colors and visible focus states. Meet WCAG 2.2 AA contrast.
- Let customers browse without signing in. Use Firebase Anonymous Auth only when needed to submit/save a private order; offer account linking later without losing the guest UID/history.
- Catalogue records and prices are owner-controlled. Starter items/prices are indicative and editable; never invent stock, specials, delivery charges, final packed weights, confirmed order status, or collection slots.
- Weight-based quantities must support fractions of a kilogram. Clearly label calculated totals as estimates when final packed weight/price is unknown.
- Checkout creates an order request in a pending/new state. Never call it accepted/confirmed until an admin explicitly accepts it. Preferred date/time is not a reservation; Mogobe must confirm it.
- Preserve the basket after failed submissions. Never report success until Firestore confirms the write.
- Product image uploads and full product CRUD belong in the later admin phase. Use public product reads and admin-only writes; Firebase rules, not UI hiding, enforce this.
- WhatsApp is never the required order path. Use it only as an optional support/acquisition channel.

## PWA and identity
- Preserve The Plug's verified native Android `beforeinstallprompt` flow and direct-click behavior. Do not replace it with manual-instructions-only guidance. iOS/Safari limitations must be described honestly.
- One install state machine; no install prompt loops, fake installation, JavaScript alerts, or stacked dialogs. Respect standalone state and user dismissal.
- All customer-facing app name, metadata, manifest, icons, cache prefixes, notification copy and service-worker paths must use Mogobe identity. Do not leave The Plug, BOEMO, Padre Pio or another client's branding/configuration in the finished app.
- Never broadly cache private basket/checkout/order/account/admin content or treat offline writes as confirmed.

## Verification and checkpoint
- Inspect diffs and run identity verification, typecheck, lint, tests and production build when available. Verify catalogue/order rules and PWA behavior; do not claim a check passed unless it actually ran.
- Report branch, remote, commit, changed files, exact checks/results, push status and blockers. A push is not a deployment.
- Unexpected failure: STOP → inspect actual state → identify first failure → fix → verify.
- Current build sequence: customer shopping flow first; admin catalogue CRUD/image upload and admin order review afterward. Do not build the admin phase until the customer flow is checked and stable.
