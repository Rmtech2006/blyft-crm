---
name: using-superpowers
description: Use when starting any conversation — establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

# Using Skills

## The Rule
Invoke relevant or requested skills BEFORE any response or action. Even a 1% chance a skill might apply means invoke the skill.

## Instruction Priority
1. User's explicit instructions (CLAUDE.md, AGENTS.md, direct requests) — highest
2. Superpowers skills — override default behavior
3. Default system prompt — lowest

## Skill Priority
1. Process skills first (brainstorming, debugging) — determine HOW to approach
2. Implementation skills second — guide execution

## Skill Types
- Rigid (TDD, debugging): Follow exactly
- Flexible (patterns): Adapt principles to context

## Red Flags (thoughts that mean STOP — you're rationalizing)
- "This is just a simple question"
- "I need more context first"
- "Let me explore the codebase first"
- "This doesn't need a formal skill"
- "I remember this skill" (skills evolve — always invoke fresh)
- "I know what that means" (knowing concept ≠ using the skill)
