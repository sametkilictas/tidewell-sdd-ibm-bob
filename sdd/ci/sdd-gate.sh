#!/bin/sh
# The SDD gate for any other pipeline (TeamCity, Bamboo, Tekton, Bitbucket Pipelines, a cron job…) or a person.
# Exit code: 0 pass · 1 a check failed · 2 the gate could not run. Needs Node 20+ and full git history.
set -e
git fetch --no-tags origin "+refs/heads/${SDD_DEFAULT_BRANCH:-main}:refs/remotes/origin/${SDD_DEFAULT_BRANCH:-main}" 2>/dev/null || true
exec node sdd/scripts/ci.mjs pr "$@"
