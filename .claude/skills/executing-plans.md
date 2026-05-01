---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

Load plan, review critically, execute all tasks, report when complete.

## The Process
1. Load and Review Plan — read plan, raise concerns before starting, create TodoWrite
2. Execute Tasks — mark in_progress, follow each step, run verifications, mark completed
3. Complete Development — use finishing-a-development-branch skill

## When to Stop and Ask for Help
- Blocker (missing dependency, test fails, unclear instruction)
- Critical plan gaps
- Unclear instruction
- Repeated verification failure

## Integration
- superpowers:using-git-worktrees — REQUIRED before starting
- superpowers:writing-plans — creates the plan this skill executes
- superpowers:finishing-a-development-branch — complete development after all tasks
