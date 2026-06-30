# Vendor Artifact Generation SOP and Prompt

This document is the source of truth for generating branded ResaleLane customer-delivery PDF artifacts. Update this file in the code repository whenever the artifact design, filenames, validation rules, source workflow, or prompt changes.

## Purpose

Generate official ResaleLane PDF fulfillment artifacts for purchased vendor resources. The PDFs must look like an extension of `shopresalelane.com`, use the tracked ResaleLane brand system, and keep all private supplier information out of public code, public docs, public screenshots, public deployments, and issue comments. Customer artifact files themselves belong in the private `collinbediner/Resale-Planning` repository and should be committed there.

## Current Scope

Collin approved the Shoe Vendor visual/template direction. Generate and maintain the full five-artifact set:

- `resalelane-shoe-vendor.pdf`
- `resalelane-airpods-headphones-vendor.pdf`
- `resalelane-cologne-vendor.pdf`
- `resalelane-clothes-vendor.pdf`
- `resalelane-all-vendor-bundle.pdf`

The bundle PDF should be five pages: a styled bundle title page followed by one dedicated vendor page for Shoe Vendor, AirPods / Headphones Vendor, Cologne Vendor, and Clothes Vendor.

Do not add `v1`, dates, hashes, supplier names, customer emails, or order IDs to customer-facing PDF filenames. Internal private object keys may still be versioned by the fulfillment system.

## Required Read Order

Before creating or changing artifacts, read:

1. The current planning ticket in `collinbediner/Resale-Planning`.
2. All comments on that planning ticket.
3. This SOP and prompt.
4. The private vendor source Google Doc linked from the planning ticket.
5. The storefront implementation in this repository.
6. The tracked ResaleLane design system and brand assets.
7. The fulfillment artifact security documentation.

Use the private Google Doc linked from the planning ticket as the only source for vendor-specific information. Do not use external research, prior knowledge, assumptions, or invented information to fill gaps.

If the private Google Doc cannot be accessed, stop and report the access problem. Do not create a partial artifact, use placeholder values, or guess vendor details.

## Repository Boundaries

Public code repo:

- This SOP and public-safe generation instructions may live here.
- Generic template patterns may live here only if they contain no supplier/customer data.
- Public-safe instructions for generating private post-purchase preview media may live here.
- No generated customer PDFs, private vendor JSON, extracted PDF text, rendered validation screenshots, supplier contacts, customer details, or fulfillment secrets belong here.
- No contact-visible preview PNGs belong here either.

Private planning repo:

- Store and commit private structured vendor data.
- Store and commit generated PDFs.
- Store and commit generated preview PNGs derived from those PDFs.
- Store and commit rendered validation images.
- Store and commit validation text extracts and reports that might contain vendor details.
- Treat `collinbediner/Resale-Planning` as the source-of-truth repository for customer artifact outputs and editable generation sources.

Current private local path shape:

```text
planning-docs/customer-delivery-artifacts/vendor-resources/
```

Use purpose-driven folder names. `vendor-resources/` owns the editable source, structured data, generated individual PDFs, generated bundle PDF, and validation outputs.

Use `preview-assets/` under that private workspace for derivative PNG media generated from the approved PDFs.

## Brand Source Of Truth

Use the tracked ResaleLane design system and storefront. Do not invent a new PDF design language.

Required references:

- `Design System/design_handoff_resalelane/README.md`
- `Design System/design_handoff_resalelane/tokens/tokens.json`
- `Design System/design_handoff_resalelane/tokens/tokens.css`
- `Design System/design_handoff_resalelane/ResaleLane Style Guide.dc.html`
- `Design System/design_handoff_resalelane/ResaleLane Logo Set.dc.html`
- `Design System/design_handoff_resalelane/assets/`
- `site/styles.css`

Use approved ResaleLane assets only. For dark PDF backgrounds, use the approved dark-background wordmark asset:

```text
Design System/design_handoff_resalelane/assets/logo-wordmark-dark.svg
```

Do not redraw, approximate, recolor, crop, stretch, or replace the logo.

