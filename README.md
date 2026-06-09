# Portabase e2e-tests

End-to-end tests for the entire ecosystem: Portabase, agent, and CLI.

Technologies:
- Playwright 1.60.0
- Node (TypeScript) with pnpm
- Docker Compose

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