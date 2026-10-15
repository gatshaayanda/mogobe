# Mogobe Clone and Reset Record

## Source and target
- Foundation source: `gatshaayanda/the-plug`.
- Target repository: `gatshaayanda/mogobe`.
- Mogobe must keep its own Git history and `origin`; never push The Plug history to Mogobe.

## Identity and services
- Brand: Mogobe Butchery, African Mall, Unit 6, Gaborone, Botswana.
- Contact: +267 72 815 632 / +267 78 024 125.
- Public URL comes from `NEXT_PUBLIC_BASE_URL`; do not invent a production domain.
- Use the owner's configured Firebase project `mogobe-939a7`. Never copy source credentials, client data or production records.
- Keep server credentials out of source control. Public Firebase web configuration is not a substitute for server credentials.
- Use Mogobe-scoped service-worker caches, metadata, manifest and notification configuration.

## PWA
- Preserve the native Android `beforeinstallprompt` behavior and call the native prompt from the user's click when available.
- Do not replace native installation with manual-only instructions. Describe iOS/Safari limitations honestly.
- Never broadly cache private checkout, order, account or admin content.

## Customer and order rules
- Customers can browse without signing in; anonymous authentication may be used when submitting an order.
- Starter prices are indicative. Do not invent stock, final packed weight, delivery charges or confirmed collection slots.
- Checkout creates a new/pending request. Only an admin can accept it.
- Product reads are public only for available products; product writes require admin authorization.
- Admin access at `/admin` uses one access-word field like Tripple S. The server validates `ADMIN_PASSWORD`, provisions the dedicated Mogobe admin UID with an owner role through Firebase Admin, and issues a Firebase custom token; the browser never receives the access word as a credential or stores it. Set a strong `ADMIN_PASSWORD` and Mogobe-owned `FIREBASE_ADMIN_KEY` as server-only environment variables.
- Admin product CRUD, availability controls, scheduled specials, order review, community moderation and manual loyalty credits are available at `/admin`. Product image uploads use the staff-authenticated UploadThing endpoint, restricted to images; live upload success also requires Mogobe-owned UploadThing provider credentials/configuration. Never deploy source changes or rules without explicit authorization.

## Before production
Run `npm ci`, `npm run verify:identity`, `npm run typecheck`, `npm run lint` and `npm run build`. Push completed verified work to `main` by default so the owner can QA it; stop doing so only when the owner explicitly says to. Verify real Android install behavior, iOS Safari guidance, Firestore/Storage rules and the full identity scan. Do not deploy or deploy rules without explicit authorization.