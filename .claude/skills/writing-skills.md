---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

Writing skills IS Test-Driven Development applied to process documentation.

Core principle: If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## TDD Mapping for Skills
| TDD Concept | Skill Creation |
|-------------|----------------|
| Test case | Pressure scenario with subagent |
| Production code | Skill document (SKILL.md) |
| Test fails (RED) | Agent violates rule without skill |
| Test passes (GREEN) | Agent complies with skill present |
| Refactor | Close loopholes while maintaining compliance |

## The Iron Law
NO SKILL WITHOUT A FAILING TEST FIRST

## RED-GREEN-REFACTOR for Skills
- RED: Run pressure scenario WITHOUT the skill — document exact rationalizations used
- GREEN: Write minimal skill addressing those specific violations — verify agents now comply
- REFACTOR: Find new rationalizations → add explicit counters → re-test until bulletproof

## SKILL.md Structure
Frontmatter: name (letters/numbers/hyphens only) + description ("Use when..." triggering conditions only — NEVER summarize the skill's workflow in the description)

## Claude Search Optimization (CSO)
- Description = When to Use, NOT What the Skill Does
- Rich keyword coverage (error messages, symptoms, tools)
- Token efficiency: getting-started skills <150 words, frequent skills <200 words
- Cross-reference with skill name only (no @ force-loads)
- Flowcharts ONLY for non-obvious decision points

## Skill Types and Testing
- Discipline-Enforcing: test with pressure scenarios (time + sunk cost + exhaustion)
- Technique: test with application scenarios
- Pattern: test with recognition + counter-examples
- Reference: test with retrieval + application scenarios

## Bulletproofing Against Rationalization
- Close every loophole explicitly
- Add "Violating the letter is violating the spirit" principle
- Build rationalization table from baseline testing
- Create red flags list for self-checking
