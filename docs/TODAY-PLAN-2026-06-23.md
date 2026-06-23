# Today Plan: Stripe, Promo-Code Test Path, and PDF Artifacts

## Purpose

This is the working checklist for June 23, 2026. It turns the planning email into a repo-tracked action list so the next session can pick up without guessing.

## Main Goals

1. Finish the Stripe test setup correctly.
2. Define the safest promo-code path for a no-card production checkout test.
3. Clarify the PDF artifact work that is still owed.

## Why This Order

Stripe comes first because it affects:

- account ownership and compliance
- product and price IDs
- future checkout code
- webhook setup
- production-test strategy

If Stripe is messy, every downstream checkout task becomes messier too.

## 1. Stripe Account Setup And Ownership Check

### What To Do

- Sign in to Stripe in the browser.
- Confirm this is the separate ResaleLane Stripe account.
- Stay in test mode.
- Confirm the adult or guardian ownership requirement is understood and correctly handled.

### Important Adult-Ownership Note

Stripe's current guidance says:

- a person must be at least 13 to create a Stripe account
- if the person is under 18, a legal guardian or another adult must be tied to the account in the owner or representative role

Why this matters:

- Stripe uses this information for identity, compliance, payouts, and legal responsibility.
- This is not just a dashboard preference. It affects whether the account setup is valid for real use.
- The safest interpretation is that ResaleLane should be treated as an adult-controlled Stripe setup even if Collin is the day-to-day builder.

### What Success Looks Like

- the correct ResaleLane Stripe account is identified
- test mode is clearly on
- the adult or guardian ownership requirement is understood and handled correctly
- no other project's Stripe account is being reused

## 2. Create The 5 Test-Mode Products And Prices

### What To Do

Create these exact one-time products and prices in Stripe test mode:

- Shoe Vendor - `shoe-vendor` - $7
- Clothes Vendor - `clothes-vendor` - $7
- AirPods / Headphones Vendor - `airpods-headphones-vendor` - $7
- Cologne Vendor - `cologne-vendor` - $7
- All Vendor Bundle - `all-vendor-bundle` - $12

Use metadata:

- `project=resalelane`
- `product_id=<internal product id>`
- `environment=test`

### What Success Looks Like

- all five products exist in Stripe test mode
- all five one-time prices exist in Stripe test mode
- names and amounts exactly match the repo
- Price IDs are saved privately and not pasted into GitHub, screenshots, or frontend code

## 3. Promo-Code Path For Production Checkout Testing

### Goal

Create a way to test a production checkout flow without entering card details.

### Recommended Path

Use a 100 percent off Stripe discount and promotion code so Checkout can complete as a no-cost order.

### Why This Is Useful

- it tests the real hosted Stripe Checkout experience
- it avoids unnecessary card-entry friction during controlled testing
- it gives a safer bridge between "checkout is wired" and "real customers are paying"

### Guardrails

- keep the code temporary and controlled
- do not expose the code publicly
- do not treat this as a launch discount
- document exactly when it should be enabled and disabled

### What Success Looks Like

- the team confirms Stripe supports the no-cost order path needed
- one clear promo-code strategy is chosen
- the code is not publicly exposed
- there is a plan for how the production test will be run and retired

## 4. PDF Artifact Clarification

### What To Do

- confirm which PDFs are actually ready to be produced now
- confirm which source fields are still missing from the private vendor document
- confirm whether PDFs are optional delivery add-ons or part of the primary delivery plan
- confirm where final branded PDFs will live privately

### Current Constraint

Ticket `#29` depends on verified source information in ticket `#24`, so the PDF work should not pretend to be unblocked if the private vendor data is still incomplete.

### What Success Looks Like

- the team knows which PDFs can be created now
- the team knows what private source data is still missing
- the team knows whether PDF work should happen before or after checkout wiring
- no one guesses or invents any vendor information

## 5. Best End-Of-Day Outcome

Ideal result for today:

- Stripe account situation is clarified
- all five test products and prices exist
- promo-code strategy is chosen
- PDF next steps are clearly documented
- checkout implementation is cleanly unblocked for the next coding pass

## Safest Stop Point

If the Stripe setup is completed cleanly, that is already a successful day. It is better to stop with a clean Stripe catalog than to rush into messy checkout code.

## Safe Follow-Up Data To Report Back

Do not send secrets in chat.

Safe things to report back:

- confirmation that the correct ResaleLane Stripe account is being used
- confirmation that test mode is on
- confirmation that all five products and prices were created
- confirmation that Price IDs were saved privately
- confirmation of whether the next coding step should be Checkout Session setup
