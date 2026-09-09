# Portabase e2e-tests

End-to-end tests for the entire ecosystem: Portabase, agent, and CLI.

Technologies:
- Playwright 1.62.0
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

## Local backup and storage fixtures

`just e2e-before` starts `docker/data-sources` followed by `docker/storage`,
initializes Garage's single-node layout and creates all test buckets/containers.
The storage stack provides Garage (3900), RustFS (3901), Azurite (10000) and fake
GCS (4443). Credentials in these fixtures are local test values. The invalid Azure
and GCS tests use missing containers/buckets because fake GCS does not validate
cloud credentials.

The project tests depend on both agents and storage channels. They build six
projects from the JSON/TOML agent inventories, assign the requested storage at
project level, and retain one backup per source. Portabase requires a saved
schedule to expose retention settings; the tests place that schedule one week
ahead, so only the two explicit `Select all` / `Backup` rounds execute during the
run. They compare backup references, wait 60 seconds, refresh, and assert that the
first reference is Deleted and the second is the only Available backup.

The Docker fixture is an nginx container with a named content volume. Its test
also changes the served page, restores the latest volume backup and checks the
original HTTP content. Agent A mounts the Docker socket for volume operations;
Agent B mounts each SQLite source volume separately.

The full source matrix includes several versions of PostgreSQL, MySQL/MariaDB,
MongoDB and MSSQL. Allow sufficient disk space for all images and database files.

MongoDB 8.0 currently refuses to start on Linux kernels 6.19+ (SERVER-121912).
`MONGODB_8_IMAGE` can select an alternate 8.0 patch image for local compatibility;
the default remains `mongo:8.0`. For example, this test environment was checked
with `MONGODB_8_IMAGE=mongo:8.0.4` where the default image could not start.