## Individual Vendor PDF Requirements

Each individual vendor PDF must:

- Be exactly one page.
- Use US Letter portrait orientation.
- Fit inside safe print margins.
- Contain selectable and copyable text.
- Be readable on mobile.
- Print cleanly.
- Use approved ResaleLane logo assets.
- Use tracked ResaleLane colors, type, borders, radii, spacing, and panel treatments.
- Keep the vendor contact card as the most visually prominent section.
- Include no placeholder content or lorem ipsum.
- Include no decorative cover page, checklist page, empty page, or filler.

Required page structure:

1. Brand header with approved ResaleLane logo, product title, subtitle `Private Vendor Contact Resource`, and current resource label.
2. Introduction sentence.
3. Vendor contact card.
4. Recommended First Message.
5. Before Ordering.
6. Disclaimer.
7. Footer with `shopresalelane.com`, support email, and support limitation statement.

Use these exact contact labels:

- Company Name
- Contact Name
- Phone / WhatsApp
- Best Contact Method
- Ordering Notes

Do not include a vendor `Email` field in the PDF. These vendors communicate through WhatsApp, so the field creates noise when it only says `Not available`.

When a value is missing or the source says it is unavailable, display exactly:

```text
Not available
```

Do not add a `Useful Links` field.

## Required Copy

Introduction:

```text
Use the verified contact information below to request the vendor’s current catalog, pricing, ordering requirements, payment methods, and shipping options.
```

Recommended First Message:

```text
Hello, I received your contact information through a sourcing resource. Could you please send me your current catalog, pricing, minimum order requirements, payment methods, and shipping options to the United States? Thank you.
```

Before Ordering:

```text
Confirm the current catalog, pricing, minimum order quantity, payment method, shipping cost, delivery estimate, and product details directly with the vendor before sending payment. Keep records of your messages and transactions.
```

Disclaimer:

```text
Informational sourcing resource only. Verify all supplier details independently before purchasing. ResaleLane is not affiliated with, endorsed by, sponsored by, or connected to any third-party brand, marketplace, manufacturer, vendor, or supplier. Pricing, inventory, product details, quality, authenticity, shipping, and availability may change and are controlled by the third party.
```

Footer:

```text
shopresalelane.com

Support: collin.bediner+support@gmail.com

ResaleLane support can assist with order delivery or document-access issues but cannot resolve transactions or disputes with third-party vendors.
```

## Content Restrictions

Do not:

- Guess a missing company name.
- Guess a missing contact name.
- Invent an email, phone number, website, social account, or supplier link.
- Add supplier websites not present in the private source.
- Add fake reviews or fake statistics.
- Claim a vendor is approved, authorized, guaranteed, verified by ResaleLane, or endorsed.
- Guarantee pricing, inventory, product quality, authenticity, shipping, resale results, or profit.
- Use the terms `1:1`, `replica`, `fake`, `bypass`, or `guaranteed profit`.
- Add a `Useful Links` field.
- Put private vendor data into public code, public docs, GitHub Pages, public screenshots, public deployment output, issue comments, or commit messages.

## Recommended Implementation

Use:

- Semantic HTML as the editable source.
- Print-focused CSS.
- Approved local ResaleLane assets.
- Private structured JSON for vendor-specific data.
- A deterministic PDF generation script.
- Programmatic validation plus rendered visual inspection.

Avoid adding a large framework just for artifact generation. A browser-rendered HTML-to-PDF workflow is acceptable when it preserves selectable text and clickable links.

## Validation Checklist

Programmatic validation must confirm:

- Filename matches the approved unversioned filename.
- PDF exists.
- Page count is exactly one for each individual vendor PDF.
- Page size is US Letter portrait.
- Text is selectable and extractable.
- Required title, subtitle, contact labels, first-message heading, before-ordering heading, disclaimer, website, and support email are present.
- No `Useful Links` field is present.
- No placeholder text or lorem ipsum is present.
- No prohibited claims or prohibited terms are present.
- Vendor-specific values match the private source exactly.
- Missing values display exactly `Not available`.
- Visible phone number includes the full international country code.
- WhatsApp link target matches the visible phone number digits.

