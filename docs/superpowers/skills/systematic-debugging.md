---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

Core principle: ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST

## The Four Phases

### Phase 1: Root Cause Investigation
1. Read Error Messages Carefully
2. Reproduce Consistently
3. Check Recent Changes
4. Gather Evidence in Multi-Component Systems (add diagnostic instrumentation at each layer)
5. Trace Data Flow (backward from error to source)

### Phase 2: Pattern Analysis
1. Find Working Examples
2. Compare Against References
3. Identify Differences
4. Understand Dependencies

### Phase 3: Hypothesis and Testing
1. Form Single Hypothesis
2. Test Minimally (one variable at a time)
3. Verify Before Continuing
4. When You Don't Know — say so, don't pretend

### Phase 4: Implementation
1. Create Failing Test Case
2. Implement Single Fix (root cause, not symptom)
3. Verify Fix
4. If Fix Doesn't Work — return to Phase 1
5. If 3+ Fixes Failed: Question Architecture — discuss with human before attempting more

## Red Flags
- "Quick fix for now"
- "Just try changing X"
- "I don't fully understand but this might work"
- "One more fix attempt" (when already tried 2+)
