---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs — evidence before assertions always
---

# Verification Before Completion

Core principle: Evidence before claims, always.

## The Iron Law
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

## The Gate Function
BEFORE claiming any status:
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim

## Common Failures Table
| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command: 0 failures | Previous run, "should pass" |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Test original symptom | Code changed, assumed fixed |
| Agent completed | VCS diff shows changes | Agent reports "success" |

## Red Flags — STOP
- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Done!", etc.)
- About to commit/push without verification
- Trusting agent success reports
