# resale-website
## Google Drive drift (ALL agents & tools — read this)

This repo is checked out inside **Google Drive** and synced across multiple machines. Google Drive creates conflict-copies of files (names ending in ` 2`, ` 3`, …) — **including inside `.git/objects` and `.git/refs`** — which corrupt the repository. This has caused real breakage.

**Before starting work, and before committing, clean the drift:**

```
scripts/clean-drive-drift.sh --fix      # remove conflict-copies + verify with git fsck
scripts/clean-drive-drift.sh --check    # report only (exit 1 if any found)
```

- Runs automatically via git hooks (`pre-commit`, `post-merge`, `post-checkout`). If they are not active, run `git config core.hooksPath .githooks`.
- Dependency-free (bash + git) — works for Codex, Claude, Cursor, or a human. Claude also runs it at session start via `.claude/settings.json`.
- **Never commit a file whose name ends in ` 2`/` 3` — it is Drive junk, not a real file.**
