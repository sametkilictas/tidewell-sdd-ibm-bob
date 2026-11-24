#!/usr/bin/env bash
# One-time GitHub setup for the SDD kit, run by a repository admin from the repository root:
#   bash sdd/governance/github/setup.sh            (needs the GitHub CLI, logged in: gh auth login)
# It creates the labels and the "sdd-main" ruleset on the default branch, and tells you which secrets and
# variables to add. It never reads or writes a secret value: you add secrets yourself, in the GitHub UI or with
# `gh secret set` (which prompts for the value, so it never lands in your shell history or a file).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Repository: $repo"

echo "› Labels"
node -e 'for (const l of require(process.argv[1])) console.log([l.name, l.color, l.description].join("\t"))' "$here/labels.json" |
while IFS=$'\t' read -r name color desc; do
  gh label create "$name" --repo "$repo" --color "$color" --description "$desc" --force >/dev/null && echo "  ✔ $name"
done

echo "› Ruleset sdd-main on the default branch"
existing="$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "sdd-main") | .id' || true)"
if [ -n "$existing" ]; then
  gh api -X PUT "repos/$repo/rulesets/$existing" --input "$here/ruleset-main.json" >/dev/null && echo "  ✔ updated (id $existing)"
else
  gh api -X POST "repos/$repo/rulesets" --input "$here/ruleset-main.json" >/dev/null && echo "  ✔ created"
fi

echo "› Workflow permissions: Actions may not approve pull requests"
gh api -X PUT "repos/$repo/actions/permissions/workflow" -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null && echo "  ✔ read-only default token, no PR approvals by Actions"

cat <<EOF

Still to do by hand (values are never handled by this script):
  1. Secrets (Settings → Secrets and variables → Actions, or gh secret set NAME --repo $repo):
       SONAR_TOKEN, SONAR_HOST_URL     external security gate (sdd/docs/SONARQUBE.md)
       BOB_API_KEY                Bob API key for the advisory review and /bob fix (optional)
  2. Variable (optional): BOB_SHELL_INSTALL_URL — pin a Bob Shell package version for CI.
  3. sdd/governance/approvers.json: replace every REPLACE_ME_ login with real GitHub logins, and
     .github/CODEOWNERS: replace @YOUR-ORG/… with your teams. Both changes go through a pull request.
  4. Settings → Actions → General: allow GitHub Actions to create pull requests = off (already the default).
EOF
