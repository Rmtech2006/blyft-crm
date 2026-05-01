---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch superpowers:code-reviewer subagent to catch issues before they cascade.

## When to Request Review
Mandatory:
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

## How to Request
1. Get git SHAs (BASE_SHA and HEAD_SHA)
2. Dispatch code-reviewer subagent using template at code-reviewer.md
3. Act on feedback (Critical = fix immediately, Important = fix before proceeding, Minor = note for later)

## Integration with Workflows
- Subagent-Driven Development: review after EACH task
- Executing Plans: review after each batch
- Ad-Hoc Development: review before merge
