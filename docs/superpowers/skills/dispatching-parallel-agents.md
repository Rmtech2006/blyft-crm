---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

Delegate tasks to specialized agents with isolated context. Dispatch one agent per independent problem domain. Let them work concurrently.

## When to Use
- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

## The Pattern
1. Identify Independent Domains
2. Create Focused Agent Tasks (specific scope, clear goal, constraints, expected output)
3. Dispatch in Parallel
4. Review and Integrate

## Agent Prompt Structure
Good prompts are: Focused, Self-contained, Specific about output.

## Common Mistakes
- Too broad scope
- No context
- No constraints
- Vague output expectations

## When NOT to Use
- Related failures (fix one might fix others)
- Need full context
- Exploratory debugging
- Shared state (agents would interfere)
