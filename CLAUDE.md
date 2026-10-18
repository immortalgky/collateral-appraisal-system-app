# CLAUDE.md

Collateral Appraisal System frontend: React 19 + TypeScript + Vite + Tailwind v4 + daisyUI 5 (pnpm).

## Design standard

Read before any UI change (type scale, colours, cards, tables, controls, styling rules):

@DESIGN.md

## Gates

- `npx tsc -b --force` (incremental `tsc -b` is unreliable).
- `npx vitest run`, the full suite: the locale parity test only runs there. Check the `Errors` line, not just passed/failed.
- `npx prettier --write <changed files>` only; never a folder.

## Communication

- Talk to the user in Thai.
- Code, comments, UI-string keys and commit messages in English.