Visual validation must include rendered PDF inspection for:

- One-page fit.
- Safe print margins.
- No clipping, overflow, or overlap.
- Readable body, footer, and disclaimer text.
- Correct logo asset and treatment.
- Contact card visual emphasis.
- ResaleLane storefront consistency.
- Mobile readability.

## Private Preview Asset Requirements

After the PDFs are approved or regenerated, also create private derivative preview media from page 1 of each approved PDF.

These assets are allowed only in private or post-purchase contexts such as:

- Fulfillment emails
- Authorized resend/support tools
- Internal operations previews
- Authenticated delivery views

These assets are not allowed in:

- Public storefront product cards
- Public OG/Twitter/social previews
- Public screenshots
- Public GitHub repositories
- Public marketing pages

Required asset variants per product PDF and per bundle PDF:

- `<slug>-thumbnail.png`
- `<slug>-receipt-preview.png`
- `<slug>-delivery-preview.png`

Generation rules:

- Use the approved PDF as the source, not a recreated card or new mockup.
- Render page 1 only.
- Keep the full page visible as a faithful miniature.
- Do not crop away contact details for post-purchase variants.
- Use stable filenames with no version suffix in the visible asset name.
- Keep output in the private planning repo only.

Validation rules:

- Confirm the source PDF exists before rendering.
- Confirm all three PNGs are generated for each selected slug.
- Confirm image dimensions match the approved variant sizes.
- Confirm the manifest records the source PDF and generated PNG filenames.

## Standard Next-Codex Prompt

Use this prompt when handing the task to another Codex machine:

```text
You are working on ResaleLane vendor artifact generation.

First, read:
1. GitHub issue #29 in collinbediner/Resale-Planning, including all comments.
2. website/docs/VENDOR-ARTIFACT-GENERATION-SOP-AND-PROMPT.md in the Resale code repo.
3. website/docs/ARTIFACT-SECURITY.md.
4. The tracked ResaleLane design system and storefront implementation.
5. The private vendor source Google Doc linked from the planning ticket.

Use the private Google Doc as the only source for vendor-specific data. If the Google Doc is inaccessible, stop and report the access problem. Do not guess or use external research.

Keep generated PDFs, private JSON, extracted text, and validation images in the private `collinbediner/Resale-Planning` repository and commit them there. Do not put them in the public code repo.
Keep any contact-visible preview PNGs in that same private repository only.

The Shoe Vendor visual/template direction has been approved. Generate the full five-artifact set:
- resalelane-shoe-vendor.pdf
- resalelane-airpods-headphones-vendor.pdf
- resalelane-cologne-vendor.pdf
- resalelane-clothes-vendor.pdf
- resalelane-all-vendor-bundle.pdf

The bundle PDF should be five pages: a styled title page plus one dedicated page per vendor.

Do not include v1, dates, hashes, supplier names, customer emails, or order IDs in customer-facing PDF filenames.

Use the approved ResaleLane dark storefront design system, especially:
- tokens/tokens.json
- tokens/tokens.css
- site/styles.css
- Design System/design_handoff_resalelane/assets/logo-wordmark-dark.svg

Create or update:
- editable semantic HTML template
- print-focused CSS
- repeatable generation script
- repeatable preview-asset generation script
- private structured data file, if needed
- README
- validation report
- unit/QA tests

Validate one-page US Letter output, selectable text, required copy, source-value parity, prohibited terms, WhatsApp link correctness, and rendered visual fit before returning.
Also generate and validate the private preview PNGs derived from page 1 of each approved PDF.

If you change the artifact design, filenames, validation rules, or prompt, update website/docs/VENDOR-ARTIFACT-GENERATION-SOP-AND-PROMPT.md in the code repo in the same pass.
```

## Change-Control Rule

Any change to vendor artifact design, filenames, page structure, validation expectations, generation commands, brand asset usage, or handoff prompt must update this SOP in the same pull request or work pass.
