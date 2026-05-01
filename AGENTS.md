<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

<!-- superpowers-start -->
## Superpowers Skills

This project uses the [Superpowers](https://github.com/obra/superpowers) methodology. Skills are in `docs/superpowers/skills/`. Before any task, check if a skill applies and follow it.

**Available skills** (read the file before using):
- `brainstorming.md` — REQUIRED before creating features, components, or new functionality
- `systematic-debugging.md` — REQUIRED before proposing any fix
- `test-driven-development.md` — REQUIRED before writing implementation code
- `verification-before-completion.md` — REQUIRED before claiming work is done
- `writing-plans.md` — before multi-step implementation tasks
- `executing-plans.md` — when running a written plan
- `subagent-driven-development.md` — for plan execution with subagents
- `dispatching-parallel-agents.md` — for 2+ independent tasks
- `using-git-worktrees.md` — before isolated feature work
- `requesting-code-review.md` — after major features or before merge
- `receiving-code-review.md` — when handling review feedback
- `finishing-a-development-branch.md` — when implementation is complete
- `writing-skills.md` — when authoring new skills
- `using-superpowers.md` — meta-skill for how to invoke all others

**Priority:** User instructions → Superpowers skills → Default behavior
<!-- superpowers-end -->
