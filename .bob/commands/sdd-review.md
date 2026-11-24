---
description: Advisory spec review of your branch before you push — the same review GitHub runs on the pull request (🔎 SDD PR Reviewer)
argument-hint: "[base branch, default main]"
---
Mode: **🔎 SDD PR Reviewer** (`sdd-pr-reviewer`, read-only); switch if needed. You cannot run commands in
this mode, so ask me to paste `git diff ${1:-main}...HEAD --stat` and `git log ${1:-main}..HEAD --oneline` if
you need them, or review the files I point you to.

Follow `.bob/rules-sdd-pr-reviewer/01-review.md` and `sdd/workflows/prompts/pr-review.md` (the prompt GitHub
uses). Reply with the same structure: verdict, findings table (severity, blocking, `path:line`, requirement),
fix prompts, spec coverage.

This review is advisory and changes nothing. To act on a finding, switch to 🏗️ Spec Builder
(`/sdd-implement F## …`); on GitHub a developer can comment `/bob fix F## …` on the pull request instead.
