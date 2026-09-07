# KerjaHarian — Coding Agent Contract

## Mission
You are the coding agent for the KerjaHarian production repository. Work directly from the current repository state and deliver tested, production-safe changes.

## OpenDesign
- OpenDesign is the design/development-agent layer for this repository.
- Read `DESIGN.md` before making UI/UX changes.
- Read `docs/opendesign-integration.md` for the integration boundary.
- Use OpenDesign through its MCP/plugin when it is available in the host environment.
- Do not add OpenDesign runtime code, model credentials, or agent credentials to the browser bundle.

## Production architecture
- Frontend/edge: Cloudflare Pages/Workers.
- Backend: Supabase Auth, PostgreSQL, Realtime, Edge Functions and storage.
- Vercel is not part of production.

## Safety boundaries
Unless the task explicitly requires it, do not change:
- Supabase schema or migrations
- RLS policies
- authentication/session behavior
- Edge Functions
- order state transitions
- payment behavior
- realtime behavior

When a functional change is explicitly requested, isolate it, test it, and preserve existing business rules.

## Execution standard
1. Inspect the existing implementation before editing.
2. Prefer minimal, production-safe changes.
3. Never claim success without running the relevant tests.
4. Run `npm run lint`, `npm run typecheck`, and `npm run build` after frontend changes.
5. For production-impacting changes, verify the affected workflow and deployment checks.
6. Do not leave loading states permanently stuck; async actions require success/failure feedback.
7. Prevent duplicate submissions while an action is running.
8. Destructive operations require explicit confirmation where appropriate.
9. Preserve mobile-first behavior and a minimum practical touch target of 44px.
10. When an issue is unresolved, continue investigation rather than reporting a false completion.

## KerjaHarian-specific priorities
- Admin must not get trapped in `Memverifikasi sesi Admin...`.
- Admin security/passkey actions must have bounded loading/error states and clear feedback.
- Admin running-order deletion must verify the backend mutation actually removed the target records and refresh the UI state.
- Never introduce WhatsApp/phone OTP into the Admin authentication flow unless explicitly requested.
- Preserve the Rp0 requirement: do not enable Midtrans/payment secrets or paid services without explicit authorization.
