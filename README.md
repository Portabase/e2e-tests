# Portabase e2e-tests

End-to-end tests for the entire ecosystem: Portabase, agent, and CLI.

Technologies:
- Playwright 1.63.0
- Node (TypeScript) with pnpm
- Docker Compose

## Running locally

Requirements:
- Node.js with pnpm
- Docker and Docker Compose
- [just](https://github.com/casey/just) command runner

Setup:
1. Install dependencies: `pnpm install`
2. Install Playwright browsers: `pnpm playwright install`
3. Copy `.env.example` to `.env` and fill in the required values (used for OIDC configuration)

Running the suite, via `just` recipes (see `justfile`):
- `just e2e-auto`: spins up the Docker stack (database, OIDC providers, server), seeds auth data, runs the full Playwright suite headlessly, then tears the stack down
- `just e2e-onboarding-manual` or `just e2e-dashboard-manual`: same setup as above, but opens the Playwright UI (`--ui`) instead of running headlessly, so you can pick and debug individual tests

Both recipes call `e2e-before` to start the stack and seed data, and `e2e-after` to tear it down afterwards. If a run fails, `e2e-clean` is still triggered to avoid leaving containers running.

## CI usage

This repo exposes `.github/workflows/run-e2e.yml` as a reusable workflow for running the shared E2E suite.

Inputs:
- `server_image` (optional): full image reference for the Portabase Server under test
- `agent_image` (optional): full image reference for the Portabase Agent under test

Defaults:
- If `server_image` is omitted, Compose falls back to `portabase/portabase:latest`
- If `agent_image` is omitted, Compose falls back to `portabase/agent:latest`

## What is tested?

- Initial setup and seed-dependent bootstrap flows
- Credential-based authentication: register, login, logout
- OIDC authentication flows
- Access management flows
- Agent flows
- Project flows
- Notification integrations
- Storage integrations
