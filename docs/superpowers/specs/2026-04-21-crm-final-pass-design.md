# CRM Final Pass Design

## Scope

This final pass focuses on the remaining end-stage automation work and the visibility gaps that make previously shipped automation feel missing.

## Direction

Keep the existing zero-cost Convex automation approach. Extend it with project deadline awareness, surface automation status more clearly inside Settings, and make notification rendering understand automation-specific types so alerts look intentional instead of generic.

## Features

- Add due-soon project deadline detection to the shared automation rules and Convex automation backend.
- Add project deadline notifications and include deadline items in `Today's Focus`.
- Improve notification icon/color mapping for automation event types and project update alerts.
- Add a Settings automation surface that explains active rules, cron timing, zero-cost stack, and manual setup guidance.

## Testing

Use source-level tests for UI/API wiring, helper tests for automation rules, then run lint, Convex codegen, and production build before deploy.
