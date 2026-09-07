# KerjaHarian Design System

## Product
KerjaHarian is a mobile-first Indonesian daily-work marketplace connecting employers directly with nearby daily workers. The interface must prioritize speed, trust, clarity, and low cognitive load for users who may rely primarily on Android phones.

## Non-negotiable engineering boundary
This document controls presentation and interaction design only. Do not change Supabase schema, authentication, order state transitions, realtime subscriptions, payment behavior, Edge Functions, RLS policies, or business rules as part of a visual redesign.

## Visual direction
- Tone: trustworthy, practical, energetic, local, and professional.
- Avoid: decorative SaaS gradients, excessive glassmorphism, tiny text, ambiguous icons, and dense desktop-first layouts.
- Prefer: high-contrast surfaces, clear hierarchy, generous touch targets, concise Indonesian copy, obvious status indicators, and progressive disclosure.

## Color semantics
- Primary: deep blue / indigo family for navigation and primary actions.
- Success: green for confirmed/completed states.
- Warning: amber for pending/action-required states.
- Danger: red for destructive actions and failed states.
- Neutral: slate/gray surfaces for supporting information.
- Semantic colors must communicate state; never rely on color alone.

## Typography
- Use a modern sans-serif system stack.
- Body text should remain comfortably readable on Android screens.
- Primary headings: bold/extrabold with short, action-oriented wording.
- Supporting text: muted but still meeting accessible contrast.

## Components
Use consistent primitives for:
- Header/navigation
- Job cards
- Category/filter chips
- Primary/secondary/destructive buttons
- Form fields and validation
- Order status badges
- Worker/employer profile summaries
- Chat messages
- Live-map controls
- KYC/security notices
- Admin tables/cards
- Modal/dialog/confirmation states
- Toast/inline feedback
- Loading, empty, error, and offline states

## Interaction rules
- Minimum practical touch target: 44px.
- Destructive actions require an explicit confirmation when data/state can be affected.
- Loading states must prevent duplicate submissions.
- Every async action needs success and failure feedback.
- Never hide an order state transition behind a purely visual animation.
- Preserve existing navigation paths and deep links.

## Responsive behavior
Mobile is the primary surface. Desktop may expand content width and use multi-column layouts, but mobile information hierarchy must remain intact.

## Existing functional surfaces
The current React application includes landing, employer, worker, authentication, admin, KYC, order timer, dispatch, live map, and chat surfaces. Design work must preserve their existing functional contracts.

## Data and backend boundary
Frontend components may consume existing typed Supabase data, but design work must not introduce new tables, columns, policies, authentication flows, or order mutations unless explicitly requested as a separate backend task.

## Accessibility
- Keyboard navigation where applicable.
- Visible focus states.
- Labels for icon-only actions.
- Sufficient contrast.
- Status conveyed by text/icon in addition to color.
- Respect reduced-motion preferences.
