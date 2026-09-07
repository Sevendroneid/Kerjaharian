# Codex + OpenDesign cloud devbox

## Purpose

KerjaHarian can use a cloud development environment as the host for Codex CLI and OpenDesign, while production remains Cloudflare + Supabase.

## Required host capabilities

- Linux x86_64/arm64 environment with persistent workspace
- Node.js 24.x
- Corepack with the repository-pinned pnpm 10.33.x
- Git
- Codex CLI
- OpenDesign local MCP/daemon
- Playwright-capable browser dependencies for project smoke tests

OpenDesign's official Codex integration is local/stdio MCP. It is not a public remote MCP endpoint. The Codex and OpenDesign processes therefore need to run in the same development environment.

## Bootstrap

The repository's `.devcontainer/devcontainer.json` installs Node 24, project dependencies, Codex CLI, and the OpenDesign Codex MCP registration.

After the environment is created, authenticate Codex with the user's own ChatGPT account on the host and verify:

```bash
codex --version
codex plugin list --json
codex mcp get open-design --json
```

Then open the repository and ask Codex to use OpenDesign. The first real task should be an audit-only task before allowing writes.

## Safety boundary

Do not put OpenAI, GitHub, Supabase service-role, Cloudflare API, or payment secrets in this repository or devcontainer image. Authentication is performed interactively or through the provider's supported secret mechanism on the host.

Production architecture remains:

`Cloudflare -> Supabase`

The devbox is development/test infrastructure only.

## Verification sequence

1. Codex authenticates successfully.
2. OpenDesign MCP is visible to Codex.
3. Codex opens `AGENTS.md` and `DESIGN.md`.
4. Codex can read the KerjaHarian source tree.
5. Run `npm run lint`.
6. Run `npm run typecheck`.
7. Run `npm run build`.
8. Run the project's production smoke tests.
9. Only after the above pass, allow a targeted bug-fix task.
10. Re-run the complete test sequence and review the diff before deployment.
