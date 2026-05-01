---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

Write comprehensive implementation plans assuming the engineer has zero context and questionable taste. Document which files to touch, code, how to test, everything — in bite-sized tasks.

## Plan Document Header (REQUIRED)
Every plan MUST start with:
- Feature name
- Pointer to superpowers:subagent-driven-development or superpowers:executing-plans
- Goal, Architecture, Tech Stack

## File Structure First
Before tasks, map out which files will be created/modified and what each is responsible for. Design units with clear boundaries.

## Task Granularity
Each step is one action (2-5 minutes):
- "Write the failing test"
- "Run it to verify it fails"
- "Implement minimal code"
- "Run tests to verify pass"
- "Commit"

## No Placeholders — Ever
Never write: TBD, TODO, "add appropriate error handling", "similar to Task N", steps without code

## Self-Review After Writing
1. Spec coverage — can you point to a task for every requirement?
2. Placeholder scan — find and fix any red flags
3. Type consistency — do method/type names match across all tasks?

## Execution Handoff
After saving, offer choice:
1. Subagent-Driven (recommended) — fresh subagent per task + two-stage review
2. Inline Execution — using executing-plans skill
