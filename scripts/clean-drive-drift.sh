#!/usr/bin/env bash
# clean-drive-drift.sh — remove Google Drive conflict-copies (INCLUDING inside
# .git/objects and .git/refs) that accumulate when this repo is synced across
# machines via Google Drive. Google Drive renames colliding copies with a
# " <n>" suffix (e.g. "index 2.ts", ".git/objects/ab/<hash> 2"); git never uses
# spaces in its internal names, so any such name inside .git is junk and, left
# in place, corrupts the repository.
#
# Dependency-free (bash + coreutils + git) so it works for ANY tool/agent —
# Codex, Claude, Cursor, or a human. See AGENTS.md "Google Drive drift".
#
# Usage:
#   scripts/clean-drive-drift.sh            # check: report, exit 1 if any found
#   scripts/clean-drive-drift.sh --check    # same
#   scripts/clean-drive-drift.sh --fix      # remove them, then run git fsck
#   scripts/clean-drive-drift.sh --fix --quiet
set -u
MODE="check"; QUIET=0
for a in "$@"; do
  case "$a" in
    --fix) MODE="fix" ;;
    --check) MODE="check" ;;
    --quiet) QUIET=1 ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 0

# Strip a trailing Drive conflict suffix: " 2" or " (2)" before end-or-extension.
canonical() { printf '%s' "$1" | sed -E 's/ (\([0-9]+\)|[0-9]+)(\.[^.]+)?$/\2/'; }
# Does a basename look like a Drive conflict copy? (" 2", " 3", " (1)", " (2).ext")
is_conflict() { [[ "$1" =~ \ (\([0-9]+\)|[0-9]+)($|\.) ]]; }

found=()
# Inside .git: git never uses spaces, so ANY spaced name is junk (conflict copy
# of an object/ref/index in either " n" or " (n)" style). Stray .DS_Store files
# also land in .git via Drive/macOS and break `git fsck` (badRefName) — drop them.
if [ -d .git ]; then
  while IFS= read -r -d '' f; do found+=("$f"); done \
    < <(find .git \( -name '* *' -o -name '.DS_Store' \) -print0 2>/dev/null)
fi
# Working tree: only treat a conflict-style name as junk when its de-suffixed
# sibling ALSO exists (Drive copies coexist with the original), so real names
# like "chapter 2.md" or "My File.txt" are left alone.
while IFS= read -r -d '' f; do
  b="$(basename "$f")"; is_conflict "$b" || continue
  d="$(dirname "$f")"; c="$(canonical "$b")"
  if [ "$c" != "$b" ] && [ -e "$d/$c" ]; then found+=("$f"); fi
done < <(find . -path ./.git -prune -o -path '*/node_modules' -prune -o \
             -name '* *' -print0 2>/dev/null)

n=${#found[@]}
if [ "$n" -eq 0 ]; then
  [ "$QUIET" -eq 0 ] && echo "clean-drive-drift: no Google Drive conflict-copies found. ✓"
  exit 0
fi

echo "clean-drive-drift: found $n Google Drive conflict-copy path(s):"
for f in "${found[@]}"; do echo "  ${f#./}"; done

if [ "$MODE" != "fix" ]; then
  echo "Run with --fix to remove them (they are safe to delete)."
  exit 1
fi

for f in "${found[@]}"; do rm -rf "$f"; done
echo "clean-drive-drift: removed $n conflict-copy path(s)."

# Verify .git integrity after touching object/ref files. --no-dangling hides the
# harmless dangling-object chatter so only real corruption surfaces.
if git rev-parse --git-dir >/dev/null 2>&1; then
  tmp="$(mktemp)"
  if ! git fsck --full --no-progress --no-dangling >"$tmp" 2>&1; then
    echo "clean-drive-drift: git fsck reported problems — inspect before continuing:"
    cat "$tmp"; rm -f "$tmp"; exit 2
  fi
  if [ "$QUIET" -eq 0 ]; then
    [ -s "$tmp" ] && cat "$tmp"
    echo "clean-drive-drift: git fsck --full passed. ✓"
  fi
  rm -f "$tmp"
fi
exit 0
