#!/usr/bin/env bash
# Self-test for the terminal path: identity and roles at sign time, the pipeline gate, forged and self-approved
# sign-offs, secrets at commit, and the locked human gates. Runs in a throwaway copy; touches nothing here.
#   bash sdd/tests/terminal/run.sh        (needs git, node 20+, and the `script` command for a terminal)
set -u
SRC="$(cd "$(dirname "$0")/../../.." && pwd)"; T="$(mktemp -d)/repo"; mkdir -p "$T"; cp -R "$SRC/." "$T"; rm -rf "$T/.git"; cd "$T"
pass=0; fail=0
ok() { if eval "$2" >/dev/null 2>&1; then pass=$((pass+1)); echo "  ✔ $1"; else fail=$((fail+1)); echo "  ✖ $1"; fi; }
tty() { if [ "$(uname)" = Darwin ]; then script -q /dev/null bash -c "$1"; else script -qec "$1" /dev/null; fi; }
git init -q -b main; git config user.name "Ali Dev"; git config user.email ali@tidewell.example
node -e '
const fs=require("fs");const p="sdd/governance/approvers.json";const a=JSON.parse(fs.readFileSync(p));
a.approvalChannel="terminal";
a.people={"ali-dev":{name:"Ali Dev",email:"ali@tidewell.example",roles:["developer","architect","business-analyst"]},
"bea-owner":{name:"Bea Owner",email:"bea@tidewell.example",roles:["business-owner"]},"omar-sec":{name:"Omar Sec",email:"omar@tidewell.example",roles:["appsec"]}};
fs.writeFileSync(p,JSON.stringify(a,null,2));'
git add -A; git commit -qm "chore(SDD): spec pack"; git config core.hooksPath sdd/scripts/hooks
git init -q --bare ../origin.git; git remote add origin ../origin.git; git push -q origin main 2>/dev/null; git fetch -q origin
echo "Terminal path self-test"
git switch -qc phase/0
out=$(echo F00 | tty "node sdd/scripts/approve.mjs plan F00" 2>&1); ok "the developer cannot sign a plan" "grep -q 'cannot give this sign-off' <<<\"\$out\""
out=$(echo F00 | tty "node sdd/scripts/approve.mjs plan F00 --as nobody@tidewell.example" 2>&1); ok "an unlisted email cannot sign" "grep -q 'is not listed' <<<\"\$out\""
out=$(echo F00 | node sdd/scripts/approve.mjs plan F00 --as bea@tidewell.example 2>&1); ok "a script cannot sign (no terminal)" "grep -q 'no TTY' <<<\"\$out\""
out=$(echo F00 | tty "node sdd/scripts/approve.mjs plan F00 --as bea@tidewell.example" 2>&1); ok "the business owner signs" "grep -q 'Recorded' <<<\"\$out\""
git -c user.name="Bea Owner" -c user.email=bea@tidewell.example commit -qm "chore(SDD): approve plan F00" -- sdd/state/approvals.json
ok "the pipeline gate passes" "node sdd/scripts/ci.mjs policy specs commits signoffs secrets --base origin/main"
git reset -q --hard origin/main
node -e 'const fs=require("fs");const p="sdd/state/approvals.json";let a={version:1};try{a=JSON.parse(fs.readFileSync(p))}catch{};a.plans={...(a.plans||{}),F00:{by:"Bea Owner",email:"bea@tidewell.example",via:"terminal",at:"2026-01-01T00:00:00Z"}};fs.writeFileSync(p,JSON.stringify(a,null,2))'
git commit -qam "chore(SDD): approve plan F00"
ok "a sign-off forged by the developer fails in the pipeline" "! node sdd/scripts/ci.mjs signoffs --base origin/main"
git reset -q --hard origin/main
mkdir -p docs; echo note > docs/owner-note.md; git add docs; git -c user.name="Bea Owner" -c user.email=bea@tidewell.example commit -qm "docs: owner note"
echo F00 | tty "node sdd/scripts/approve.mjs plan F00 --as bea@tidewell.example" >/dev/null 2>&1
git -c user.name="Bea Owner" -c user.email=bea@tidewell.example commit -qm "chore(SDD): approve plan F00" -- sdd/state/approvals.json
ok "someone who changed the pull request cannot also sign it (four-eyes)" "! node sdd/scripts/ci.mjs signoffs --base origin/main"
git reset -q --hard origin/main
mkdir -p apps/api/src; printf 'export const key = "AKIAIOSFODNN7EXAMPLE";\n' > apps/api/src/aws.ts; git add -A
ok "the commit hook refuses a secret (G10)" "! git commit -qm 'feat(F00): T009 config [FND-004]'"
ok "the pipeline refuses it too, if the hook is skipped" "git commit -q --no-verify -m 'feat(F00): T009 config [FND-004]' && ! node sdd/scripts/ci.mjs secrets --base origin/main"
git reset -q --hard origin/main
node -e 'const fs=require("fs");const p="sdd/governance/policy.json";const a=JSON.parse(fs.readFileSync(p));a.tiers["1"].approve.plan=["developer"];a.tiers["2"].securityReview="optional";fs.writeFileSync(p,JSON.stringify(a,null,2))'
ok "the locked human gates cannot be configured away" "! node sdd/scripts/policy.mjs check"
git checkout -q -- sdd/governance/policy.json
echo; echo "$([ $fail = 0 ] && echo ✔ || echo ✖) $pass passed, $fail failed"; [ $fail = 0 ]
