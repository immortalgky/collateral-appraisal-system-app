# CLAUDE.md

Collateral Appraisal System frontend: React 19 + TypeScript + Vite + Tailwind v4 + daisyUI 5 (pnpm).

## Design standard

Read before any UI change (type scale, colours, cards, tables, controls, styling rules):

@DESIGN.md

## Gates

- `npx tsc -b --force` (incremental `tsc -b` is unreliable).
- `npx vitest run`, the full suite: the locale parity test only runs there. Check the `Errors` line, not just passed/failed.
- `npx prettier --write <changed files>` only; never a folder.

## Release branches

Process: `docs/deployment/release-process.md` in the API repo (`collateral-appraisal-system-api`). `main` is the trunk; `release/vX.Y` feeds UAT and PRD; BE and FE use the same release numbers.

1. A fix for UAT/PRD goes to `release/vX.Y` by PR (squash). **In the same task**, cherry-pick it onto a
   branch off `origin/main` with `git cherry-pick -x <sha>` and open a PR to `main`. If a newer
   `release/v*` already exists, port it there too. Report every PR link; the task is not done until
   the ports are open. If the fix does not apply to `main` (or is a release-only revert), add a line
   `No-Port: <reason>` to the release commit message itself; the PR body is dropped by the squash.
   `deploy/Test-ReleasePorts.ps1` (BE repo) checks this: the `release-port-check` Action opens an issue for
   unported fixes, and `Publish.ps1` prints a warning (it still builds) when `vX.Y.Z-rcN` has unported fixes.
   Add `No-Port:` when squash-merging (edit the message); it cannot be added after the merge.
2. Never merge a release branch into `main`, never push to it directly, never create, move or delete
   `v*` tags or `release/*` branches unless the user asks.
3. Before saying a release is ready, run `git cherry -v origin/main origin/release/vX.Y`; any `+` line
   is a fix missing from `main`.

## Merging to `main`

`main` accepts **squash merges only** and requires the branch to be **up to date with `main`** (ruleset,
2026-11-05). Details: `docs/deployment/release-process.md` in the API repo §4.9.

1. Before merging, run `gh pr view <N> --json mergeStateStatus`. `BEHIND` → `gh pr update-branch <N>`,
   wait for CI to pass again, then merge. `DIRTY` → merge `origin/main` into the branch, re-test, push.
2. Merge with `gh pr merge <N> --squash`. Do not pass `--delete-branch` while another PR uses this branch
   as its base; retarget that PR first (`git rebase --onto origin/main <parent> <child>`, `gh pr edit --base main`).
3. One branch per base: never open PRs to both `main` and a `release/*` branch from the same branch.
4. Adding a feature to, or removing one from, a release branch that is already cut follows §4.8 and only
   happens when the user asks.

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
