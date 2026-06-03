# Portabase e2e-tests

End-to-end tests for the entire ecosystem: Portabase, agent, and CLI.

Technologies:
- Playwright

## CI usage

This repo exposes `.github/workflows/run-e2e.yml` as a reusable workflow for running the shared E2E suite.

Inputs:
- `portabase_image` (optional): full image reference for the Portabase Server under test
- `agent_image` (optional): full image reference for the Portabase Agent under test

Defaults:
- If `agent_image` is omitted, Compose falls back to `portabase/agent:latest`

Secrets:
- Shared E2E secrets are owned by `e2e-tests`; callers need access to the org-level secrets used by this repo
- Cross-repo callers also need the org-level `E2E_TESTS_REPO_TOKEN` secret so the reusable workflow can check out the private `e2e-tests` repository content

What is tested?

- Auth (register, login, logout)
- OIDC integration
- Notification integration
- Storage integration
