---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans
---

# Using Git Worktrees

Core principle: Systematic directory selection + safety verification = reliable isolation.

## Directory Selection Priority
1. Check if .worktrees/ or worktrees/ exists — use it (.worktrees wins if both)
2. Check CLAUDE.md for preference
3. Ask user (options: .worktrees/ project-local or ~/.config/superpowers/worktrees/<project>/)

## Safety Verification
For project-local directories, MUST verify directory is gitignored:
  git check-ignore -q .worktrees
If NOT ignored: add to .gitignore, commit, then proceed.

## Creation Steps
1. Detect project name from git
2. Create worktree with new branch
3. Run project setup (auto-detect: npm install, cargo build, pip install, etc.)
4. Verify clean baseline (run tests)
5. Report location and status

## Quick Reference
| Situation | Action |
|-----------|--------|
| .worktrees/ exists | Use it (verify ignored) |
| Neither exists | Check CLAUDE.md → Ask user |
| Not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report + ask |
