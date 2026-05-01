---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

Core principle: Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration

## The Process (per task)
1. Dispatch implementer subagent
2. Handle questions/provide context if asked
3. Implementer implements, tests, commits, self-reviews
4. Dispatch spec reviewer subagent — confirm code matches spec
5. Fix spec gaps if found, re-review
6. Dispatch code quality reviewer subagent
7. Fix quality issues if found, re-review
8. Mark task complete
9. After all tasks: final code review → finishing-a-development-branch

## Model Selection
- Mechanical tasks (1-2 files, clear spec): cheap/fast model
- Integration/judgment tasks: standard model
- Architecture/design/review: most capable model

## Handling Implementer Status
- DONE: proceed to spec review
- DONE_WITH_CONCERNS: read concerns, address if correctness issue
- NEEDS_CONTEXT: provide missing context, re-dispatch
- BLOCKED: assess blocker, escalate appropriately

## Red Flags
- Never skip either review stage
- Never start on main/master without explicit consent
- Never let implementer self-review replace actual review
- Always do spec compliance BEFORE code quality review
