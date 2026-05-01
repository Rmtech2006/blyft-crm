---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

Core principle: If you didn't watch the test fail, you don't know if it tests the right thing.

## The Iron Law
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

Write code before the test? Delete it. Start over. No exceptions — delete means delete.

## Red-Green-Refactor Cycle
1. RED — Write one minimal failing test
2. Verify RED — Run it, confirm it fails for the right reason (MANDATORY, never skip)
3. GREEN — Write minimal code to pass
4. Verify GREEN — Run it, confirm it passes (MANDATORY)
5. REFACTOR — Clean up while keeping green
6. Repeat

## Good Tests
- One behavior per test
- Clear descriptive name
- Uses real code (no mocks unless unavoidable)

## Common Rationalizations (all invalid)
- "Too simple to test" — test takes 30 seconds
- "I'll test after" — tests passing immediately prove nothing
- "Tests after achieve same goals" — no, tests-after verify what you built, not what's required
- "Already manually tested" — ad-hoc ≠ systematic
- "Deleting X hours is wasteful" — sunk cost fallacy
- "TDD will slow me down" — debugging is slower

## Red Flags — STOP and Start Over
Code before test, test passes immediately, "just this once", "keep as reference", any rationalization
