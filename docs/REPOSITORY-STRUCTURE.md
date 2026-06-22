# Repository Structure

## Why This File Exists

Collin wants the repo to stay tidy and predictable. This file explains which files must stay at the root, which folders hold real source material, and which local folders should stay out of Git.

## Root Files That Intentionally Stay At The Top

These are normal root-level project control files and should stay where tools expect them:

- `README.md`: the main project overview
- `package.json`: Node scripts and package metadata
- `wrangler.jsonc`: Cloudflare Worker configuration
- `.gitignore`: rules for files and folders that must stay out of Git

Everything else should live in a logical folder unless GitHub or a build tool specifically requires a root path.

## Main Working Folders

- `.github/`: collaborator guidance and GitHub Actions workflows
- `docs/`: product, architecture, operations, handoff, and repo-structure documentation
- `site/`: public storefront code and public assets
- `worker/`: private Cloudflare Worker API code
- `server/`: shared backend-safe modules
- `scripts/`: build and repository safety scripts
- `test/`: automated tests
- `migrations/`: D1 database migrations
- `Design System/`: public-safe brand and design handoff source

## Local-Only Folders You May See

These may exist on a local machine but are intentionally ignored by Git:

- `dist/`: generated build output
- `node_modules/`: installed packages
- `.wrangler/`: Cloudflare local state
- `.secrets/`: local secret placeholders
- `Supplier Delivery Data - Private/`: private business content that must never be committed

If one of these folders is empty clutter on a local machine, it can be removed locally. Do not commit its contents.

## Naming Rules

- Use descriptive folder names for grouped material.
- Prefer short, plain-English file names.
- Keep generated files out of source folders.
- Keep public-safe material and private material separated by folder and by Git ignore rules.
- If a file looks like general guidance, it probably belongs in `docs/` or `.github/`, not loose at the repo root.
