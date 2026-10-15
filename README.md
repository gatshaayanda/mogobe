# Mogobe Butchery

Mobile-first butchery shopping for Mogobe Butchery, African Mall, Unit 6, Gaborone, Botswana.

Customers can browse meat cuts, choose weight-based quantities, build a basket and submit an order request for collection or delivery. Each request remains pending until Mogobe confirms product availability, actual packed weight, final price and timing.

## Local development

Use VS Code Git Bash, install the locked dependencies with `npm ci`, then run `npm run dev`. Set the public URL and Firebase web configuration using the environment variable names in `.env.example`; do not commit local secrets.

## Project sequence

1. Customer shopping and checkout.
2. Admin product CRUD with image upload and order review.
3. Customer accounts, loyalty/specials and moderated meat/recipe community.

Read `AGENTS.md` and `CLONING.md` before implementation.