# OpenDesign Integration

## Purpose
OpenDesign is used as a development/design-agent layer for KerjaHarian. It must not become a production dependency of the web application.

## Architecture

```text
OpenDesign / coding agent
        |
        v
DESIGN.md + existing React source
        |
        v
KerjaHarian frontend
        |
        +--> Cloudflare Pages/Workers (production frontend/edge)
        |
        +--> Supabase (existing auth, database, realtime, Edge Functions)
```

## Safe integration rules

1. Work from the `feat/opendesign-integration` branch until visual changes are verified.
2. Treat `DESIGN.md` as the project design contract.
3. Do not modify `supabase/migrations`, RLS, Edge Functions, auth code, order mutations, payment code, or realtime logic during design-only work.
4. Prefer changing React components and CSS/Tailwind classes while preserving props, hooks, data queries, and event handlers.
5. If a component needs a functional change, separate it into a distinct implementation task and test it independently.
6. Never put OpenDesign runtime code, model credentials, or API keys into the production browser bundle.
7. Production deployment remains Cloudflare-based; OpenDesign is not deployed as part of the KerjaHarian public site.

## First implementation target

Use OpenDesign to audit and refine these surfaces in order:

1. `src/components/Landing.tsx`
2. `src/components/Header.tsx`
3. `src/components/Worker.tsx`
4. `src/components/Employer.tsx`
5. `src/components/AdminDashboard.tsx`
6. `src/components/AuthModal.tsx`

For each surface, preserve existing data access and callbacks. The first pass is visual/interaction consistency only.

## Local OpenDesign setup

OpenDesign currently supports a local desktop workflow and coding-agent workflow. For source setup, use Node 24 and the repository's pinned pnpm version. A project can then be opened with the KerjaHarian repository as the working directory and `DESIGN.md` as the design contract.

Recommended workflow:

```text
1. Open KerjaHarian in OpenDesign/coding agent
2. Read DESIGN.md
3. Audit one component
4. Generate/refine UI artifact
5. Port only the approved presentation changes into the existing component
6. Run lint/typecheck/build
7. Verify existing Supabase/order flows
8. Review diff before merging
```

## Rollback
Because this integration is isolated on a feature branch and contains no database migration, reverting the branch removes the design-layer additions without touching production data.
