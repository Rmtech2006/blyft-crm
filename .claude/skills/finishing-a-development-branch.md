---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

## The Process
1. Verify Tests — run full test suite; stop if failing
2. Determine Base Branch
3. Present Options:
   1. Merge back to <base-branch> locally
   2. Push and create a Pull Request
   3. Keep the branch as-is
   4. Discard this work
4. Execute Choice (with typed "discard" confirmation for Option 4)
5. Cleanup Worktree (for Options 1, 2, 4)

## Quick Reference Table
| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |
