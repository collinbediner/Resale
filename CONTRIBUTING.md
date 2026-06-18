# Contributing to ResaleLane

This repository contains everything a collaborator needs to understand, edit, test, and review the public-safe ResaleLane website.

## First-Time Setup on Windows

1. Install Git for Windows and Node.js 22 or newer.
2. Accept Collin's GitHub repository invitation.
3. Open PowerShell.
4. Choose a normal local development folder. Do not place private supplier files inside the repository.
5. Clone the project:

```powershell
git clone https://github.com/collinbediner/Resale.git
cd Resale
```

6. Install the development packages:

```powershell
npm install
```

7. Confirm the project works:

```powershell
npm run check
```

The check should finish without errors and create a temporary ignored `dist/` folder.

## Where Things Live

- `site/`: production website source.
- `site/assets/`: assets actually used by the production website.
- `Design System/design_handoff_resalelane/`: original logos, tokens, product data, and visual design references.
- `docs/PRD.md`: full product requirements.
- `docs/WEBSITE-SPEC.md`: website behavior and page requirements.
- `docs/SOP.md`: team workflow, testing, preview, and release rules.
- `server/`: future backend modules that must not be shipped in the static frontend.
- `test/`: automated safety and behavior tests.

## Safe Collaboration Workflow

Before starting:

```powershell
git switch main
git pull --ff-only
git switch -c feature/short-description
```

Make the change, update the related documentation, and run:

```powershell
npm run check
```

Then commit and push the feature branch:

```powershell
git add .
git commit -m "Describe the change"
git push -u origin HEAD
```

Open a pull request on GitHub. Wait for the automated checks and use the generated preview before merging visual or copy changes.

## Never Commit These

- `.env` files, tokens, passwords, API keys, or credentials.
- `.secrets/` or `.wrangler/`.
- `Supplier Delivery Data - Private/`.
- Buyer, order, payment, or support personal information.
- `node_modules/`, `dist/`, or other generated files.
- `.gdoc`, `.gsheet`, or `.gslides` shortcut files.

If a secret is committed accidentally, tell Collin immediately. Deleting it in a later commit does not remove it from Git history; the secret must also be revoked and replaced.

## Source-of-Truth Rule

Google Drive can be used for drafts and private operations. GitHub is authoritative for approved public-safe requirements, code, brand assets, design references, and team instructions. If a decision exists only in chat or Drive, copy it into the appropriate tracked file before implementing or approving it.
