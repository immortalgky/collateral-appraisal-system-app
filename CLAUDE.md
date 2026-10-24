# CLAUDE.md

Collateral Appraisal System frontend: React 19 + TypeScript + Vite + Tailwind v4 + daisyUI 5 (pnpm).

## Design standard

Read before any UI change (type scale, colours, cards, tables, controls, styling rules):

@DESIGN.md

## Gates

- `npx tsc -b --force` (incremental `tsc -b` is unreliable).
- `npx vitest run`, the full suite: the locale parity test only runs there. Check the `Errors` line, not just passed/failed.
- `npx prettier --write <changed files>` only; never a folder.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `immortalgky/collateral-appraisal-system-app`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.

### How we use these skills

The flow and this team's adjustments (when to grill, `/implement` vs `/implement-spec`, the two reviews, models) are written once in the API repo: `docs/agents/workflow.md` in `collateral-appraisal-system-api`. A BE+FE feature runs one spec per repo.

## Communication

- Talk to the user in Thai.
- Code, comments, UI-string keys and commit messages in English.
